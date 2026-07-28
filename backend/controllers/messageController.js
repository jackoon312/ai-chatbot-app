const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

// @route  GET /api/conversations/:id/messages
// Supports pagination via ?page=1&limit=50
const getMessages = async (req, res) => {
  try {
    const conversation = await Conversation.findOne({ _id: req.params.id, userId: req.user._id });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const messages = await Message.find({ conversationId: conversation._id })
      .sort({ timestamp: 1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({ messages, page, limit });
  } catch (error) {
    return res.status(500).json({ message: 'Server error fetching messages', error: error.message });
  }
};

// @route  POST /api/conversations/:id/messages
// NOTE: For now this just stores the user's message. AI response generation
// via Gemini + real-time streaming over Socket.io is built in Week 2.
const addMessage = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const conversation = await Conversation.findOne({ _id: req.params.id, userId: req.user._id });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const message = await Message.create({
      conversationId: conversation._id,
      userId: req.user._id,
      sender: 'user',
      content,
    });

    // Keep the conversation's preview fields in sync
    conversation.messageCount += 1;
    conversation.lastMessage = content;
    conversation.lastMessageTime = new Date();
    await conversation.save();

    return res.status(201).json({ message });
  } catch (error) {
    return res.status(500).json({ message: 'Server error adding message', error: error.message });
  }
};

// @route  PUT /api/messages/:id
// Only the user's own messages can be edited (not AI messages)
const editMessage = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const message = await Message.findOne({ _id: req.params.id, userId: req.user._id });

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.sender !== 'user') {
      return res.status(403).json({ message: 'Only user messages can be edited' });
    }

    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    return res.status(200).json({ message });
  } catch (error) {
    return res.status(500).json({ message: 'Server error editing message', error: error.message });
  }
};

// @route  DELETE /api/messages/:id
const deleteMessage = async (req, res) => {
  try {
    const message = await Message.findOne({ _id: req.params.id, userId: req.user._id });

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.sender !== 'user') {
      return res.status(403).json({ message: 'Only user messages can be deleted' });
    }

    await message.deleteOne();

    // Keep the conversation's message count accurate
    await Conversation.findByIdAndUpdate(message.conversationId, {
      $inc: { messageCount: -1 },
    });

    return res.status(200).json({ message: 'Message deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error deleting message', error: error.message });
  }
};

module.exports = { getMessages, addMessage, editMessage, deleteMessage };
