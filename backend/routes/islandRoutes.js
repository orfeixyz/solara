const express = require('express');
const islandController = require('../controllers/islandController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/:id', authMiddleware, islandController.getIsland);
router.patch('/:id/name', authMiddleware, islandController.renameIsland);

module.exports = router;

