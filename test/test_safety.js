const { connectDB, closeDB } = require('../src/db');
const User = require('../src/models/User');
const safety = require('../src/safety');

async function run() {
  console.log('Testing Safety (Blocks & Reports)...');
  await connectDB();

  const user1 = await User.create({ username: 'User1', usernameCi: 'user1' });
  const user2 = await User.create({ username: 'User2', usernameCi: 'user2' });

  // 1. Check initially not blocked
  const blockedInitial = await safety.isBlocked(user1._id, user2._id);
  console.log('Initially blocked:', blockedInitial);
  if (blockedInitial) throw new Error('Should not be blocked initially');

  // 2. Block user
  await safety.blockUser(user1._id, user2._id);
  const blockedAfter = await safety.isBlocked(user1._id, user2._id);
  console.log('After block:', blockedAfter);
  if (!blockedAfter) throw new Error('Expected users to be blocked');

  // 3. Unblock user
  await safety.unblockUser(user1._id, user2._id);
  const blockedUnblock = await safety.isBlocked(user1._id, user2._id);
  console.log('After unblock:', blockedUnblock);
  if (blockedUnblock) throw new Error('Expected users to be unblocked');

  // 4. Create report
  const report = await safety.createReport({
    reporterId: user1._id,
    targetType: 'message',
    targetId: 'msg_123',
    reason: 'Inappropriate text',
    note: 'Testing report functionality',
    snapshot: { text: 'Bad words' }
  });
  console.log('Report created with ID:', report._id, 'Status:', report.status);
  if (report.status !== 'open') throw new Error('Expected report status to be open');

  await closeDB();
  console.log('Safety tests passed successfully!');
}

run().catch(err => {
  console.error('Safety test failed:', err);
  process.exit(1);
});
