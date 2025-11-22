// routes/displayOrderRoutes.js
const express = require("express");
const router = express.Router();
const displayOrderController = require('../controllers/displayOrderController');
const isAuth = require('../middleware/is-auth');

router.get('/admin/category-trip-order',  isAuth, displayOrderController.getCategoryTripOrderPage);
router.get('/api/category-trips',  isAuth, displayOrderController.getTripsForCategory);
router.post('/api/save-category-trip-order',  isAuth, displayOrderController.saveCategoryTripOrder);

module.exports = router;