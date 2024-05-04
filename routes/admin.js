const express = require("express");

const Tours = require("../models/tours");

const adminController = require("../controllers/admin");

const makepdfController = require("../controllers/makepdf");

const isAuth = require('../middleware/is-auth');

const router = express.Router();

//router.get("/admin/createPdf" , isAuth, adminController.makeTripPdf);
//router.post("/admin/createPdf" , isAuth, adminController.makeTripPdf);

router.get("/admin/maketripPdf" ,isAuth, makepdfController.maketripPdf);

router.post("/admin/maketripPdf" ,isAuth, makepdfController.postgeneratePdf);

router.post("/getstateCities" , makepdfController.getstateCities);


module.exports = router; 