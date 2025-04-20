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
      adult: { type: Number, required: true },
      child: { type: Number, required: true },
    },

    // Details of each person in the booking
    personDetails: [
      {
        firstName: { type: String, required: true },
        surname: { type: String, required: true },
        gender: { type: String, required: true, enum: ['Male', 'Female', 'Other'] },
        birthdate: { type: Date, required: true },
        phone: { type: String, required: true },
        altphone: { type: String },
        isAdult: { type: Boolean },
      },
    ],

    // City from where the user will join the trip
    joiningFrom: { type: String, required: true },

    // Selected travel date range (start and end dates)
    tripStartDate: { type: Date, required: true },
    tripEndDate: { type: Date, required: true },

    // Total cost of the trip for all travelers
    totalTripCost: { type: Number, required: true },

    // Booking status: 'Pending' (awaiting payment), 'Confirmed' (payment complete), 'Cancelled'
    // Booking status: Reserved (partial payment) or Confirmed (full payment)
    bookingStatus: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Cancelled'],
      default: 'Pending',
    },

    // Amount paid by the user
    paidAmount: { type: Number, default: 0 },

    // Payment transaction references
    paidAmountRef: [
      {
        isThroughPymtGateway: { type: Boolean, default: true },
        orderId: { type: String },
        paymentId: { type: String },
        paymentDate: { type: Date },
        amount: { type: Number },
      },
    ],

    // Remaining amount to be paid
    duePayment: { type: Number, default: 0 },

    // Payment status: 'Pending', 'Partial', 'Paid', 'Failed'
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Partial', 'Paid', 'Failed'],
      default: 'Pending',
    },
  },
  {
    collection: 'trip_booking_detail',
    versionKey: false,
    timestamps: true,
  }
);

// Pre-validate hook to auto-generate bookingNumber
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

// Export the model, reusing existing model if already compiled
module.exports = mongoose.models.TripBookingDetail || mongoose.model('TripBookingDetail', TripBookingDetailSchema);