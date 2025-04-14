const mongoose = require('mongoose');

// TripBookingDetail: Stores details of trip bookings made by specific users.
const TripBookingDetailSchema = new mongoose.Schema(
  {
    // Identifier of the user who made the booking, references the users collection
    userId: { type: String },

    // Temporary identifier for non-registered users (e.g., mobile ID or Gmail ID)
    tempUserID: { type: String },

    // Reference to the tour in the NewTours collection, links booking to tour details
    toursSystemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NewTours',
      required: true,
    },

    // Unique auto-generated booking number in format "DJV<YY><MM><###>"
    bookingNumber: { type: String, required: true, unique: true },

    // Total number of persons in the booking, split into adults and children
    totalPerson: {
      // Number of adult travelers
      adult: { type: Number, required: true },
      // Number of child travelers
      child: { type: Number, required: true },
    },

    // Array of details for each person in the booking
    personDetails: [
      {
        // First name of the person
        firstName: { type: String, required: true },
        // Surname of the person
        surname: { type: String, required: true },
        // Gender of the person
        gender: { type: String, required: true },
        // Date of birth of the person
        birthdate: { type: Date, required: true },
        // Primary phone number of the person
        phone: { type: Number, required: true },
        // Alternate phone number of the person (optional)
        altphone: { type: Number, required: false },
        // Age of the person, auto-calculated from birthdate (optional)
        age: { type: Number, required: false },
        // Indicates if the person is an adult (age >= 10), auto-calculated
        isAdult: { type: Boolean, required: false },
      },
    ],

    // Location from where the user will join the trip
    joiningFrom: { type: String, required: true },

    // Status of the booking: 'Reserved' (partial payment) or 'Confirmed' (full payment)
    bookingStatus: {
      type: String,
      enum: ['Reserved', 'Confirmed'],
      required: true,
    },

    // Total amount paid by the user for the booking
    paidAmount: { type: Number, required: true },

    // Array of payment transaction references
    paidAmountRef: [
      {
        // Indicates if payment was made via payment gateway (true) or offline (false)
        isThroughPymtGateway: { type: Boolean, required: false },
        // Order ID from the payment gateway or system
        orderId: { type: String },
        // Date when the payment was made
        paymentDate: { type: Date },
        // Amount paid in this transaction
        amount: { type: Number, required: false },
      },
    ],

    // Remaining amount to be paid, auto-calculated
    duePayment: { type: Number },

    // Payment status: 'Partial' (some amount paid) or 'Paid' (fully paid)
    paymentStatus: {
      type: String,
      enum: ['Partial', 'Paid'],
      required: true,
    },
  },
  {
    // MongoDB collection name
    collection: 'trip_booking_detail',
    // Disable versioning field (__v)
    versionKey: false,
    // Automatically add createdAt and updatedAt timestamps
    timestamps: true,
  }
);

// Pre-validate hook to auto-generate bookingNumber if not set
TripBookingDetailSchema.pre('validate', async function (next) {
  // Skip if bookingNumber is already set
  if (this.bookingNumber) return next();

  const now = new Date();
  // Get last 2 digits of the year
  const yy = now.getFullYear().toString().slice(-2);
  // Get 2-digit month
  const mm = (now.getMonth() + 1).toString().padStart(2, '0');
  // Booking number prefix: DJV + year + month
  const prefix = `DJV${yy}${mm}`;

  try {
    // Find the latest booking for the current year and month
    const lastBooking = await this.constructor
      .findOne({
        bookingNumber: { $regex: `^${prefix}` },
      })
      .sort({ bookingNumber: -1 });

    let nextIncrement = 1;

    // If a booking exists, increment the numeric part
    if (lastBooking) {
      const lastNumber = lastBooking.bookingNumber;
      const incrementStr = lastNumber.slice(prefix.length); // Extract numeric part
      const lastIncrement = parseInt(incrementStr, 10);
      nextIncrement = lastIncrement + 1;
    }

    // Set bookingNumber: prefix + 4-digit increment
    this.bookingNumber = `${prefix}${String(nextIncrement).padStart(4, '0')}`;
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('TripBookingDetail', TripBookingDetailSchema);