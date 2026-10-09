const { connectDB, closeDB } = require('../src/db');
const User = require('../src/models/User');
const Profile = require('../src/models/Profile');
const Message = require('../src/models/Message');
const conversations = require('../src/conversations');

async function run() {
  console.log('Testing Conversations & DMs...');
  await connectDB();

  const userA = await User.create({ username: 'Alice', usernameCi: 'alice' });
  const userB = await User.create({ username: 'Bob', usernameCi: 'bob' });
  await Profile.create({ userId: userA._id });
  await Profile.create({ userId: userB._id });

  // Create DM
  const dm = await conversations.getOrCreateDmConversation(userA._id, userB._id);
  console.log('DM created with ID:', dm._id);

  // Send message in DM from Bob to Alice
  const msg = await Message.create({
    conversationId: dm._id,
    senderId: userB._id,
    username: userB.username,
    text: 'Hello Alice!'
  });
  dm.lastMessageText = msg.text;
  dm.lastMessageAt = msg.createdAt;
  await dm.save();

  // Check Alice's inbox
  const inboxA = await conversations.getUserInbox(userA._id);
  console.log('Alice Inbox length:', inboxA.length, 'Unread count:', inboxA[0].unreadCount);
  if (inboxA.length !== 1 || inboxA[0].unreadCount !== 1) {
    throw new Error('Inbox unread calculation failed');
  }

  // Mark conversation read
  await conversations.markConversationRead(dm._id, userA._id);
  const inboxA2 = await conversations.getUserInbox(userA._id);
  console.log('Alice Inbox unread count after read:', inboxA2[0].unreadCount);
  if (inboxA2[0].unreadCount !== 0) {
    throw new Error('Unread count should be 0 after marking read');
  }

  await closeDB();
  console.log('Conversation tests passed!');
}

run().catch(err => {
  console.error('Conversation test failed:', err);
  process.exit(1);
});
