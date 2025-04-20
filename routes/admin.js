const express = require("express");

// const Tours = require("../models/tours");

// const adminController = require("../controllers/admin");

const makepdfController = require("../controllers/makepdf");

const isAuth = require('../middleware/is-auth');

const router = express.Router();

const adminBookingController = require('../controllers/adminBookingController');

router.get('/bookings', isAuth,adminBookingController.getBookings);
router.get('/bookings/:id',isAuth, adminBookingController.getBookingDetails);
router.patch('/bookings/:id/status',isAuth, adminBookingController.updateBookingStatus);
router.patch('/bookings/bulk-status', isAuth, adminBookingController.bulkUpdateBookingStatus);

// router.get("/maketripPdf" ,isAuth, makepdfController.maketripPdf);

// router.post("/maketripPdf" ,isAuth, makepdfController.postgeneratePdf);

router.post("/getstateCities" , makepdfController.getstateCities);


module.exports = router; 