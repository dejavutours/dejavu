const express = require('express');
const router = express.Router();
const quickCallController = require('../controllers/quickCallController');

// Route to handle Quick Call request submission
router.post('/quick-call/request', quickCallController.submitQuickCallRequest);

// Route to render Quick Call requests page (returns HTML)
router.get('/quick-call', quickCallController.renderQuickCallRequests);

// Route to fetch filtered Quick Call requests (returns JSON)
router.get('/quick-call/requests', quickCallController.getQuickCallRequests);

// Route to update a Quick Call request (responded or markAsSpam)
router.put('/quick-call/:id', quickCallController.updateQuickCallRequest);

module.exports = router;