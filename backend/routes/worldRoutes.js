const express = require('express');
const worldController = require('../controllers/worldController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, worldController.getWorld);

module.exports = router;
