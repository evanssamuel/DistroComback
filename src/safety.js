const Block = require('./models/Block');
const Report = require('./models/Report');
const User = require('./models/User');
const Conversation = require('./models/Conversation');

async function blockUser(blockerId, blockedId) {
  if (blockerId.toString() === blockedId.toString()) {
    throw new Error('You cannot block yourself.');
  }

  const existing = await Block.findOne({ blockerId, blockedId });
  if (!existing) {
    await Block.create({ blockerId, blockedId });
  }

  // Update any active DM conversation between them to 'blocked'
  const ids = [blockerId.toString(), blockedId.toString()].sort();
  const dmKey = ids.join('_');
  await Conversation.updateOne({ kind: 'dm', dmKey }, { state: 'blocked' });

  return { ok: true };
}

async function unblockUser(blockerId, blockedId) {
  await Block.deleteOne({ blockerId, blockedId });

  // Re-check if any remaining block exists between them
  const remainingBlock = await Block.findOne({
    $or: [
      { blockerId, blockedId },
      { blockerId: blockedId, blockedId: blockerId }
    ]
  });

  if (!remainingBlock) {
    const ids = [blockerId.toString(), blockedId.toString()].sort();
    const dmKey = ids.join('_');
    await Conversation.updateOne({ kind: 'dm', dmKey }, { state: 'open' });
  }

  return { ok: true };
}

async function isBlocked(userAId, userBId) {
  if (!userAId || !userBId) return false;
  const count = await Block.countDocuments({
    $or: [
      { blockerId: userAId, blockedId: userBId },
      { blockerId: userBId, blockedId: userAId }
    ]
  });
  return count > 0;
}

async function createReport({ reporterId, targetType, targetId, reason, note, snapshot }) {
  if (!targetType || !targetId || !reason) {
    throw new Error('Target type, target ID, and reason are required.');
  }

  const report = await Report.create({
    reporterId,
    targetType,
    targetId: targetId.toString(),
    reason: reason.trim(),
    note: (note || '').trim().slice(0, 500),
    snapshotJson: snapshot || {}
  });

  return report;
}

module.exports = {
  blockUser,
  unblockUser,
  isBlocked,
  createReport
};
