const express = require('express');

const ensureLogIn = require('connect-ensure-login').ensureLoggedIn;

const ensureLoggedIn = ensureLogIn();

const Tours = require('../models/tours');

const toursController = require('../controllers/tours');

const makepdfController = require('../controllers/makepdf');

const isAuth = require('../middleware/is-auth');

const isPhoneAuth = require('../middleware/is-phone-auth');

const validateLogin = require('../middleware/validateLogin');

const jwt = require('jsonwebtoken');

const router = express.Router();

const ensuremultiplelogin = (req, res, next) => {
  console.log(res.locals.accessToken);
  if (res.locals.accessToken) {
    jwt.verify(
      res.locals.accessToken,
      process.env.JWT_TOKEN,
      (err, verifiedPhoneNumber) => {
        console.log(err, req.verifiedPhoneNumber);
        if (err) return res.sendStatus(403); // If token is invalid, respond with 403
        req.verifiedPhoneNumber = verifiedPhoneNumber; // Add the user to the request object
        // Proceed to the next middleware or route handler
      }
    );
    return next();
  }
  return ensureLoggedIn(req, res, next);
};

// Middleware to set Cache-Control headers for protected routes
const noCache = (req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
};

router.get('/login', (req, res, next) => {
  res.redirect('/');
});

router.get('/', toursController.getIndexPage);

router.get(
  '/admin/addtours',
  ensureLoggedIn,
  isAuth,
  toursController.getAddTours
);

router.post(
  '/admin/addtours',
  ensureLoggedIn,
  isAuth,
  toursController.postAddTours
);

router.post(
  '/admin/postNewAddTours',
  ensureLoggedIn,
  isAuth,
  toursController.postNewAddTours
);

router.post('/newsletter', toursController.postNewsletter);

router.get('/contact', toursController.getContact);

router.post('/contact', toursController.postContact);

router.get('/about', toursController.getAbout);

router.post('/getbooktrip', ensuremultiplelogin, toursController.getBookTrip);

router.post('/booktrip', ensuremultiplelogin, toursController.postBookTrip);

router.post(
  '/admin/delete',
  ensureLoggedIn,
  isAuth,
  toursController.postDelete
);

router.post('/admin/edit', ensureLoggedIn, isAuth, toursController.postEdit);

router.post(
  '/admin/addeditedtours',
  ensureLoggedIn,
  isAuth,
  toursController.postAddeditedtours
);

router.post(
  '/admin/addupcoming',
  ensureLoggedIn,
  isAuth,
  toursController.postAddUpcoming
);

router.get('/upcomingtrips', toursController.getUpcomingTrips);

//router.post("/admin/deleteupcoming", isAuth, toursController.postDeleteUpcomingtrips);

router.get('/accomodation', toursController.getAccomodation);

router.get(
  '/admin/addaccomodation',
  ensureLoggedIn,
  isAuth,
  toursController.getAddAccomodation
);

router.post(
  '/admin/addaccomodation',
  ensureLoggedIn,
  isAuth,
  toursController.postAddAccomodation
);

router.post(
  '/admin/accod/delete',
  ensureLoggedIn,
  isAuth,
  toursController.postDeleteAccomodations
);

router.post(
  '/admin/accod/edit',
  ensureLoggedIn,
  isAuth,
  toursController.postEditAccomodations
);

router.post(
  '/admin/accod/addededit',
  ensureLoggedIn,
  isAuth,
  toursController.postAddEditAccomodations
);

router.get(
  '/accomodationdetails/:token',
  toursController.getAccomodationsDetails
);

router.get('/filters/:token', toursController.getStateFilters);

router.post(
  '/admin/AddImage',
  ensureLoggedIn,
  isAuth,
  toursController.getToursAddimage
);

router.post(
  '/admin/ImageAdded',
  ensureLoggedIn,
  isAuth,
  toursController.postImageAdded
);

router.post(
  '/admin/BannerImageAdded',
  ensureLoggedIn,
  isAuth,
  toursController.postBannerImageAdded
);

router.post(
  '/admin/deleteimage',
  ensureLoggedIn,
  isAuth,
  toursController.postDeleteimage
);

router.get('/admin/login', toursController.getAdminLogin);

router.post('/admin/login', toursController.postAdminLogin);

router.post(
  '/admin/logout',
  ensureLoggedIn,
  isAuth,
  toursController.postLogout
);

router.post('/accod/queryform', toursController.postAccodQuery);

router.get(
  '/admin/accoddetails',
  ensureLoggedIn,
  isAuth,
  toursController.getAccodDetails
);

router.get(
  '/admin/viewregistration',
  ensureLoggedIn,
  isAuth,
  toursController.getViewRegistration
);

router.get(
  '/admin/viewmails',
  ensureLoggedIn,
  isAuth,
  toursController.getViewEmails
);

