require('dotenv').config();
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const MongoStore = require('connect-mongo');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');

const { connectDB } = require('./src/db');
const User = require('./src/models/User');
const Profile = require('./src/models/Profile');
const DeviceSession = require('./src/models/DeviceSession');
const Room = require('./src/models/Room');
const Message = require('./src/models/Message');
const Conversation = require('./src/models/Conversation');
const ConversationMember = require('./src/models/ConversationMember');
const Ban = require('./src/models/Ban');
const AuditLog = require('./src/models/AuditLog');
const BlockedCode = require('./src/models/BlockedCode');
const Report = require('./src/models/Report');
const Block = require('./src/models/Block');

const auth = require('./src/auth');
const avatar = require('./src/avatar');
const conversations = require('./src/conversations');
const chips = require('./src/chips');
const safety = require('./src/safety');
const { generateRoomCode } = require('./src/roomCode');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const GENERAL_ROOM_ID = 'general';
const MAX_HISTORY = 50;
const ADMIN_PATH = (process.env.ADMIN_PATH || '/admin-panel').replace(/\/$/, '');
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 12, sameSite: 'lax' }
}));

// In-memory sockets tracking
// roomUsers: roomId -> Map(socketId -> { userId, username, avatarSvg, city })
const roomUsers = new Map();
// socketMeta: socketId -> { userId, username, roomId, conversationId }
const socketMeta = new Map();

function getUserList(roomId) {
  const users = roomUsers.get(roomId);
  return users ? Array.from(users.values()) : [];
}

async function ensureGeneralRoomExists() {
  let existing = await Room.findOne({ roomId: GENERAL_ROOM_ID });
  if (!existing) {
    existing = await Room.create({
      roomId: GENERAL_ROOM_ID,
      name: 'General Starter Room',
      description: 'The main shared room. Say hi to someone new!',
      isGeneral: true
    });
    console.log('[startup] Created the General room');
  }

  // Ensure starter room welcome message exists
  const welcomeMsg = await Message.findOne({ roomId: GENERAL_ROOM_ID, type: 'system' });
  if (!welcomeMsg) {
    await Message.create({
      roomId: GENERAL_ROOM_ID,
      type: 'system',
      text: '📌 Welcome to Mikko Chat! Stranger-friendly public space. Tap "Say Hi" on any avatar or pick a suggestion chip above the composer to break the ice!'
    });
  }

  await conversations.getOrCreateRoomConversation(GENERAL_ROOM_ID);
}

function normalizeRoomId(raw) {
  const cleaned = (raw || GENERAL_ROOM_ID).trim().toUpperCase();
  return cleaned === GENERAL_ROOM_ID.toUpperCase() ? GENERAL_ROOM_ID : cleaned;
}

// Middleware for device session auth
async function requireAuthSession(req, res, next) {
  try {
    const sessionData = await auth.getOrCreateSession(req, res);
    req.authUser = sessionData.user;
    req.authProfile = sessionData.profile;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Auth session error: ' + err.message });
  }
}

// ══════════════════════ REST API — Public & Auth ══════════════════════

app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// Auth endpoints
app.get('/api/auth/session', requireAuthSession, async (req, res) => {
  const avatarSvg = avatar.renderAvatarSvg(req.authProfile.avatarRecipe || {});
  res.json({
    user: {
      id: req.authUser._id,
      username: req.authUser.username,
      displayName: req.authUser.displayName,
      isGuest: req.authUser.isGuest,
      email: req.authUser.email,
      emailVerified: req.authUser.emailVerified
    },
    profile: {
      avatarRecipe: req.authProfile.avatarRecipe,
      avatarSvg,
      bio: req.authProfile.bio,
      city: req.authProfile.city
    }
  });
});

