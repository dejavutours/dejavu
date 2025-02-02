const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const ensureMultipleLogin = require('../middleware/validateLogin');

// Profile-related routes
router.route('/profile').get(ensureMultipleLogin, profileController.getMyTrips);

router
  .route('/profile/update')
  .post(ensureMultipleLogin, profileController.updateUserProfile);

router
  .route('/profile/getBookingHistoryItem')
  .post(ensureMultipleLogin, profileController.getBookingHistoryItem);

module.exports = router;
