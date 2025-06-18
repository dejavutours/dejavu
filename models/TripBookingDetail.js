const mongoose = require('mongoose');

const Schema = mongoose.Schema;

// TripBookingDetail: Stores details of trip bookings made by users
const TripBookingDetailSchema = new Schema(
  {
    // User identifier, references the users collection (mobileuser or gmailuser)
    userId: { type: String },

    // Reference to the tour in the NewTours collection
    toursSystemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NewTours',
      required: true,
    },

    // Transport type selected (e.g., Flight, Train)
    transportType: { type: String, required: true },

    // Unique auto-generated booking number (e.g., "DJV<YY><MM><###>")
    bookingNumber: { type: String, required: true, unique: true },

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
          required: true,
          match: [/^[A-Za-z\s]+$/, 'Surname must contain only letters and spaces'],
        },
        gender: {
          type: String,
          required: true,
          enum: ['Male', 'Female', 'Other'],
        },
        birthdate: {
          type: Date,
          required: true,
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
    // City from where the user will join the trip
    joiningFrom: { type: String, required: true },

    // Selected travel date range (start and end dates)
    tripStartDate: { type: Date, required: true },
    tripEndDate: { type: Date, required: true },
    totalTripCost: { type: Number, required: true, min: 0 }, // Total cost (excluding GST)
    // Total cost of the trip for all travelers
    totalTripCostWithGST: { type: Number, required: true, min: 0 }, // Total cost including GST
    paidAmount: { type: Number, default: 0, min: 0 }, // Sum of all successful payments
    duePayment: { type: Number, default: 0, min: 0 }, // Remaining amount (including GST)
    bookingStatus: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Cancelled'],
      default: 'Pending',
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Partial', 'Paid', 'Failed'],
      default: 'Pending',
    },
    email: {
      type: String,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address'],
    },
    invoicePath: { type: String }, // Path to the latest invoice PDF
  },
  {
    collection: 'trip_booking_detail',
    versionKey: false,
    timestamps: true,
  }
);

// Pre-validate hook to auto-generate bookingNumber (unchanged)
TripBookingDetailSchema.pre('validate', async function (next) {
  if (this.bookingNumber) return next();

  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = (now.getMonth() + 1).toString().padStart(2, '0');
  const prefix = `DJV${yy}${mm}`;

  try {
    const lastBooking = await this.constructor
      .findOne({ bookingNumber: { $regex: `^${prefix}` } })
      .sort({ bookingNumber: -1 });

    let nextIncrement = 1;
    if (lastBooking) {
      const lastNumber = lastBooking.bookingNumber;
      const incrementStr = lastNumber.slice(prefix.length);
      const lastIncrement = parseInt(incrementStr, 10);
      nextIncrement = lastIncrement + 1;
    }

    this.bookingNumber = `${prefix}${String(nextIncrement).padStart(4, '0')}`;
    next();
  } catch (err) {
    next(err);
  }
});

TripBookingDetailSchema.index({ bookingNumber: 1 });

module.exports = mongoose.models.TripBookingDetail || mongoose.model('TripBookingDetail', TripBookingDetailSchema);