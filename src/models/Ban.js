const mongoose = require('mongoose');

// A "ban" (permanent, until manually lifted) or a "mute" (temporary, auto-expires).
// roomId is a specific room's code, or 'ALL' for a site-wide ban.
// Usernames aren't tied to real accounts in this app (anyone can join with any
// name), so this blocks by username match — good enough to stop casual abuse,
// but someone determined could pick a new name. Worth knowing, not a blocker.
const banSchema = new mongoose.Schema({
  username: { type: String, required: true, index: true },
  roomId: { type: String, required: true, index: true }, // specific room code, or 'ALL'
  type: { type: String, enum: ['mute', 'ban'], required: true },
  reason: { type: String, maxlength: 200 },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date } // present for mutes, absent (permanent) for bans
});

module.exports = mongoose.model('Ban', banSchema);
