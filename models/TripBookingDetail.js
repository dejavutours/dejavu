const mongoose = require('mongoose');

// TripBookingDetail: Stores details of trip bookings made by specific users.
const TripBookingDetailSchema = new mongoose.Schema(
  {
    // Unique identifier for each trip booking
   // _id: mongoose.Schema.Types.ObjectId,

    // User ID from users collection
    userId: { type: String },

    // Temporary user identifier (mobile ID or Gmail ID)
    tempUserID: { type: String },

    // Tour system ID derived from the tours collection. It will be useful for redirection to the tours page.
    toursSystemId: { type: String },

    // Trip name derived from tours collection
    tripName: { type: String, required: false },

    // Trip code derived from tours collection
    tripCode: { type: String, required: false },

    // Tour Image derived from tours collection
    imageName: { type: String },

    // Auto-generated booking number in format "DJV<YY><MM><###>"
    bookingNumber: { type: String, required: true, unique: true },

    // Total persons count
    totalPerson: {
      adult: { type: Number, required: true },
      child: { type: Number, required: true },
    },

    // Array storing all person booking details
    personDetails: [
      {
        firstName: { type: String, required: true },
        surname: { type: String, required: true },
        gender: { type: String, required: true },
        birthdate: { type: Date, required: true },
        phone:{ type: Number, required:true },
        altphone: { type: Number, required: false },
        age: { type: Number, required: false }, // Auto-calculated based on birthdate
        isAdult: { type: Boolean, required: false }, // True if age >= 10
      },
    ],

    // Indicates from where the user will join the trip
    joiningFrom: { type: String, required: true },

    // Booking status: Reserved (partial payment) or Confirmed (full payment)
    bookingStatus: {
      type: String,
      enum: ['Reserved', 'Confirmed'],
      required: true,
    },

    // Total trip cost
    totalTripCost: { type: Number, required: true },

    // Total amount paid by the user
    paidAmount: { type: Number, required: true },

    // Array storing payment references
    paidAmountRef: [
      {
        isThroughPymtGateway: { type: Boolean, required: false }, // True if online, false if offline
        orderId: { type: String }, // Derived from payment collection
        paymentDate: { type: Date }, // Date of offline payment
        amount: { type: Number, required: false }, // Paid amount in this transaction
      },
    ],

    // Due Payment. Auto calculated field.
    duePayment: { type: Number },

    // Represent Payment Status
    paymentStatus: {
      type: String,
      enum: ['Partial', 'Paid'],
      required: true,
    },

    // Start date of the trip
    tripStartDate: { type: Date, required: true },

    // End date of the trip
    tripEndDate: { type: Date, required: true },
  },
  {
    collection: 'trip_booking_detail', // Collection name in MongoDB
    versionKey: false,
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);


TripBookingDetailSchema.pre('validate', async function (next) {
  if (this.bookingNumber) return next(); // already set

  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2); // last 2 digits of year
  const mm = (now.getMonth() + 1).toString().padStart(2, '0'); // 2-digit month
  const prefix = `DJV${yy}${mm}`;

  try {
    // Find the latest booking for current year & month
    const lastBooking = await this.constructor.findOne({
      bookingNumber: { $regex: `^${prefix}` }
    }).sort({ bookingNumber: -1 });

    let nextIncrement = 1;

    if (lastBooking) {
      const lastNumber = lastBooking.bookingNumber;
      const incrementStr = lastNumber.slice(prefix.length); // get the numeric part after prefix
      const lastIncrement = parseInt(incrementStr, 10);
      nextIncrement = lastIncrement + 1;
    }
    this.bookingNumber = `${prefix}${String(nextIncrement).padStart(4, '0')}`;
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('TripBookingDetail', TripBookingDetailSchema);
