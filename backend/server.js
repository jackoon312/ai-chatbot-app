require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const conversationRoutes = require('./routes/conversations');
const messageRoutes = require('./routes/messages');
const settingsRoutes = require('./routes/settings');
const initializeSocket = require('./socket');

const app = express();

// Wrap the Express app in a raw HTTP server so Socket.io can attach to it.
// (Socket.io needs the underlying HTTP server, not the Express app directly.)
const server = http.createServer(app);

// Connect to MongoDB
connectDB();

// In production this should be your deployed frontend's exact URL (set via
// the CLIENT_URL environment variable on your host). Falling back to '*'
// keeps local development frictionless without needing to set it there.
const allowedOrigin = process.env.CLIENT_URL || '*';

// Middleware
app.use(cors({ origin: allowedOrigin }));
app.use(express.json());

const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
  res.send('Server is running!');
});

app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/settings', settingsRoutes);

// Set up Socket.io on top of the same HTTP server
const io = new Server(server, {
  cors: {
    origin: allowedOrigin,
  },
});

initializeSocket(io);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
