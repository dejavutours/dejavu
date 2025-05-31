const express = require('express');
const router = express.Router();
const adminBookingController = require('../controllers/adminBookingController');

const makepdfController = require('../controllers/makepdf');
const isAuth = require('../middleware/is-auth');

// Booking routes
router.get('/bookings', isAuth, adminBookingController.getBookings);
router.get('/bookings/:id', isAuth, adminBookingController.getBookingDetails);
router.patch('/bookings/:id/status', isAuth, adminBookingController.updateBookingStatus);
router.patch('/bookings/bulk-status', isAuth, adminBookingController.bulkUpdateBookingStatus);

// Other routes
router.post('/getstateCities', makepdfController.getstateCities);

module.exports = router;