const mongoose = require('mongoose');

const Schema = mongoose.Schema;

// BookingLead: Stores booking leads from "Book Now, Pay Later" requests
const BookingLeadSchema = new Schema(
  {
    // Reference to the tour in the NewTours collection
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NewTours',
      required: true,
    },

    // User identifier (optional, for logged-in users)
    userId: {
      type: String,
      default: null,
    },

    // Guest information (for non-logged-in users)
    guestName: {
      type: String,
      trim: true,
    },
    guestPhone: {
      type: String,
      match: [/^\+?\d{10,15}$/, 'Phone number must be 10-15 digits'],
    },
    guestEmail: {
      type: String,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address'],
    },

    // Transport type selected (e.g., Flight, Train)
    transportType: {
      type: String,
      required: true,
    },

    // City from where the user will join the trip
    joiningFrom: {
      type: String,
      required: true,
    },

    // Selected travel date range (start and end dates)
    tripStartDate: {
      type: Date,
      required: true,
    },
    tripEndDate: {
      type: Date,
      required: true,
    },

    // Total number of persons in the booking
    totalPerson: {
      adult: { type: Number, required: true, min: 1 },
      child: { type: Number, required: true, min: 0 },
    },

    // Details of each person in the booking
    personDetails: [
      {
        firstName: {
          type: String,
          required: true,
          match: [/^[A-Za-z\s]+$/, 'First name must contain only letters and spaces'],
        },
        surname: {
          type: String,
          validate: {
            validator: function(v) {
              return v && v.trim().length > 0;
            },
            message: 'Surname is required'
          },
        },
        gender: {
          type: String,
    
          enum: ['Male', 'Female', 'Other'],
        },
        birthdate: {
          type: Date,
          validate: {
            validator: function (v) {
              return v <= new Date();
            },
            message: 'Birthdate must be in the past',
          },
        },
        phone: {
          type: String,
          required: true,
          match: [/^\+?\d{10,15}$/, 'Phone number must be 10-15 digits'],
        },
        altphone: {
          type: String,
          match: [/^\+?\d{10,15}$/, 'Alternate phone number must be 10-15 digits'],
        },
        isAdult: { type: Boolean, required: true },
      },
    ],

    // Calculated prices
    totalTripCost: {
      type: Number,
      required: true,
      min: 0,
    },
    totalTripCostWithGST: {
      type: Number,
      required: true,
      min: 0,
    },

    // Lead status management
    leadStatus: {
      type: String,
      enum: ['pending', 'contacted', 'converted', 'rejected', 'expired'],
      default: 'pending',
    },

    // Callback request flag
    callbackRequested: {
      type: Boolean,
      default: false,
    },

    // Admin notes
    adminNotes: {
      type: String,
      default: '',
    },

    // Reference to converted booking (if converted)
    convertedToBookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TripBookingDetail',
      default: null,
    },

    // Who created this lead
    createdBy: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
  },
  {
    collection: 'booking_leads',
    versionKey: false,
    timestamps: true,
  }
);

// Indexes for better query performance
BookingLeadSchema.index({ tripId: 1 });
BookingLeadSchema.index({ userId: 1 });
BookingLeadSchema.index({ leadStatus: 1 });
BookingLeadSchema.index({ createdAt: -1 });

module.exports = mongoose.models.BookingLead || mongoose.model('BookingLead', BookingLeadSchema);

