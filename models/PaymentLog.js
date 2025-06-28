const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const PaymentLogSchema = new Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TripBookingDetail',
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['razorpay', 'cash', 'bank_transfer', 'other'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed'],
      default: 'pending',
    },
    transactionDetails: {
      orderId: { type: String }, // For payment gateways like Razorpay
      paymentId: { type: String }, // For payment gateways
      referenceId: { type: String }, // For manual methods (e.g., bank transaction ID)
      notes: { type: String }, // Additional details (e.g., "Paid in cash to admin")
    },
    receiptPath: { type: String }, // Path to generated receipt PDF
  },
  {
    collection: 'payment_logs',
    timestamps: true,
  }
);

module.exports = mongoose.models.PaymentLog || mongoose.model('PaymentLog', PaymentLogSchema);