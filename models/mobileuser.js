const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const MobileUserSchema = new Schema({


  phoneNumber: {
        type: Number,
        required: true
      },

    otpExpiration: {
        type: Date,
        required: true
      },
    
    otp:{
      type: Number,
      required: true
    },

    paymentids:{
      type: Array,
      required: true
    }

      
});

module.exports = mongoose.model('mobileuser', MobileUserSchema);