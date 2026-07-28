const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

// @route  POST /api/conversations
const createConversation = async (req, res) => {
  try {
    const { title, mode, description } = req.body;

    const conversation = await Conversation.create({
      userId: req.user._id,
      title: title || 'New Conversation',
      mode: mode || 'General',
      description: description || '',
    });

    return res.status(201).json({ conversation });
  } catch (error) {
    return res.status(500).json({ message: 'Server error creating conversation', error: error.message });
  }
};

// @route  GET /api/conversations
const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({ userId: req.user._id })
      .sort({ lastMessageTime: -1 });

    return res.status(200).json({ conversations });
  } catch (error) {
    return res.status(500).json({ message: 'Server error fetching conversations', error: error.message });
  }
};

// @route  GET /api/conversations/search?query=...
// NOTE: this route must be registered BEFORE /:id in the router,
// otherwise Express will treat "search" as an :id value.
const searchConversations = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ message: 'Please provide a search query' });
    }

    const conversations = await Conversation.find({
      userId: req.user._id,
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { lastMessage: { $regex: query, $options: 'i' } },
      ],
    }).sort({ lastMessageTime: -1 });

    return res.status(200).json({ conversations });
  } catch (error) {
    return res.status(500).json({ message: 'Server error searching conversations', error: error.message });
  }
};

// @route  GET /api/conversations/:id
const getConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findOne({ _id: req.params.id, userId: req.user._id });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const messages = await Message.find({ conversationId: conversation._id }).sort({ timestamp: 1 });

    return res.status(200).json({ conversation, messages });
  } catch (error) {
    return res.status(500).json({ message: 'Server error fetching conversation', error: error.message });
  }
};

// @route  PUT /api/conversations/:id
const updateConversation = async (req, res) => {
  try {
    const { title, mode, isArchived } = req.body;

    const conversation = await Conversation.findOne({ _id: req.params.id, userId: req.user._id });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (title !== undefined) conversation.title = title;
    if (mode !== undefined) conversation.mode = mode;
    if (isArchived !== undefined) conversation.isArchived = isArchived;

    await conversation.save();

    return res.status(200).json({ conversation });
  } catch (error) {
    return res.status(500).json({ message: 'Server error updating conversation', error: error.message });
  }
};

// @route  DELETE /api/conversations/:id
const deleteConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findOne({ _id: req.params.id, userId: req.user._id });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Clean up all messages that belong to this conversation
    await Message.deleteMany({ conversationId: conversation._id });
    await conversation.deleteOne();

    return res.status(200).json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error deleting conversation', error: error.message });
  }
};

module.exports = {
  createConversation,
  getConversations,
  searchConversations,
  getConversation,
  updateConversation,
  deleteConversation,
};
