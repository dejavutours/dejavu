const express = require("express");

const Tours = require("../models/tours");

const toursController = require("../controllers/tours");

const makepdfController = require("../controllers/makepdf");

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

router.get("/blog", toursController.getBlog);

router.get("/blogDetails/:id/:title", toursController.getSingleBlog);

router.get("/admin/addblog", isAuth, toursController.getAddBlog);

router.post("/admin/addblog", isAuth, toursController.postAddBlog);

router.get("/tags/:id", toursController.getTagFilter);

router.post("/search/trip", toursController.getSearchTrip);

router.post("/search/blog", toursController.getSearchBlog);

router.post("/admin/deleteblog", isAuth, toursController.postDeleteBlog);

router.post("/admin/editblog", isAuth, toursController.getEditBlog);

router.post("/admin/addEditedblog", isAuth, toursController.postEditblog);

router.get("/admin/costingcal", isAuth, toursController.getcalculateCosting);

router.get("/admin/getStayCost", isAuth, toursController.getStayCost);

router.post("/admin/getStayCost", isAuth, toursController.postStayCost);

router.post("/admin/deleteStay", isAuth, toursController.deleteStay);

router.get("/admin/makepdf" ,isAuth, makepdfController.getMakePdf);

router.post("/admin/makepdf" ,isAuth, makepdfController.postMakePdf);

router.post("/getstateCities" , makepdfController.getstateCities);

router.get("/admin/getViewPdfdetails" ,isAuth, makepdfController.getViewPdfdetails);

router.post("/admin/editpdftrip",isAuth, makepdfController.editPdfDetails);

router.post("/admin/updatetrip",isAuth, makepdfController.updatePdfDetails);

router.post("/admin/deletetrip",isAuth, makepdfController.deletePdftrip);

module.exports = router; 
