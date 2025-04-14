// Imports
var express = require("express");
var router = express.Router();
const Razorpay = require("razorpay");
const PaymentDetail = require("../models/payment-detail");
const { nanoid } = require("nanoid");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create Razorpay Order
router.post('/order', async (req, res) => {
  try {
    const { amount, bookingId } = req.body;
    if (!amount || !bookingId) {
      return res.status(400).json({ success: false, message: 'Amount and bookingId are required' });
    }

    const booking = await TripBookingDetail.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (parseFloat(amount).toFixed(2) !== parseFloat(booking.paidAmount).toFixed(2)) {
      return res.status(400).json({ success: false, message: 'Amount mismatch with booking' });
    }

    const options = {
      amount: Math.round(parseFloat(amount) * 100), // Convert to paise
      currency: 'INR',
      receipt: `receipt_${bookingId}`
    };

    const order = await razorpay.orders.create(options);
    return res.status(200).json({
      success: true,
      orderId: order.id,
      amount: options.amount,
      currency: options.currency
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create payment order',
      error: error.message
    });
  }
});

// Verify Payment
router.post('/verify', async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, bookingId } = req.body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !bookingId) {
      return res.status(400).json({ success: false, message: 'Missing payment details' });
    }

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    // Update booking
    const booking = await TripBookingDetail.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    booking.paymentStatus = 'Completed';
    booking.bookingStatus = 'Confirmed';
    booking.paidAmountRef = razorpay_payment_id;
    booking.updatedAt = new Date();
    await booking.save();

    return res.status(200).json({
      success: true,
      message: 'Payment verified and booking confirmed'
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify payment',
      error: error.message
    });
  }
});

module.exports = router;
