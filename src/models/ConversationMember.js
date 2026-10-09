const mongoose = require('mongoose');

const conversationMemberSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  lastReadAt: { type: Date, default: Date.now },
  muted: { type: Boolean, default: false },
  joinedAt: { type: Date, default: Date.now }
});

conversationMemberSchema.index({ conversationId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('ConversationMember', conversationMemberSchema);
