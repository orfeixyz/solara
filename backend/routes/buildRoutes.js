const express = require('express');
const buildController = require('../controllers/buildController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.post('/', authMiddleware, buildController.buildOrUpgrade);
router.post('/destroy', authMiddleware, buildController.destroyBuilding);

module.exports = router;

