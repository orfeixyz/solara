const express = require('express');
const resourceController = require('../controllers/resourceController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, resourceController.getResources);

module.exports = router;
