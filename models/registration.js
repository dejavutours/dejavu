const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const registrationSchema = new Schema({


    emailid: {
        type: String,
        required: true
      },

    name: {
        type: String,
        required: true
      },

    gender: {
        type: String,
        required: true
      },

    birthdate: {
        type: String,
        required: true
      },

    contact: {
        type: String,
        required: true
      },

    destination: {
        type: String,
        required: true
      },

    tripdate: {
        type: String,
        required: true
      },

    travellers: {
      type: String,
        required: true
    },

    // idproof: {
    //     type: String,
    //     required: true
    //   }
   
});

module.exports = mongoose.model('Registration', registrationSchema);