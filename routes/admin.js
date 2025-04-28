const express = require('express');
const router = express.Router();
const adminBookingController = require('../controllers/adminBookingController');
const adminTourController = require('../controllers/adminTourController');
const tours = require('../controllers/tours');
const makepdfController = require('../controllers/makepdf');
const isAuth = require('../middleware/is-auth');

// Booking routes
router.get('/bookings', isAuth, adminBookingController.getBookings);
router.get('/bookings/:id', isAuth, adminBookingController.getBookingDetails);
router.patch('/bookings/:id/status', isAuth, adminBookingController.updateBookingStatus);
router.patch('/bookings/bulk-status', isAuth, adminBookingController.bulkUpdateBookingStatus);

// Tour management routes
router.get('/tours', isAuth, adminTourController.getTours);
router.post('/updateTourOrder', isAuth, adminTourController.updateTourOrder);
router.patch('/bulkUpdateTours', isAuth, adminTourController.bulkUpdateTours);
router.post('/duplicateTour', isAuth, adminTourController.duplicateTour);
router.post('/updateTourSEO', isAuth, adminTourController.updateTourSEO);
router.post('/updateTourImages', isAuth, adminTourController.updateTourImages);
router.post('/updateImageUrl', isAuth, adminTourController.updateImageUrl);
router.post('/changeTripStatus', isAuth, tours.changeTripStatus);

// Other routes
router.post('/getstateCities', makepdfController.getstateCities);

module.exports = router;