app.post('/api/auth/claim', requireAuthSession, async (req, res) => {
  try {
    const { username, password, email, ageConfirmed } = req.body;
    const result = await auth.claimAccount({
      userId: req.authUser._id,
      username,
      password,
      email,
      ageConfirmed
    });
    res.json({
      ok: true,
      username: result.user.username,
      recoveryCode: result.recoveryCode
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await auth.login({ username, password, req, res });
    const avatarSvg = avatar.renderAvatarSvg(result.profile.avatarRecipe || {});
    res.json({
      ok: true,
      user: {
        id: result.user._id,
        username: result.user.username,
        isGuest: result.user.isGuest
      },
      profile: {
        avatarRecipe: result.profile.avatarRecipe,
        avatarSvg,
        bio: result.profile.bio,
        city: result.profile.city
      }
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  const { allDevices } = req.body || {};
  await auth.logout({ req, res, allDevices });
  res.json({ ok: true });
});

app.post('/api/auth/recover', async (req, res) => {
  try {
    const { username, recoveryCode, newPassword } = req.body;
    const result = await auth.recoverAccount({ username, recoveryCode, newPassword, req, res });
    res.json({ ok: true, username: result.user.username, newRecoveryCode: result.newRecoveryCode });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Profile & Avatar update
app.patch('/api/profile', requireAuthSession, async (req, res) => {
  try {
    const { bio, city, avatarRecipe } = req.body;
    if (typeof bio === 'string') req.authProfile.bio = bio.slice(0, 140);
    if (typeof city === 'string') req.authProfile.city = city.slice(0, 50);
    if (avatarRecipe && typeof avatarRecipe === 'object') {
      req.authProfile.avatarRecipe = avatarRecipe;
    }
    req.authProfile.updatedAt = new Date();
    await req.authProfile.save();

    const avatarSvg = avatar.renderAvatarSvg(req.authProfile.avatarRecipe || {});
    res.json({
      ok: true,
      profile: {
        avatarRecipe: req.authProfile.avatarRecipe,
        avatarSvg,
        bio: req.authProfile.bio,
        city: req.authProfile.city
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Avatar SVG renderer endpoint
app.get('/api/avatar/svg', (req, res) => {
  const recipe = req.query.recipe ? JSON.parse(req.query.recipe) : {};
  const svg = avatar.renderAvatarSvg(recipe);
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(svg);
});

// Rooms
app.get('/api/rooms', async (req, res) => {
  try {
    const city = req.query.city;
    const filter = {};
    if (city) filter.city = city;

    const rooms = await Room.find(filter).sort({ isGeneral: -1, lastActivityAt: -1 }).limit(50);
    const payload = rooms.map((r) => ({
      roomId: r.roomId,
      name: r.name,
      description: r.description,
      image: r.image,
      isGeneral: r.isGeneral,
      locked: r.locked,
      onlineCount: getUserList(r.roomId).length
    }));
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: 'Could not load rooms right now.' });
  }
});

app.post('/api/rooms', requireAuthSession, async (req, res) => {
  try {
    const name = (req.body.name || '').trim().slice(0, 40);
    const description = (req.body.description || '').trim().slice(0, 200);
    const image = req.body.image || '';
    if (!name) return res.status(400).json({ error: 'Room name is required.' });

    let roomId;
    for (let attempt = 0; attempt < 8; attempt++) {
      const candidate = generateRoomCode();
      const [clash, blocked] = await Promise.all([
        Room.findOne({ roomId: candidate }),
        BlockedCode.findOne({ code: candidate })
      ]);
      if (!clash && !blocked) { roomId = candidate; break; }
    }
    if (!roomId) return res.status(500).json({ error: 'Could not generate room code.' });

    const room = await Room.create({ roomId, name, description, image });
    await conversations.getOrCreateRoomConversation(roomId);
    res.status(201).json({ roomId: room.roomId, name: room.name });
  } catch (err) {
    res.status(500).json({ error: 'Could not create room.' });
  }
});

// DMs & Inbox
app.get('/api/inbox', requireAuthSession, async (req, res) => {
  try {
    const items = await conversations.getUserInbox(req.authUser._id);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Could not load inbox.' });
  }
});

app.post('/api/dms/say-hi', requireAuthSession, async (req, res) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) return res.status(400).json({ error: 'targetUserId required.' });

    const conv = await conversations.getOrCreateDmConversation(req.authUser._id, targetUserId);
    res.json({ conversationId: conv._id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/dms/:conversationId/messages', requireAuthSession, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const msgs = await Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .limit(50);

    await conversations.markConversationRead(conversationId, req.authUser._id);

    const formatted = msgs.reverse().map(m => ({
      id: m._id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      username: m.username,
      type: m.type,
      text: m.text,
      mediaUrl: m.mediaUrl,
      createdAt: m.createdAt
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Could not load messages.' });
  }
});

// Suggestion Chips
app.get('/api/chips', (req, res) => {
  const { lastMessageText, isNewChat } = req.query;
  const chipData = chips.getSuggestedChips({
    lastMessageText: lastMessageText || '',
    isNewChat: isNewChat === 'true'
  });
  res.json(chipData);
});

// Blocks & Reports
app.post('/api/safety/block', requireAuthSession, async (req, res) => {
  try {
    const { targetUserId } = req.body;
    await safety.blockUser(req.authUser._id, targetUserId);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/safety/unblock', requireAuthSession, async (req, res) => {
  try {
    const { targetUserId } = req.body;
    await safety.unblockUser(req.authUser._id, targetUserId);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/safety/report', requireAuthSession, async (req, res) => {
  try {
    const { targetType, targetId, reason, note, snapshot } = req.body;
    const report = await safety.createReport({
      reporterId: req.authUser._id,
      targetType,
      targetId,
      reason,
      note,
      snapshot
    });
    res.status(201).json({ ok: true, reportId: report._id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/r/:roomId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ══════════════════════ Admin Panel ══════════════════════

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again in 15 minutes.' }
});

function requireAdminPage(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  res.redirect(`${ADMIN_PATH}/login`);
}

function requireAdminApi(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  res.status(401).json({ error: 'Not authenticated.' });
}

app.get(`${ADMIN_PATH}/login`, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

app.post(`${ADMIN_PATH}/login`, loginLimiter, (req, res) => {
  const submitted = Buffer.from((req.body.password || '').toString());
  const expected = Buffer.from((process.env.ADMIN_PASSWORD || 'admin').toString());
  const match = submitted.length === expected.length && expected.length > 0 &&
    crypto.timingSafeEqual(submitted, expected);

  if (!match) return res.status(401).json({ error: 'Incorrect password.' });
  req.session.isAdmin = true;
  res.json({ ok: true });
});

app.post(`${ADMIN_PATH}/logout`, (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get(ADMIN_PATH, requireAdminPage, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/api/admin/reports', requireAdminApi, async (req, res) => {
  const reports = await Report.find().sort({ createdAt: -1 }).limit(100);
  res.json(reports);
});

// ══════════════════════ Socket.IO Realtime ══════════════════════

io.on('connection', (socket) => {
  socket.on('join_room', async (data) => {
    const roomId = normalizeRoomId(data.roomId);
    const userId = data.userId;
    const username = (data.username || 'Guest').trim();
    const avatarRecipe = data.avatarRecipe || {};

    socket.join(roomId);

    const roomConv = await conversations.getOrCreateRoomConversation(roomId);
    socketMeta.set(socket.id, { userId, username, roomId, conversationId: roomConv._id });

    if (!roomUsers.has(roomId)) roomUsers.set(roomId, new Map());
    const svg = avatar.renderAvatarSvg(avatarRecipe);
    roomUsers.get(roomId).set(socket.id, { userId, username, avatarSvg: svg, city: data.city || '' });

    // History
    const history = await Message.find({ roomId }).sort({ createdAt: -1 }).limit(MAX_HISTORY);
    socket.emit('message_history', history.reverse());

    io.to(roomId).emit('user_list', getUserList(roomId));
  });

  socket.on('send_room_message', async (data) => {
    const meta = socketMeta.get(socket.id);
    if (!meta) return;

    const text = (data.text || '').trim().slice(0, 1000);
    if (!text && !data.mediaUrl && !data.sticker) return;

    const msg = await Message.create({
      conversationId: meta.conversationId,
      roomId: meta.roomId,
      senderId: meta.userId,
      username: meta.username,
      type: data.sticker ? 'sticker' : (data.mediaUrl ? 'image' : 'message'),
      text: data.sticker || text,
      mediaUrl: data.mediaUrl || ''
    });

    await Conversation.updateOne({ _id: meta.conversationId }, {
      lastMessageText: text || 'Media attachment',
      lastMessageAt: new Date()
    });

    io.to(meta.roomId).emit('new_room_message', msg);
  });

  socket.on('send_dm_message', async (data) => {
    const { conversationId, senderId, username, text, mediaUrl, sticker } = data;
    if (!conversationId || !senderId) return;

    const conv = await Conversation.findById(conversationId);
    if (!conv || conv.state === 'blocked') {
      return socket.emit('dm_error', { error: 'Cannot send message in blocked DM.' });
    }

    const msgText = (text || '').trim().slice(0, 1000);
    if (!msgText && !mediaUrl && !sticker) return;

    const msg = await Message.create({
      conversationId,
      senderId,
      username,
      type: sticker ? 'sticker' : (mediaUrl ? 'image' : 'message'),
      text: sticker || msgText,
      mediaUrl: mediaUrl || ''
    });

    conv.lastMessageText = msgText || 'Media attachment';
    conv.lastMessageAt = new Date();
    await conv.save();

    io.emit(`dm_message_${conversationId}`, msg);
  });

  socket.on('disconnect', () => {
    const meta = socketMeta.get(socket.id);
    if (!meta) return;
    socketMeta.delete(socket.id);
    const users = roomUsers.get(meta.roomId);
    if (users) {
      users.delete(socket.id);
      io.to(meta.roomId).emit('user_list', getUserList(meta.roomId));
    }
  });
});

// ── Startup ──
const PORT = process.env.PORT || 5000;

connectDB()
  .then(ensureGeneralRoomExists)
  .then(() => {
    server.listen(PORT, () => {
      console.log('='.repeat(55));
      console.log('   MIKKO SOCIAL CHAT PLATFORM — RUNNING');
      console.log('='.repeat(55));
      console.log(`   Local: http://localhost:${PORT}`);
      console.log(`   Admin: http://localhost:${PORT}${ADMIN_PATH}/login`);
      console.log('='.repeat(55));
    });
  })
  .catch((err) => {
    console.error('[startup] Failed to start:', err.message);
    process.exit(1);
  });

module.exports = app;
