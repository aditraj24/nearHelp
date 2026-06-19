import dotenv from 'dotenv';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import app from './app.js';
import { connectDB } from './db/index.js';
import { initializeSocket } from './socket/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

console.log('Environment check:');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Loaded' : 'NOT LOADED');
console.log('PORT:', process.env.PORT);

const PORT = process.env.PORT || 5000;
const httpServer = createServer(app);

const startServer = async () => {
  try {
    await connectDB();
    
    initializeSocket(httpServer);

    httpServer.listen(PORT, () => {
      console.log(`NearHelp server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
