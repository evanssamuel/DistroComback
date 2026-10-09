const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 40 },
  description: { type: String, trim: true, maxlength: 200, default: '' },
  image: { type: String, default: '' }, // compressed data URL, kept small client-side
  isGeneral: { type: Boolean, default: false },
  locked: { type: Boolean, default: false }, // admin: read-only, no new messages
  createdAt: { type: Date, default: Date.now },
  lastActivityAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Room', roomSchema);
