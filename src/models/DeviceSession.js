const mongoose = require('mongoose');

const deviceSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true, index: true },
  deviceLabel: { type: String, default: 'Web Browser' },
  createdAt: { type: Date, default: Date.now },
  lastUsedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date }
});

module.exports = mongoose.model('DeviceSession', deviceSessionSchema);
