// Generates short, human-friendly room codes (e.g. "K7XPQ2").
// Excludes visually ambiguous characters (0/O, 1/I/L) so codes are easy
// to read aloud and retype correctly.
const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateRoomCode(length = 6) {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

module.exports = { generateRoomCode };