router.post(
  '/admin/delaccoddetails',
  ensureLoggedIn,
  isAuth,
  toursController.postDeleteAccod
);

router.get(
  '/admin/downloadpdf/:regid',
  ensureLoggedIn,
  isAuth,
  toursController.getDownloadPDF
);

router.get('/admin/code', ensureLoggedIn, isAuth, toursController.getAdminCode);

router.post(
  '/admin/accod/AddImage',
  ensureLoggedIn,
  isAuth,
  toursController.getAccodAddImage
);

router.post(
  '/admin/accod/ImageAdded',
  ensureLoggedIn,
  isAuth,
  toursController.postAccodImageAdded
);

router.post(
  '/admin/accod/deleteimage',
  ensureLoggedIn,
  isAuth,
  toursController.postDeleteAccodImage
);

router.post(
  '/admin/accod/BannerImageAdded',
  ensureLoggedIn,
  isAuth,
  toursController.postAccodBannerImageAdded
);

router.post(
  '/admin/deleteupcomingdate',
  ensureLoggedIn,
  isAuth,
  toursController.postDeleteUpcomingDate
);

router.post('/bookdate', ensuremultiplelogin, toursController.postBookDate);

router.post(
  '/admin/deleteregistration',
  toursController.postDeleteRegistration
);

router.get('/blog', toursController.getBlog);

router.get('/blogDetails/:id/:title', toursController.getSingleBlog);

router.get(
  '/admin/addblog',
  ensureLoggedIn,
  isAuth,
  toursController.getAddBlog
);

router.post(
  '/admin/addblog',
  ensureLoggedIn,
  isAuth,
  toursController.postAddBlog
);

router.get('/tags/:id', toursController.getTagFilter);

router.post('/search/trip', toursController.getSearchTrip);

router.post('/search/blog', toursController.getSearchBlog);

router.post(
  '/admin/deleteblog',
  ensureLoggedIn,
  isAuth,
  toursController.postDeleteBlog
);

router.post(
  '/admin/editblog',
  ensureLoggedIn,
  isAuth,
  toursController.getEditBlog
);

router.post(
  '/admin/addEditedblog',
  ensureLoggedIn,
  isAuth,
  toursController.postEditblog
);

router.get(
  '/admin/costingcal',
  ensureLoggedIn,
  isAuth,
  toursController.getcalculateCosting
);

router.get(
  '/admin/getStayCost',
  ensureLoggedIn,
  isAuth,
  toursController.getStayCost
);

router.post(
  '/admin/getStayCost',
  ensureLoggedIn,
  isAuth,
  toursController.postStayCost
);

router.post(
  '/admin/deleteStay',
  ensureLoggedIn,
  isAuth,
  toursController.deleteStay
);

router.get(
  '/admin/makepdf',
  ensureLoggedIn,
  isAuth,
  makepdfController.getMakePdf
);

router.post(
  '/admin/makepdf',
  ensureLoggedIn,
  isAuth,
  makepdfController.postMakePdf
);

router.post('/getstateCities', makepdfController.getstateCities);

router.get(
  '/admin/getViewPdfdetails',
  ensureLoggedIn,
  isAuth,
  makepdfController.getViewPdfdetails
);

router.post(
  '/admin/editpdftrip',
  ensureLoggedIn,
  isAuth,
  makepdfController.editPdfDetails
);

router.post(
  '/admin/updatetrip',
  ensureLoggedIn,
  isAuth,
  makepdfController.updatePdfDetails
);

router.post(
  '/admin/deletetrip',
  ensureLoggedIn,
  isAuth,
  makepdfController.deletePdftrip
);


// New Routes for new api 
router.post('/getotp', toursController.getotp);

router.post('/verifyotp', toursController.verifyotp);

router.get("/triplist", toursController.getTours);

router.post("/uploadImage", toursController.uploadImage);

router.post("/getCheckToursUnique", toursController.getCheckToursUnique);

router.post('/admin/updateImageUrl', ensureLoggedIn, isAuth, toursController.updateImageUrl);
router.post('/admin/updateBannerImages', ensureLoggedIn, isAuth, toursController.updateBannerImages);
router.post('/admin/removeBannerImage', ensureLoggedIn, isAuth, toursController.removeBannerImage);

//Old get trip detial route, need to remove after complete all changes
router.get('/tripdetails/:token', toursController.getTourDetails);

//New get trip detial route, based on the trip Id
router.get('/tripdetail/:name', toursController.getTripDetialbyName);

router.get('/bookingTour/:tripid',noCache, validateLogin, toursController.renderBookingTourPage);
router.post('/bookingTour', noCache, validateLogin, toursController.submitBookingTourPage);


router.post("/admin/changeTripStatus", ensureLoggedIn, isAuth, toursController.changeTripStatus);
router.post("/admin/deleteTripDetail", ensureLoggedIn, isAuth, toursController.deleteTrip);


module.exports = router;
