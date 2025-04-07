const mongoose = require('mongoose');

// TripBookingDetail: Stores details of trip bookings made by specific users.
const TripBookingDetailSchema = new mongoose.Schema(
  {
    // Unique identifier for each trip booking
    _id: mongoose.Schema.Types.ObjectId,

    // User ID from users collection
    userId: { type: String },

    // Temporary user identifier (mobile ID or Gmail ID)
    tempUserID: { type: String },

    // Tour system ID derived from the tours collection. It will be useful for redirection to the tours page.
    toursSystemId: { type: String },

    // Trip name derived from tours collection
    tripName: { type: String, required: true },

    // Trip code derived from tours collection
    tripCode: { type: String, required: true },

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
        name: { type: String, required: true },
        birthdate: { type: Date, required: true },
        phone:{ type: Number, required:false },
        age: { type: Number, required: true }, // Auto-calculated based on birthdate
        isAdult: { type: Boolean, required: true }, // True if age >= 10
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
        isThroughPymtGateway: { type: Boolean, required: true }, // True if online, false if offline
        orderId: { type: String }, // Derived from payment collection
        paymentDate: { type: Date }, // Date of offline payment
        amount: { type: Number, required: true }, // Paid amount in this transaction
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

module.exports = mongoose.model('TripBookingDetail', TripBookingDetailSchema);
