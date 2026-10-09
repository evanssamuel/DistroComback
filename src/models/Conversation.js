const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  kind: { type: String, enum: ['room', 'dm'], required: true, index: true },
  roomId: { type: String, index: true }, // applicable when kind === 'room'
  dmKey: { type: String, index: true }, // e.g. "userId1_userId2" sorted, when kind === 'dm'
  state: { type: String, enum: ['open', 'blocked'], default: 'open' },
  lastMessageText: { type: String, default: '' },
  lastMessageAt: { type: Date, default: Date.now, index: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Conversation', conversationSchema);
