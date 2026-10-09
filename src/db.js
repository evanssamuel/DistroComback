const mongoose = require('mongoose');

let mongoMemoryServer = null;

async function connectDB() {
  let uri = process.env.MONGODB_URI;

  if (!uri || process.env.NODE_ENV === 'test') {
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoMemoryServer = await MongoMemoryServer.create();
      uri = mongoMemoryServer.getUri();
      console.log('[db] MONGODB_URI not provided or in test mode: using in-memory MongoDB server');
    } catch (err) {
      if (!uri) {
        throw new Error('MONGODB_URI is not set and MongoMemoryServer failed to start: ' + err.message);
      }
    }
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('[db] MongoDB disconnected — mongoose will attempt to reconnect automatically');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('[db] MongoDB reconnected');
  });

  await mongoose.connect(uri);
  console.log('[db] Connected to MongoDB');
}

async function closeDB() {
  await mongoose.disconnect();
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
  }
}

module.exports = { connectDB, closeDB };
