const express = require("express");
const ensureLogIn = require('connect-ensure-login').ensureLoggedIn;
const isAuth = require('../middleware/is-auth');
const stateController = require('../controllers/stateController');

const ensureLoggedIn = ensureLogIn();
const router = express.Router();

router.get('/states', ensureLoggedIn, isAuth, stateController.getAllStates);
router.get('/getStateList', ensureLoggedIn, isAuth, stateController.getStateList);
router.post('/states/check-trips', ensureLoggedIn, isAuth, stateController.checkActiveTrips);
router.post('/states', ensureLoggedIn, isAuth, stateController.upsertState);
router.post('/states/delete/:id', ensureLoggedIn, isAuth, stateController.deleteState);
router.post('/states/update-order', ensureLoggedIn, isAuth, stateController.updateStateOrder);

module.exports = router;