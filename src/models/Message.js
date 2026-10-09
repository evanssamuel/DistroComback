const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', index: true },
  roomId: { type: String, index: true }, // fallback for direct room lookup
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  username: { type: String },
  type: { type: String, enum: ['message', 'system', 'sticker', 'image'], default: 'message' },
  text: { type: String, default: '', maxlength: 1000 },
  mediaUrl: { type: String, default: '' },
  replyToId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  clientMsgId: { type: String },
  deletedAt: { type: Date },
  createdAt: { type: Date, default: Date.now, index: true }
});

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ roomId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
