const express = require('express');
const router = express.Router();
const bookingLeadController = require('../controllers/bookingLeadController');
const validateLogin = require('../middleware/validateLogin');
const isAuth = require('../middleware/is-auth');

// User routes (require login)
router.post('/booking-lead/create', validateLogin, bookingLeadController.createBookingLead);
router.post('/profile/getBookingLeads', validateLogin, bookingLeadController.getUserBookingLeads);

// Admin routes (require auth)
router.get('/admin/booking-leads', isAuth, bookingLeadController.getBookingLeads);
router.get('/admin/booking-leads/stats', isAuth, bookingLeadController.getBookingLeadsStats);
router.get('/admin/booking-leads/:id', isAuth, bookingLeadController.getBookingLeadDetails);
router.put('/admin/booking-leads/:id/status', isAuth, bookingLeadController.updateLeadStatus);
// router.post('/admin/booking-leads/:id/convert', isAuth, bookingLeadController.convertLeadToBooking);
router.delete('/admin/booking-leads/:id', isAuth, bookingLeadController.deleteLead);

module.exports = router;

