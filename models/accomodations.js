const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const accomodationsSchema = new Schema({

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

    destinations: {
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

    bannerimage: {
        type: String,
      },

    nearbyPlaces: {
        type: String,
        required: true
      },

    Activities: {
        type: String,
        required: true
      },

    Amenities: {
        type: String,
        required: true
      },

    Package: {
        type: String,
        required: true
      },

    bookncancel: {
        type: String,
        required: true
      },

    guidelines: {
        type: String,
        required: true
      },

    imageUrlAll: {
        type: Array,
        required: true
      },

    youtubeUrl: {
        type: Array,
        required: true
      }

      
}, { timestamps: true });

module.exports = mongoose.model('Accomodations', accomodationsSchema);