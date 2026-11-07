const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;

    if (!uri || uri.includes('<username>') || uri.includes('cluster0.mongodb.net') && uri.includes('<password>')) {
      console.warn('\n⚠️  [ShopSathi] MongoDB URI is missing or has placeholders in server/.env!');
      console.warn('👉  Please set your MongoDB Atlas connection string in server/.env:');
      console.warn('    MONGO_URI=mongodb+srv://<user>:<password>@cluster0.xxxx.mongodb.net/shopsathi?retryWrites=true&w=majority\n');
      return;
    }

    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of hanging
    });

    console.log(`[ShopSathi] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`\n⚠️  [ShopSathi] MongoDB Connection Error: ${error.message}`);
    console.error('👉  Possible causes:');
    console.error('    1. If using MongoDB Atlas: Ensure Network Access -> IP Whitelist includes 0.0.0.0/0 (allow from anywhere).');
    console.error('    2. If using local MongoDB: Ensure MongoDB service is running (mongod).');
    console.error('    3. Verify credentials (username/password/database name) in server/.env.\n');
  }
};

module.exports = connectDB;
