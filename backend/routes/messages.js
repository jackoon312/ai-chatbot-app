const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { editMessage, deleteMessage } = require('../controllers/messageController');

router.use(protect);

router.put('/:id', editMessage);
router.delete('/:id', deleteMessage);

module.exports = router;
