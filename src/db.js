const mongoose = require('mongoose');

mongoose.set('strictQuery', true);

function mongoUri() {
  return process.env.MONGODB_URI || process.env.MONGO_URL || process.env.DATABASE_URL || '';
}

async function connectDB() {
  const uri = mongoUri();
  if (!uri) {
    throw new Error('Brak MONGODB_URI (lub MONGO_URL). Dodaj zmienną w Railway → Variables.');
  }
  await mongoose.connect(uri, { dbName: process.env.MONGODB_DB || undefined, serverSelectionTimeoutMS: 15000 });
  console.log('[db] połączono z MongoDB');
  return mongoose.connection;
}

module.exports = { connectDB, mongoUri };
