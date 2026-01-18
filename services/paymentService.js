const Razorpay = require('razorpay');
const crypto = require('crypto');
const TripBookingDetail = require('../models/TripBookingDetail');
const PaymentLog = require('../models/PaymentLog');
const NewTours = require('../models/newTours');
const { nanoid } = require('nanoid');
const generateReceiptPDF = require('../util/generateReceiptPDF');
const generateInvoicePDF = require('../util/generateInvoicePDF');
const EmailService = require('../util/emailService');
const path = require('path');

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

class PaymentService {
  /**
   * Creates a payment order using Razorpay.
   * @param {string} bookingId - The ID of the booking.
   * @param {number} amount - The payment amount.
   * @param {string} paymentMethod - The payment method (default: 'razorpay').
   * @returns {Promise<Object>} - The created order and payment log ID.
   */
  static async createPaymentOrder(bookingId, amount, paymentMethod = 'razorpay') {
    try {
      const normalizedAmount = Math.round(amount * 100); // Convert to paise
      if (!bookingId || !amount || normalizedAmount <= 0) {
        throw new Error('Invalid input: bookingId and a positive amount are required');
      }

      const booking = await TripBookingDetail.findById(bookingId);
      if (!booking) throw new Error('Booking not found');

      const order = await razorpayInstance.orders.create({
        amount: Math.round(amount * 100), // Convert to paise
        currency: 'INR',
        receipt: nanoid(),
        payment_capture: '1',
      });

      const paymentLog = new PaymentLog({
        bookingId,
        paymentMethod,
        amount,
        paymentDate: new Date(),
        status: 'pending',
        transactionDetails: { orderId: order.id },
      });

      await paymentLog.save();

      return {
        order,
        paymentLogId: paymentLog._id,
      };
    } catch (err) {
      throw new Error(`Failed to create payment order: ${err.message}`);
    }
  }

  /**
   * Verifies a Razorpay payment and updates booking and payment log.
   * @param {string} razorpayOrderId - Razorpay order ID.
   * @param {string} razorpayPaymentId - Razorpay payment ID.
   * @param {string} razorpaySignature - Razorpay signature.
   * @param {string} paymentLogId - The payment log ID.
   * @returns {Promise<Object>} - Result of the payment verification.
   */
  static async verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentLogId) {
    try {
      // Validate inputs
      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !paymentLogId) {
        throw new Error('Missing required fields for payment verification');
      }

      const paymentLog = await PaymentLog.findById(paymentLogId);
      if (!paymentLog) throw new Error('Payment log not found');

      const booking = await TripBookingDetail.findById(paymentLog.bookingId);
      if (!booking) throw new Error('Booking not found');

      const tour = await NewTours.findById(booking.toursSystemId);
      if (!tour) throw new Error('Tour not found');

      // Verify payment signature
      const body = razorpayOrderId + '|' + razorpayPaymentId;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

      if (expectedSignature === razorpaySignature) {
        // Payment successful
        paymentLog.status = 'success';
        paymentLog.transactionDetails.paymentId = razorpayPaymentId;
        await paymentLog.save();

        // Update booking payment details
        booking.paidAmount += paymentLog.amount;
        booking.duePayment = booking.totalTripCostWithGST - booking.paidAmount;
        booking.paymentStatus = booking.duePayment > 0 ? 'Partial' : 'Paid';
        booking.bookingStatus = 'Confirmed';
        await booking.save();

        // Generate receipt with the new folder structure
        const receiptFileName = `receipt_${booking.bookingNumber}_${booking._id}_${paymentLog._id}.pdf`;
        const receiptPath = path.join(__dirname, '..', 'paymentdocs', 'receipts', receiptFileName);
        await generateReceiptPDF(booking, tour, paymentLog, receiptPath);
        paymentLog.receiptPath = receiptPath;
        await paymentLog.save();

        // Generate or update invoice (single invoice strategy)
        if (!booking.invoicePath) {
          // First payment: generate a new invoice
          const invoiceFileName = `invoice_${booking.bookingNumber}_${booking._id}.pdf`;
          const invoicePath = path.join(__dirname, '..', 'paymentdocs', 'invoices', invoiceFileName);
          await generateInvoicePDF(booking, tour, invoicePath);
          booking.invoicePath = invoicePath;
        } else {
          // Subsequent payment: update the existing invoice
          await generateInvoicePDF(booking, tour, booking.invoicePath);
        }
        await booking.save();
         // Send email notifications
         await EmailService.sendBookingConfirmation(booking, tour, paymentLog);
         await EmailService.sendAdminNotification(booking, tour, paymentLog);

        return { success: true, booking };
      } else {
        // Payment failed
        paymentLog.status = 'failed';
        await paymentLog.save();

        booking.paymentStatus = 'Failed';
        booking.bookingStatus = 'Cancelled';
        await booking.save();

        return { success: false, message: 'Payment verification failed' };
      }
    } catch (err) {
      throw new Error(`Failed to verify payment: ${err.message}`);
    }
  }

}

module.exports = PaymentService;