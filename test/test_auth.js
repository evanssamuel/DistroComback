const { connectDB, closeDB } = require('../src/db');
const auth = require('../src/auth');
const User = require('../src/models/User');

async function run() {
  console.log('Testing DB & Auth...');
  await connectDB();

  // Mock req and res objects
  let cookies = {};
  const mockReq = {
    cookies: {},
    headers: { 'user-agent': 'TestAgent/1.0' }
  };
  const mockRes = {
    cookie: (name, val, opts) => { cookies[name] = val; mockReq.cookies[name] = val; },
    clearCookie: (name) => { delete cookies[name]; delete mockReq.cookies[name]; }
  };

  // 1. Silent guest account creation
  const session1 = await auth.getOrCreateSession(mockReq, mockRes);
  console.log('Guest created:', session1.user.username, 'isGuest:', session1.user.isGuest);
  if (!session1.user.isGuest) throw new Error('Expected guest user');

  // 2. Claim account
  const claimed = await auth.claimAccount({
    userId: session1.user._id,
    username: 'TestUser1',
    password: 'Password123!',
    email: 'test@example.com',
    ageConfirmed: true
  });
  console.log('Account claimed:', claimed.user.username, 'Recovery Code:', claimed.recoveryCode);
  if (claimed.user.isGuest) throw new Error('User should no longer be guest');

  // 3. Logout
  await auth.logout({ req: mockReq, res: mockRes });
  console.log('Logged out, cookies cleared');

  // 4. Login
  const loginRes = await auth.login({
    username: 'testuser1',
    password: 'Password123!',
    req: mockReq,
    res: mockRes
  });
  console.log('Login successful for:', loginRes.user.username);

  // 5. Account recovery with code
  await auth.logout({ req: mockReq, res: mockRes });
  const recovered = await auth.recoverAccount({
    username: 'TestUser1',
    recoveryCode: claimed.recoveryCode,
    newPassword: 'NewPassword123!',
    req: mockReq,
    res: mockRes
  });
  console.log('Recovered user:', recovered.user.username, 'New Recovery Code:', recovered.newRecoveryCode);

  await closeDB();
  console.log('Auth test passed successfully!');
}

run().catch(err => {
  console.error('Auth test failed:', err);
  process.exit(1);
});
