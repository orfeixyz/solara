const express = require('express');
const socialController = require('../controllers/socialController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/chat', authMiddleware, socialController.getMessages);
router.post('/chat', authMiddleware, socialController.postMessage);
router.get('/presence', authMiddleware, socialController.getPresence);
router.post('/presence/ping', authMiddleware, socialController.pingPresence);

module.exports = router;
