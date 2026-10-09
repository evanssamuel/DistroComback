const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Profile = require('./models/Profile');
const DeviceSession = require('./models/DeviceSession');
const RecoveryCode = require('./models/RecoveryCode');

const COOKIE_NAME = 'device_token';
const TWELVE_MONTHS_MS = 365 * 24 * 60 * 60 * 1000;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateRandomToken() {
  return crypto.randomBytes(32).toString('hex');
}

function generateRecoveryCode() {
  // Format: XXXX-XXXX-XXXX
  const bytes = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `${bytes.slice(0, 4)}-${bytes.slice(4, 8)}-${bytes.slice(8, 12)}`;
}

async function getOrCreateSession(req, res) {
  let token = req.cookies ? req.cookies[COOKIE_NAME] : null;
  let session = null;
  let user = null;

  if (token) {
    const tokenHash = hashToken(token);
    session = await DeviceSession.findOne({
      tokenHash,
      expiresAt: { $gt: new Date() },
      revokedAt: { $exists: false }
    });

    if (session) {
      user = await User.findById(session.userId);
      if (user && user.status === 'active') {
        // Renew rolling session expiration
        session.lastUsedAt = new Date();
        session.expiresAt = new Date(Date.now() + TWELVE_MONTHS_MS);
        await session.save();

        user.lastSeenAt = new Date();
        await user.save();
      } else {
        session = null;
        user = null;
      }
    }
  }

  if (!user) {
    // Create silent guest account
    const guestId = crypto.randomBytes(4).toString('hex');
    const username = `guest_${guestId}`;
    user = await User.create({
      username,
      usernameCi: username.toLowerCase(),
      isGuest: true
    });

    await Profile.create({ userId: user._id });

    token = generateRandomToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + TWELVE_MONTHS_MS);

    session = await DeviceSession.create({
      userId: user._id,
      tokenHash,
      deviceLabel: req.headers['user-agent'] || 'Web Browser',
      expiresAt
    });

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: TWELVE_MONTHS_MS
    });
  }

  const profile = await Profile.findOne({ userId: user._id }) || {};

  return { user, profile, session, token };
}

async function claimAccount({ userId, username, password, email, ageConfirmed }) {
  if (!ageConfirmed) {
    throw new Error('You must confirm that you meet the minimum age requirement.');
  }

  const formatErr = User.validateUsernameFormat(username);
  if (formatErr) throw new Error(formatErr);

  const usernameCi = username.trim().toLowerCase();
  const existing = await User.findOne({ usernameCi });
  if (existing && existing._id.toString() !== userId.toString()) {
    throw new Error('This username is already taken.');
  }

  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  const user = await User.findById(userId);
  if (!user) throw new Error('User account not found.');

  const passwordHash = await bcrypt.hash(password, 10);

  user.username = username.trim();
  user.usernameCi = usernameCi;
  user.passwordHash = passwordHash;
  user.isGuest = false;
  if (email && email.trim()) {
    user.email = email.trim();
    user.emailVerified = false; // can send verification in future
  }
  await user.save();

  // Create initial recovery code
  const rawCode = generateRecoveryCode();
  const codeHash = hashToken(rawCode);
  await RecoveryCode.create({ userId: user._id, codeHash });

  return { user, recoveryCode: rawCode };
}

async function login({ username, password, req, res }) {
  if (!username || !password) {
    throw new Error('Username and password are required.');
  }

  const usernameCi = username.trim().toLowerCase();
  const user = await User.findOne({ usernameCi, status: 'active' });
  if (!user || user.isGuest || !user.passwordHash) {
    throw new Error('Invalid username or password.');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new Error('Invalid username or password.');
  }

  const token = generateRandomToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TWELVE_MONTHS_MS);

  const session = await DeviceSession.create({
    userId: user._id,
    tokenHash,
    deviceLabel: req.headers['user-agent'] || 'Web Browser',
    expiresAt
  });

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: TWELVE_MONTHS_MS
  });

  user.lastSeenAt = new Date();
  await user.save();

  const profile = await Profile.findOne({ userId: user._id }) || {};

  return { user, profile, session, token };
}

async function logout({ req, res, allDevices = false }) {
  const token = req.cookies ? req.cookies[COOKIE_NAME] : null;
  if (token) {
    const tokenHash = hashToken(token);
    const session = await DeviceSession.findOne({ tokenHash });
    if (session) {
      if (allDevices) {
        await DeviceSession.updateMany(
          { userId: session.userId, revokedAt: { $exists: false } },
          { revokedAt: new Date() }
        );
      } else {
        session.revokedAt = new Date();
        await session.save();
      }
    }
  }
  res.clearCookie(COOKIE_NAME);
}

async function recoverAccount({ username, recoveryCode, newPassword, req, res }) {
  const usernameCi = (username || '').trim().toLowerCase();
  const user = await User.findOne({ usernameCi, status: 'active' });
  if (!user) throw new Error('Account not found.');

  const codeHash = hashToken((recoveryCode || '').trim().toUpperCase());
  const codeDoc = await RecoveryCode.findOne({ userId: user._id, codeHash, usedAt: { $exists: false } });
  if (!codeDoc) {
    throw new Error('Invalid or already used recovery code.');
  }

  if (!newPassword || newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters.');
  }

  codeDoc.usedAt = new Date();
  await codeDoc.save();

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();

  // Generate new recovery code
  const newRawCode = generateRecoveryCode();
  await RecoveryCode.create({ userId: user._id, codeHash: hashToken(newRawCode) });

  // Log in user on this device
  const token = generateRandomToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TWELVE_MONTHS_MS);

  await DeviceSession.create({
    userId: user._id,
    tokenHash,
    deviceLabel: req.headers['user-agent'] || 'Web Browser',
    expiresAt
  });

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: TWELVE_MONTHS_MS
  });

  const profile = await Profile.findOne({ userId: user._id }) || {};

  return { user, profile, newRecoveryCode: newRawCode };
}

module.exports = {
  COOKIE_NAME,
  getOrCreateSession,
  claimAccount,
  login,
  logout,
  recoverAccount,
  generateRecoveryCode
};
