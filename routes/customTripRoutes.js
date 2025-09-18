const express = require('express');
const router = express.Router();
const ensureLogIn = require('connect-ensure-login').ensureLoggedIn;
const isAuth = require('../middleware/is-auth');
const customTripController = require('../controllers/customTripController');
const ensureLoggedIn = ensureLogIn();
router.get('/customTrip',  ensureLoggedIn, isAuth, customTripController.getCustomTrips);
router.post('/customTrip/delete/:id',  ensureLoggedIn, isAuth, customTripController.deleteCustomTrip);
router.post('/customTrip/bulk-delete',  ensureLoggedIn, isAuth, customTripController.bulkDeleteCustomTrips);
router.get('/dreamtrip', customTripController.getCustomezedTripForm);
router.post('/customTrip', customTripController.customTrip);

module.exports = router;