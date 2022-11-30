const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const staycostSchema = new Schema({

    destination: {
        type: String,
        required: true
      },

    stay_name: {
        type: String,
        required: true
      },

    category: {
        type: String,
        required: true
      },

    stay_cost: {
        type: String,
        required: true
      },

      
}, { timestamps: true });

module.exports = mongoose.model('Staycost', staycostSchema);