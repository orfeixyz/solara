const express = require('express');
const authMiddleware = require('../middleware/auth');
const coreController = require('../controllers/coreController');

const router = express.Router();

router.get('/', authMiddleware, coreController.getCoreState);
router.post('/contribute', authMiddleware, coreController.contributeCore);
router.post('/activate', authMiddleware, coreController.activateCore);

module.exports = router;
