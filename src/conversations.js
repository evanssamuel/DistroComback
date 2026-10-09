const Conversation = require('./models/Conversation');
const ConversationMember = require('./models/ConversationMember');
const Message = require('./models/Message');
const User = require('./models/User');
const Profile = require('./models/Profile');
const Room = require('./models/Room');
const Block = require('./models/Block');

function makeDmKey(userId1, userId2) {
  const ids = [userId1.toString(), userId2.toString()].sort();
  return ids.join('_');
}

async function getOrCreateDmConversation(userId1, userId2) {
  if (userId1.toString() === userId2.toString()) {
    throw new Error('Cannot start a DM with yourself.');
  }

  // Check if either user blocked the other
  const isBlocked = await Block.findOne({
    $or: [
      { blockerId: userId1, blockedId: userId2 },
      { blockerId: userId2, blockedId: userId1 }
    ]
  });

  const dmKey = makeDmKey(userId1, userId2);
  let conv = await Conversation.findOne({ kind: 'dm', dmKey });

  if (!conv) {
    conv = await Conversation.create({
      kind: 'dm',
      dmKey,
      state: isBlocked ? 'blocked' : 'open'
    });

    await ConversationMember.create({ conversationId: conv._id, userId: userId1 });
    await ConversationMember.create({ conversationId: conv._id, userId: userId2 });
  }

  return conv;
}

async function getOrCreateRoomConversation(roomId) {
  let conv = await Conversation.findOne({ kind: 'room', roomId });
  if (!conv) {
    conv = await Conversation.create({
      kind: 'room',
      roomId,
      state: 'open'
    });
  }
  return conv;
}

async function getUserInbox(userId) {
  // Get all DM members for this user
  const members = await ConversationMember.find({ userId });
  const convIds = members.map(m => m.conversationId);

  const dms = await Conversation.find({ _id: { $in: convIds }, kind: 'dm' })
    .sort({ lastMessageAt: -1 })
    .limit(50);

  const inboxItems = [];

  for (const conv of dms) {
    // Find the other participant in DM
    const otherMember = await ConversationMember.findOne({
      conversationId: conv._id,
      userId: { $ne: userId }
    });

    if (!otherMember) continue;

    const otherUser = await User.findById(otherMember.userId);
    if (!otherUser) continue;

    const otherProfile = await Profile.findOne({ userId: otherUser._id }) || {};
    const myMemberDoc = members.find(m => m.conversationId.toString() === conv._id.toString());

    // Calculate unread count
    const lastReadAt = myMemberDoc ? myMemberDoc.lastReadAt : new Date(0);
    const unreadCount = await Message.countDocuments({
      conversationId: conv._id,
      createdAt: { $gt: lastReadAt },
      senderId: { $ne: userId }
    });

    inboxItems.push({
      conversationId: conv._id,
      kind: 'dm',
      otherUser: {
        id: otherUser._id,
        username: otherUser.username,
        isGuest: otherUser.isGuest,
        avatarRecipe: otherProfile.avatarRecipe
      },
      lastMessageText: conv.lastMessageText,
      lastMessageAt: conv.lastMessageAt,
      unreadCount
    });
  }

  return inboxItems;
}

async function markConversationRead(conversationId, userId) {
  await ConversationMember.updateOne(
    { conversationId, userId },
    { lastReadAt: new Date() },
    { upsert: true }
  );
}

module.exports = {
  makeDmKey,
  getOrCreateDmConversation,
  getOrCreateRoomConversation,
  getUserInbox,
  markConversationRead
};
