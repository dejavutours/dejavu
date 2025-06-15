const express = require('express');
const ensureLogIn = require('connect-ensure-login').ensureLoggedIn;
const isAuth = require('../middleware/is-auth');
const cityController = require('../controllers/cityController');
const stateController = require('../controllers/stateController');

const ensureLoggedIn = ensureLogIn();
const router = express.Router();

router.get('/cities', ensureLoggedIn, isAuth, cityController.getCities);
router.get('/getCityList', ensureLoggedIn, isAuth, cityController.getCityList);
router.post('/cities', ensureLoggedIn, isAuth, cityController.upsertCity);
router.post('/cities/delete/:id', ensureLoggedIn, isAuth, cityController.deleteCity);
router.post('/cities/update-order', ensureLoggedIn, isAuth, cityController.updateCityOrder); // New route for order update


module.exports = router;