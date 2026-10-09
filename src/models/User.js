const mongoose = require('mongoose');

const RESERVED_USERNAMES = new Set([
  'admin', 'administrator', 'support', 'moderator', 'distrochat',
  'system', 'mikko', 'help', 'root', 'official', 'staff'
]);

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, trim: true },
  usernameCi: { type: String, required: true, unique: true, index: true },
  displayName: { type: String, trim: true, default: '' },
  passwordHash: { type: String, default: '' },
  email: { type: String, trim: true, default: '' },
  emailVerified: { type: Boolean, default: false },
  isGuest: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'suspended', 'deleted'], default: 'active' },
  usernameLastChangedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now }
});

userSchema.statics.isUsernameReserved = function(username) {
  if (!username) return true;
  return RESERVED_USERNAMES.has(username.trim().toLowerCase());
};

userSchema.statics.validateUsernameFormat = function(username) {
  if (!username) return 'Username is required.';
  const trimmed = username.trim();
  if (trimmed.length < 3 || trimmed.length > 20) {
    return 'Username must be between 3 and 20 characters.';
  }
  if (!/^[a-zA-Z0-9_.]+$/.test(trimmed)) {
    return 'Username can only contain letters, numbers, underscores, and dots.';
  }
  if (this.isUsernameReserved(trimmed)) {
    return 'This username is reserved.';
  }
  return null;
};

module.exports = mongoose.model('User', userSchema);
