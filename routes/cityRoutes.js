const express = require("express");
const ensureLogIn = require('connect-ensure-login').ensureLoggedIn;
const multer = require('multer');
const path = require('path');
const isAuth = require('../middleware/is-auth');
const cityController = require('../controllers/cityController');

const ensureLoggedIn = ensureLogIn();

const router = express.Router();

router.get('/cities', ensureLoggedIn, isAuth, cityController.getCities);
router.get('/getCityList', ensureLoggedIn, isAuth, cityController.getCityList);
// router.post('/cities', ensureLoggedIn, isAuth, cityController.addCity);
router.post('/cities', ensureLoggedIn, isAuth, cityController.upsertCity);
router.post('/cities/delete/:id', ensureLoggedIn, isAuth, cityController.deleteCity);

module.exports = router;
