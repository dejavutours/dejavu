const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const ensureMultipleLogin = require('../middleware/validateLogin');

// Profile-related routes
router.route('/profile').get(ensureMultipleLogin, profileController.getMyTrips);
router.route('/profile/update').post(ensureMultipleLogin, profileController.updateUserProfile);
router.route('/profile/getBookingHistoryItem').post(ensureMultipleLogin, profileController.getBookingHistoryItem);
router.route('/profile/initiate-payment').post(ensureMultipleLogin, profileController.initiatePayment);
router.route('/profile/verify-payment').post(ensureMultipleLogin, profileController.verifyPayment);
router.route('/profile/download/receipt/:paymentLogId').get(ensureMultipleLogin, profileController.downloadReceipt);
router.route('/profile/download/invoice/:bookingId').get(ensureMultipleLogin, profileController.downloadInvoice);

module.exports = router;
