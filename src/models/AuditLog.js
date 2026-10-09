const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true }, // e.g. 'delete_message', 'ban_user', 'lock_room'
  details: { type: String, maxlength: 500 },
  createdAt: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
