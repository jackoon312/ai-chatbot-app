const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createConversation,
  getConversations,
  searchConversations,
  getConversation,
  updateConversation,
  deleteConversation,
} = require('../controllers/conversationController');
const { getMessages, addMessage } = require('../controllers/messageController');

router.use(protect); // every route below requires a valid JWT

// IMPORTANT: /search must come before /:id, or Express will match "search"
// as the :id parameter and call getConversation instead.
router.get('/search', searchConversations);

router.post('/', createConversation);
router.get('/', getConversations);
router.get('/:id', getConversation);
router.put('/:id', updateConversation);
router.delete('/:id', deleteConversation);

// Nested message routes
router.get('/:id/messages', getMessages);
router.post('/:id/messages', addMessage);

module.exports = router;
