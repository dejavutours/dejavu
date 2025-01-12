const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const ensureMultipleLogin = require('../middleware/validateLogin');

// Profile-related routes
router.route('/mytrips').get(ensureMultipleLogin, profileController.getMyTrips);

router
  .route('/userprofile/update')
  .post(ensureMultipleLogin, profileController.updateUserProfile);

module.exports = router;
