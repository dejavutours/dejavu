const express = require('express');
const ensureLogIn = require('connect-ensure-login').ensureLoggedIn;
const isAuth = require('../middleware/is-auth');
const cityController = require('../controllers/cityController');
const stateController = require('../controllers/stateController');

const ensureLoggedIn = ensureLogIn();
const router = express.Router();
const getstateCities = (req, res, next) => {
    var config = require("../json/statecities.json");
    let state_arr = config;
    let states_arr = "";
    for (const property in state_arr) {
      if (property == req.body.state) {
        states_arr = "";
        states_arr = state_arr[req.body.state];
        break;
      }
    }
    res.json({ cities: states_arr });
  };

router.get('/cities', ensureLoggedIn, isAuth, cityController.getCities);
router.get('/getCityList', ensureLoggedIn, isAuth, cityController.getCityList);
router.post('/cities', ensureLoggedIn, isAuth, cityController.upsertCity);
router.post('/cities/delete/:id', ensureLoggedIn, isAuth, cityController.deleteCity);
router.post('/cities/update-order', ensureLoggedIn, isAuth, cityController.updateCityOrder); // New route for order update
router.post('/getstateCities',getstateCities);


  


module.exports = router;