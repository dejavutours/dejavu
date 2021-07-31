const express = require("express");

const Tours = require("../models/tours");

const toursController = require("../controllers/tours");

const isAuth = require('../middleware/is-auth');

const router = express.Router();

router.get("/" , toursController.getIndexPage);

router.get("/admin/addtours" , isAuth, toursController.getAddTours);

router.post("/admin/addtours", isAuth,  toursController.postAddTours);

router.get("/tripdetails/:token" , toursController.getTourDetails);

router.post("/newsletter" , toursController.postNewsletter);

router.get("/contact", toursController.getContact);

router.post("/contact", toursController.postContact);

router.get("/about", toursController.getAbout);

router.post("/getbooktrip", toursController.getBookTrip);

router.post("/booktrip", toursController.postBookTrip);

router.post("/admin/delete", isAuth, toursController.postDelete);

router.post("/admin/edit", isAuth, toursController.postEdit);

router.post("/admin/addeditedtours", isAuth, toursController.postAddeditedtours);

router.post("/admin/addupcoming", isAuth, toursController.postAddUpcoming);

router.get("/upcomingtrips", toursController.getUpcomingTrips);

//router.post("/admin/deleteupcoming", isAuth, toursController.postDeleteUpcomingtrips);

router.get("/accomodation", toursController.getAccomodation);

router.get("/admin/addaccomodation", isAuth, toursController.getAddAccomodation);

router.post("/admin/addaccomodation", isAuth, toursController.postAddAccomodation);

router.post("/admin/accod/delete", isAuth, toursController.postDeleteAccomodations);

router.post("/admin/accod/edit", isAuth, toursController.postEditAccomodations);

router.post("/admin/accod/addededit", isAuth, toursController.postAddEditAccomodations);

router.get("/accomodationdetails/:token", toursController.getAccomodationsDetails);

router.get("/filters/:token", toursController.getStateFilters);

router.post("/admin/AddImage", isAuth, toursController.getToursAddimage);

router.post("/admin/ImageAdded", isAuth, toursController.postImageAdded);

router.post("/admin/BannerImageAdded", isAuth, toursController.postBannerImageAdded);

router.post("/admin/deleteimage", isAuth, toursController.postDeleteimage);

router.get("/admin/login", toursController.getAdminLogin);

router.post("/admin/login", toursController.postAdminLogin);

router.post("/admin/logout", isAuth, toursController.postLogout);

router.post("/accod/queryform", toursController.postAccodQuery);

router.get("/admin/accoddetails", isAuth, toursController.getAccodDetails);

router.get("/admin/viewregistration", isAuth, toursController.getViewRegistration);

router.get("/admin/viewmails" , isAuth, toursController.getViewEmails);

router.post("/admin/delaccoddetails", isAuth, toursController.postDeleteAccod);

router.get("/admin/downloadpdf/:regid", isAuth, toursController.getDownloadPDF);

router.get("/admin/code", isAuth, toursController.getAdminCode);

router.post("/admin/accod/AddImage", isAuth, toursController.getAccodAddImage);

router.post("/admin/accod/ImageAdded", isAuth, toursController.postAccodImageAdded);

router.post("/admin/accod/deleteimage", isAuth, toursController.postDeleteAccodImage);

router.post("/admin/accod/BannerImageAdded", isAuth, toursController.postAccodBannerImageAdded);

router.post("/admin/deleteupcomingdate", isAuth, toursController.postDeleteUpcomingDate);

router.post("/bookdate", toursController.postBookDate);

router.post("/admin/deleteregistration", toursController.postDeleteRegistration);

module.exports = router; 