const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const AISettings = require('../models/AISettings');
const { streamAIResponse } = require('../services/geminiService');

// Gemini's free tier has two separate limits that both return a 429:
// - A short per-minute/per-token limit, which includes a real retryDelay
//   (seconds) and genuinely clears itself shortly after.
// - A daily request quota (RPD), which resets on a fixed daily cycle
//   (roughly midnight Pacific Time) rather than any short countdown, and
//   whose error usually has NO short retryDelay at all.
// Treating both the same way (as we did before) meant falling back to a fake
// 60s countdown for daily-quota errors - which never actually clears, so the
// user just sees the same "60s" message forever. We now tell them apart.
const parseRetryDelaySeconds = (raw) => {
  const match = raw.match(/retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/i) || raw.match(/retry in ([\d.]+)s/i);
  return match ? Math.ceil(parseFloat(match[1])) : null;
};

const buildErrorPayload = (error, fallbackMessage) => {
  const raw = error.message || '';
  const isRateLimitFamily = /429|rate.?limit|quota|RESOURCE_EXHAUSTED/i.test(raw);

  if (!isRateLimitFamily) {
    return { message: fallbackMessage, detail: raw };
  }

  const isDailyQuota = /per.?day/i.test(raw);
  const retrySeconds = parseRetryDelaySeconds(raw);

  // No short retry delay found, explicitly a per-day limit, or a suspiciously
  // long delay (>5 min) - treat as the daily quota, not a quick rate limit.
  // Showing a ticking countdown here would be actively misleading.
  if (isDailyQuota || retrySeconds === null || retrySeconds > 300) {
    return {
      message:
        "You've reached today's free usage limit with the AI provider. This resets on a daily cycle, not within a minute - try again later today or tomorrow.",
      detail: raw,
    };
  }

  return {
    message: "You've hit the AI provider's short-term rate limit.",
    retryAfterSeconds: retrySeconds,
    detail: raw,
  };
};

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
        socket.emit('error', buildErrorPayload(error, 'Failed to process message'));
      }
    });

    // data shape expected from client: { messageId, content }
    // Editing a user message forks the conversation from that point forward -
    // everything that came after gets deleted, and the AI response is regenerated
    // from the edited content. This matches how ChatGPT/Claude handle message edits.
    socket.on('edit_message', async (data) => {
      try {
        const { messageId, content } = data;

        if (!messageId || !content) {
          return socket.emit('error', { message: 'messageId and content are required' });
        }

        const message = await Message.findOne({ _id: messageId, userId: socket.user._id });

        if (!message) {
          return socket.emit('error', { message: 'Message not found' });
        }

        if (message.sender !== 'user') {
          return socket.emit('error', { message: 'Only user messages can be edited' });
        }

        const conversation = await Conversation.findOne({
          _id: message.conversationId,
          userId: socket.user._id,
        });

        if (!conversation) {
          return socket.emit('error', { message: 'Conversation not found' });
        }

        const conversationId = conversation._id.toString();

        // 1. Delete every message that came after the one being edited (the old
        // AI reply, and anything beyond it) - the conversation forks from here.
        const deleted = await Message.deleteMany({
          conversationId: conversation._id,
          timestamp: { $gt: message.timestamp },
        });

        // 2. Update the edited message itself
        message.content = content;
        message.isEdited = true;
        message.editedAt = new Date();
        await message.save();

        io.to(conversationId).emit('message_edited', {
          _id: message._id,
          content: message.content,
          isEdited: true,
          editedAt: message.editedAt,
          timestamp: message.timestamp,
        });

        // 3. Load history up to (not including) the edited message for context
        const priorHistory = await Message.find({
          conversationId: conversation._id,
          _id: { $ne: message._id },
          timestamp: { $lt: message.timestamp },
        }).sort({ timestamp: 1 });

        io.to(conversationId).emit('ai_response_start');

        const settings = (await AISettings.findOne({ userId: socket.user._id })) || {};

        // 4. Regenerate the AI response from the edited content
        const fullResponse = await streamAIResponse({
          mode: conversation.mode,
          history: priorHistory,
          userMessage: content,
          settings,
          onChunk: (chunkText) => {
            io.to(conversationId).emit('ai_response_chunk', { content: chunkText });
          },
        });

        const aiMsg = await Message.create({
          conversationId: conversation._id,
          userId: socket.user._id,
          sender: 'ai',
          content: fullResponse,
        });

        // 5. Keep the conversation's preview fields in sync (removed messages + 1 new one)
        conversation.messageCount = conversation.messageCount - deleted.deletedCount + 1;
        conversation.lastMessage = fullResponse.slice(0, 200);
        conversation.lastMessageTime = new Date();
        await conversation.save();

        io.to(conversationId).emit('ai_response_end', {
          _id: aiMsg._id,
          content: aiMsg.content,
          timestamp: aiMsg.timestamp,
        });
      } catch (error) {
        console.error('edit_message error:', error.message);
        socket.emit('error', buildErrorPayload(error, 'Failed to edit message'));
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id} (user: ${socket.user.username})`);
    });
  });
};

module.exports = initializeSocket;
