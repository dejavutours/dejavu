const express = require("express");
const ensureLogIn = require('connect-ensure-login').ensureLoggedIn;
const isAuth = require('../middleware/is-auth');
const bannerController = require('../controllers/bannerController');

const ensureLoggedIn = ensureLogIn();
const router = express.Router();

router.get('/banner', ensureLoggedIn, isAuth, bannerController.getAllBanners);
router.get('/getBannerList', ensureLoggedIn, isAuth, bannerController.getBannerList);
router.post('/banner', ensureLoggedIn, isAuth, bannerController.upsertBanner);
router.post('/banner/delete/:id', ensureLoggedIn, isAuth, bannerController.deleteBanner);
router.post('/banner/update-order', ensureLoggedIn, isAuth, bannerController.updateBannerOrder);

module.exports = router;