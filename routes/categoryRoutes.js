const express = require("express");
const ensureLogIn = require('connect-ensure-login').ensureLoggedIn;
const isAuth = require('../middleware/is-auth');
const categoryController = require('../controllers/categoryController');

const ensureLoggedIn = ensureLogIn();
const router = express.Router();

router.get('/categories', ensureLoggedIn, isAuth, categoryController.getAllCategories);
router.get('/getCategoryList', ensureLoggedIn, isAuth, categoryController.getCategoryList);
router.post('/categories', ensureLoggedIn, isAuth, categoryController.upsertCategory);
router.post('/categories/delete/:id', ensureLoggedIn, isAuth, categoryController.deleteCategory);
router.post('/categories/update-order', ensureLoggedIn, isAuth, categoryController.updateCategoryOrder);
router.post('/categories/check-trips', ensureLoggedIn, isAuth, categoryController.checkActiveTrips);

module.exports = router;