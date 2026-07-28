const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const AISettings = require('../models/AISettings');
const { streamAIResponse } = require('../services/geminiService');

const initializeSocket = (io) => {
  // Every socket connection must present a valid JWT before it's allowed in.
  // The client sends this via the `auth` option when connecting (see socket-test/index.html).
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error('Authentication error: no token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return next(new Error('Authentication error: user not found'));
      }

      socket.user = user; // attach the user so event handlers below can use it
      return next();
    } catch (error) {
      return next(new Error('Authentication error: invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (user: ${socket.user.username})`);

    // Client asks to join a specific conversation's "room" so messages
    // only broadcast to people viewing that conversation.
    socket.on('join_conversation', (conversationId) => {
      socket.join(conversationId);
      console.log(`${socket.user.username} joined conversation room: ${conversationId}`);
    });

    socket.on('leave_conversation', (conversationId) => {
      socket.leave(conversationId);
      console.log(`${socket.user.username} left conversation room: ${conversationId}`);
    });

    // data shape expected from client: { conversationId, content }
    socket.on('send_message', async (data) => {
      try {
        const { conversationId, content } = data;

        if (!conversationId || !content) {
          return socket.emit('error', { message: 'conversationId and content are required' });
        }

        // Ownership check - make sure this conversation belongs to the connected user
        const conversation = await Conversation.findOne({
          _id: conversationId,
          userId: socket.user._id,
        });

        if (!conversation) {
          return socket.emit('error', { message: 'Conversation not found' });
        }

        // 1. Save the user's message and broadcast it to the room
        const userMsg = await Message.create({
          conversationId,
          userId: socket.user._id,
          sender: 'user',
          content,
        });

        io.to(conversationId).emit('message_received', {
          _id: userMsg._id,
          sender: 'user',
          content: userMsg.content,
          timestamp: userMsg.timestamp,
        });

        // 2. Load prior messages (everything before the one we just saved) for context
        const priorHistory = await Message.find({
          conversationId,
          _id: { $ne: userMsg._id },
        }).sort({ timestamp: 1 });

        // 3. Let the room know the AI is starting to respond
        io.to(conversationId).emit('ai_response_start');

        // Load the user's saved AI settings (temperature, max tokens, custom system prompt).
        // Falls back to defaults if they've never saved any (getSettings creates them on
        // first GET, but a user might send a message before ever hitting that endpoint).
        const settings = (await AISettings.findOne({ userId: socket.user._id })) || {};

        // 4. Stream the Gemini response, emitting each chunk as it arrives
        const fullResponse = await streamAIResponse({
          mode: conversation.mode,
          history: priorHistory,
          userMessage: content,
          settings,
          onChunk: (chunkText) => {
            io.to(conversationId).emit('ai_response_chunk', { content: chunkText });
          },
        });

        // 5. Save the complete AI message once streaming is done
        const aiMsg = await Message.create({
          conversationId,
          userId: socket.user._id,
          sender: 'ai',
          content: fullResponse,
        });

        // 6. Keep the conversation's preview fields in sync
        conversation.messageCount += 2; // the user message + the AI message
        conversation.lastMessage = fullResponse.slice(0, 200);
        conversation.lastMessageTime = new Date();
        await conversation.save();

        io.to(conversationId).emit('ai_response_end', {
          _id: aiMsg._id,
          content: aiMsg.content,
          timestamp: aiMsg.timestamp,
        });
      } catch (error) {
        console.error('send_message error:', error.message);
        socket.emit('error', { message: 'Failed to process message', error: error.message });
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id} (user: ${socket.user.username})`);
    });
  });
};

module.exports = initializeSocket;
