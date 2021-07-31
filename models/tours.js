const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const toursSchema = new Schema({

    name: {
        type: String,
        required: true
      },

    state: {
        type: String,
        required: true
      },

    imageurl: {
        type: String,
        required: true
      },

    bannerimage: {
        type: String,
      },

    destinations: {
        type: String,
        required: true
      },

    route: {
        type: String,
        required: true
      },

    days: {
        type: String,
        required: true
      },
      

    tag: {
        type: String,
        required: true
      },

    price: {
        type: String,
        required: true
      },

    about: {
        type: String,
        required: true
      },

    placestovisit: {
        type: String,
        required: true
      },

    activities: {
        type: String,
        required: true
      },

    itinerary: {
        type: String,
        required: true
      },

    things_to_carry: {
        type: String,
        required: true
      },

    includenexclude: {
        type: String,
        required: true
      },

      package_cost: {
        type: String,
        required: true
      },

      infonfaq: {
        type: String,
        required: true
      },

    Bookncancel: {
        type: String,
        required: true
      },

    guidelines: {
        type: String,
        required: true
      },

    upcomingtrip: {
        type: Array,
      },

    imageUrlAll: {
        type: Array,
        required: true
      },

    youtubeUrl: {
        type: Array,
        required: true
      },
    
}, { timestamps: true });

module.exports = mongoose.model('Tours', toursSchema);