const express = require('express');
const router = express.Router();
const adminBookingController = require('../controllers/adminBookingController');
const userController = require('../controllers/userController');

const isAuth = require('../middleware/is-auth');

// Booking routes
router.get('/bookings', isAuth, adminBookingController.getBookings);
router.get('/bookings/create', isAuth, adminBookingController.renderCreateBooking);
router.post('/bookings/create', isAuth, adminBookingController.createBooking);
router.get('/trips/:id', isAuth, adminBookingController.getTourDetails);
router.get('/bookings/:id', isAuth, adminBookingController.getBookingDetails);
router.patch('/bookings/:id/status', isAuth, adminBookingController.updateBookingStatus);
router.put('/bookings/:id/amount', isAuth, adminBookingController.updateBookingAmount);
router.patch('/bookings/bulk-status', isAuth, adminBookingController.bulkUpdateBookingStatus);
router.get('/users/search', isAuth, adminBookingController.getUsersForBooking);
// Add these routes
router.post('/send-email/:bookingId',isAuth, adminBookingController.sendEmail);
router.post('/send-invoice/:bookingId',isAuth, adminBookingController.sendInvoice);

router.get('/search-documents', isAuth, adminBookingController.searchAndGenerateDocs);
router.get('/search-bookings', isAuth, adminBookingController.searchBookings);
router.post('/generate/invoice/:id', isAuth, adminBookingController.generateInvoice);
router.post('/generate/receipt/:bookingId/:paymentLogId', isAuth, adminBookingController.generateReceipt);
router.get('/download/invoice/:id', isAuth, adminBookingController.downloadInvoice);
router.get('/download/receipt/:id', isAuth, adminBookingController.downloadReceipt);

// UI Rendering Routes
router.get('/users', isAuth, userController.getUsers); // Render user list dashboard
router.get('/users/:id', isAuth, userController.getUserDetails); // Render single user details

// API Routes
router.post('/users', isAuth, userController.createUser); // Create new user
router.put('/users/:id', isAuth, userController.updateUser); // Update user
router.put('/users/:id/update-contact', isAuth, adminBookingController.updateUserContact); // Update user contact info
router.post('/users/export', isAuth, userController.exportUsers); // Export users
router.post('/users/contact', isAuth, userController.contactUsers); // Contact users
router.get('/users/:id/bookings', isAuth, userController.getUserBookings); // Get user bookings (API)


module.exports = router;