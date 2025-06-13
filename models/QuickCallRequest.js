const mongoose = require('mongoose');

const quickCallRequestSchema = new mongoose.Schema({
  guestName: {
    type: String,
    required: true,
    trim: true
  },
  mobileNo: {
    type: String,
    required: true,
    trim: true
  },
  tripId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NewTours',
    required: true
  },
  responded: {
    type: Boolean,
    default: false
  },
  markAsSpam: {
    type: Boolean,
    default: false
  },
  requestedDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('QuickCallRequest', quickCallRequestSchema);