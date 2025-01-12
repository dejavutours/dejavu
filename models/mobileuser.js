const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const MobileUserSchema = new Schema({
  phoneNumber: { type: String, required: true, unique: true },

  otpExpiration: {
    type: Date,
    required: true,
  },

  otp: {
    type: Number,
    required: true,
  },

  paymentids: {
    type: Array,
    required: true,
  },

  details: {
    firstName: String,
    lastName: String,
    email: String,
    birthDate: Date,
    gender: { type: String, enum: ['male', 'female', 'other'] },
    mobileNumber: String,
    alternateNumber: String,
    state: String,
    city: String,
  },
});

module.exports = mongoose.model('Mobileuser', MobileUserSchema);
