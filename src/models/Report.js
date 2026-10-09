const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  targetType: { type: String, enum: ['message', 'user', 'room'], required: true },
  targetId: { type: String, required: true },
  reason: { type: String, required: true },
  note: { type: String, maxlength: 500, default: '' },
  snapshotJson: { type: Object, default: {} },
  status: { type: String, enum: ['open', 'reviewing', 'actioned', 'dismissed'], default: 'open' },
  createdAt: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('Report', reportSchema);
