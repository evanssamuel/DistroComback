# DistroChat v3 — Multi-room, avatars, and an admin panel

Real-time chat with rooms, deployed publicly so anyone with a link can join.

## What's new in this version
- **Bug fixes:** the mobile input bar no longer overflows on narrow phones
  (inputs don't shrink by default in a flex row — that was the real cause);
  the copy-invite-link icon now shows on mobile too; switching rooms no
  longer reloads the page or asks for your username again — it's instant and
  in-app now.
- **Optional profile photo (DP)** — skippable, resized in your browser before
  it's ever sent, so it stays lightweight.
- **Richer rooms** — creating one now asks for a name, an optional
  description, and an optional room photo. The sidebar room list shows all of
  it, plus a lock icon for rooms an admin has frozen.
- **Admin panel** — a hidden dashboard only you know the address to. Covers:
  - Live stats (online now, total rooms, messages today/all-time)
  - Room management: lock a room read-only, or delete it
  - Message takedown — remove any message, it disappears live for everyone
  - Mute (temporary) or ban (permanent) a username, per-room or app-wide
  - A list of active bans/mutes with one-click lifting
  - An audit log of every admin action you've taken

## Project structure
```
distrochat-node/
├── server.js                  <- Express + Socket.IO + admin routes
├── src/
│   ├── db.js                   <- MongoDB connection
│   ├── roomCode.js              <- short room-code generator
│   └── models/
│       ├── Room.js               <- now includes description, image, locked
│       ├── Message.js            <- now includes avatar
│       ├── Ban.js                 <- mutes and bans
│       └── AuditLog.js            <- admin action history
├── public/
│   ├── index.html                <- the chat client
│   ├── admin-login.html          <- admin password screen
│   └── admin.html                <- admin dashboard
├── package.json
└── .env.example
```

## 1. MongoDB Atlas setup - unchanged from before
If you already have this working, skip to step 2. Otherwise: create a free
M0 cluster at mongodb.com/cloud/atlas, add a database user, add 0.0.0.0/0
under Network Access, and copy your connection string from Connect -> Drivers.

## 2. New environment variables for this version
Open .env (or .env.example if starting fresh) and set:
```
ADMIN_PASSWORD=pick-a-strong-password-only-you-know
SESSION_SECRET=any-long-random-string
ADMIN_PATH=/admin-panel
```
- ADMIN_PASSWORD - what you'll type to log into the admin panel. Don't
  reuse a password from anywhere else.
- SESSION_SECRET - signs your admin login session. Any long random
  string works (generate one at randomkeygen.com if you want).
- ADMIN_PATH - the URL path for your admin panel, e.g. with the default
  above it's https://yourapp.onrender.com/admin-panel. Change it to
  something less guessable if you want an extra layer - the password is your
  real protection either way, this just avoids casual stumbling.

## 3. Run it locally
```bash
cd distrochat-node
npm install
npm start
```
Open http://localhost:5000 for the chat, and
http://localhost:5000/admin-panel/login (or whatever you set ADMIN_PATH to)
for the admin panel.

## 4. Deploy (same as before, plus 3 new env vars)
On Render, add ADMIN_PASSWORD, SESSION_SECRET, and ADMIN_PATH alongside
your existing MONGODB_URI in the Environment tab, then redeploy. Everything
else about deployment (build command npm install, start command
npm start, the UptimeRobot /health ping) stays the same as before.

## How moderation works - one honest limitation
Usernames in this app aren't tied to real accounts (anyone can type any name
to join). So a ban or mute blocks a username from a room, not a person -
someone determined could rejoin under a different name. This is normal for
this style of anonymous chat app and matches what similar tools do, but it's
worth knowing rather than assuming it's airtight. It stops casual repeat
troublemakers, not a determined bad actor.

## Still on hold (per our plan)
- User-facing "report a message" button, feeding an admin queue - flagged as
  a possible next step if you want it
- Site-wide announcements broadcast into every room at once
- A configurable bad-word filter
