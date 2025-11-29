const express = require('express');
const router = express.Router();
const toursController = require('../controllers/tripController');
const ensureLogIn = require('connect-ensure-login').ensureLoggedIn;

const isAuth = require('../middleware/is-auth');
const validateLogin = require('../middleware/validateLogin');

const ensureLoggedIn = ensureLogIn();
router.get('/trips', ensureLoggedIn, isAuth, toursController.getTrips);
router.post('/trips/update-order', ensureLoggedIn, isAuth, toursController.updateOrder);

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

router.get('/admin/addtours',ensureLoggedIn,isAuth,toursController.getAddTours);

router.post('/admin/postNewAddTours', ensureLoggedIn, isAuth, toursController.postNewAddTours);

router.post('/admin/login', toursController.postAdminLogin);

router.post('/admin/logout', ensureLoggedIn, isAuth, toursController.postLogout);



// New Routes for new api 
router.post('/getotp', toursController.getotp);

router.post('/verifyotp', toursController.verifyotp);

router.get("/triplist", toursController.getTours);

router.post("/uploadImage", toursController.uploadImage);

router.post("/getCheckToursUnique", toursController.getCheckToursUnique);

router.post('/admin/updateImageUrl', ensureLoggedIn, isAuth, toursController.updateImageUrl);
router.post('/admin/updateBannerImages', ensureLoggedIn, isAuth, toursController.updateBannerImages);
router.post('/admin/removeBannerImage', ensureLoggedIn, isAuth, toursController.removeBannerImage);

//New get trip detial route, based on the trip Id
router.get('/tripdetail/:name', toursController.getTripDetialbyName);

router.get('/bookingTour/:tripid',noCache, validateLogin, toursController.renderBookingTourPage);
router.post('/bookingTour', noCache, validateLogin, toursController.submitBookingTourPage);


router.post("/admin/changeTripStatus", ensureLoggedIn, isAuth, toursController.changeTripStatus);
router.post("/admin/deleteTripDetail", ensureLoggedIn, isAuth, toursController.deleteTrip);

module.exports = router;