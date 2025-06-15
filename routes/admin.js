const express = require('express');
const router = express.Router();
const adminBookingController = require('../controllers/adminBookingController');
const userController = require('../controllers/userController');

const makepdfController = require('../controllers/makepdf');
const isAuth = require('../middleware/is-auth');

// Booking routes
router.get('/bookings', isAuth, adminBookingController.getBookings);
router.get('/bookings/:id', isAuth, adminBookingController.getBookingDetails);
router.patch('/bookings/:id/status', isAuth, adminBookingController.updateBookingStatus);
router.patch('/bookings/bulk-status', isAuth, adminBookingController.bulkUpdateBookingStatus);

// Other routes
router.post('/getstateCities', makepdfController.getstateCities);

// UI Rendering Routes
router.get('/users', isAuth, userController.getUsers); // Render user list dashboard
router.get('/users/:id', isAuth, userController.getUserDetails); // Render single user details

// API Routes
router.post('/users', isAuth, userController.createUser); // Create new user
router.put('/users/:id', isAuth, userController.updateUser); // Update user
router.post('/users/export', isAuth, userController.exportUsers); // Export users
router.post('/users/contact', isAuth, userController.contactUsers); // Contact users
router.get('/users/:id/bookings', isAuth, userController.getUserBookings); // Get user bookings (API)


module.exports = router;