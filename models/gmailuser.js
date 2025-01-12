const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const GmailUserSchema = new Schema({
  id: {
    type: String,
    required: true,
  },

  name: {
    type: String,
    required: true,
  },

  email: { type: String, required: true, unique: true },

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

module.exports = mongoose.model('Gmailuser', GmailUserSchema);
