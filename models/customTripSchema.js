const mongoose = require('mongoose');

const customTripSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  mobile: {
    type: String,
    required: true,
    trim: true,
    match: /^[0-9]{10}$/, // Validates 10-digit mobile number
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, // Basic email regex
  },
  place: {
    type: String,
    trim: true,
    default: null
  },
  destination: {
    type: String,
    required: true,
    trim: true,
    minlength: 2
  },
  days: {
    type: Number,
    min: 0,
    default: null
  },
  persons: {
    type: Number,
    min: 0,
    default: null
  },
  details: {
    type: String,
    trim: true,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('customTrip', customTripSchema);