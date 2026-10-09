const mongoose = require('mongoose');

const recoveryCodeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  codeHash: { type: String, required: true, index: true },
  createdAt: { type: Date, default: Date.now },
  usedAt: { type: Date }
});

module.exports = mongoose.model('RecoveryCode', recoveryCodeSchema);
