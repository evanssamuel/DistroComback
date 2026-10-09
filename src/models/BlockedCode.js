const mongoose = require('mongoose');

// A room code an admin has retired — can never be used for a new room again,
// even after the original room using it was deleted.
const blockedCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, index: true },
  reason: { type: String, maxlength: 200 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BlockedCode', blockedCodeSchema);
