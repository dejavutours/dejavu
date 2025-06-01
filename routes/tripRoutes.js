const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');
const ensureLogIn = require('connect-ensure-login').ensureLoggedIn;
const isAuth = require('../middleware/is-auth');

const ensureLoggedIn = ensureLogIn();
router.get('/trips', ensureLoggedIn, isAuth, tripController.getTrips);
router.post('/trips/update-order', ensureLoggedIn, isAuth, tripController.updateOrder);

module.exports = router;