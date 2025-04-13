// Imports
var express = require("express");
var router = express.Router();
const Razorpay = require("razorpay");
const PaymentDetail = require("../models/payment-detail");
const { nanoid } = require("nanoid");

// Create an instance of Razorpay
let razorPayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Make Donation Page
 *
 */
// router.get('/', function(req, res, next) {
// 	// Render form for accepting amount
// 	res.render('pages/payment/order', {
// 		title: 'Donate for Animals'
// 	});
// });

/**
 * Create Payment Order
 */
router.post("/order", function (req, res, next) {
  // Validate and format the tripdate
  let tripdate;
  try {
    // Parse the date string which is in format "09 Sep 2025 to 12 Sep 2025"
    const dateString = req.body.tripdate;
    // Extract the start date (first part before "to")
    const startDateStr = dateString.split(' to ')[0];
    // Parse the date using the format "DD MMM YYYY"
    const [day, month, year] = startDateStr.split(' ');
    const monthMap = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
      'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };
    // Create a proper date string in YYYY-MM-DD format
    const formattedDate = `${year}-${monthMap[month]}-${day.padStart(2, '0')}`;
    tripdate = new Date(formattedDate);
    
    // Validate if it's a valid date
    if (isNaN(tripdate.getTime())) {
      throw new Error('Invalid date format');
    }
  } catch (error) {
    console.error('Date parsing error:', error);
    return res.status(400).json({
      success: false,
      message: "Invalid date format for trip date"
    });
  }

  params = {
    amount: req.body.cost * 100,
    currency: "INR",
    receipt: nanoid(),
    payment_capture: "1",
  };
  razorPayInstance.orders
    .create(params)
    .then(async (response) => {
      const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
      // Save orderId and other payment details
      const paymentDetail = new PaymentDetail({
        orderId: response.id,
        receiptId: response.receipt,
        amount: response.amount,
        currency: response.currency,
        createdAt: response.created_at,
        status: response.status,
        name: req.body.name,
        email: req.body.email,
        travellers: req.body.travellers,
        cost: req.body.cost,
        contact: Number(req.body.contact.replace(/\s/g, "")),
        destination: req.body.destination,
        tripdate: tripdate, // Use the properly formatted date
      });
      try {
        // Save payment details
        await paymentDetail.save();
        res.json({
          success: true,
          razorpayKeyId: razorpayKeyId,
          paymentDetail: paymentDetail
        });
      } catch (err) {
        console.log(err);
        res.status(500).json({
          success: false,
          message: "Failed to save payment details"
        });
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({
        success: false,
        message: "Failed to create payment order"
      });
    });
});

/**
 * Verify Payment
 */
router.post("/verify", async function (req, res, next) {
  try {
    console.log('Payment verification request received:', req.body);
    
    // Validate required fields
    if (!req.body.razorpay_order_id || !req.body.razorpay_payment_id || !req.body.razorpay_signature) {
      console.error('Missing required fields in verification request');
      return res.status(400).json({
        success: false,
        message: "Missing required payment verification fields"
      });
    }

    // Check if order exists
    const existingOrder = await PaymentDetail.findOne({ orderId: req.body.razorpay_order_id });
    if (!existingOrder) {
      console.error('Order not found:', req.body.razorpay_order_id);
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // Generate signature
    const body = req.body.razorpay_order_id + "|" + req.body.razorpay_payment_id;
    console.log('Signature body:', body);
    
    const crypto = require("crypto");
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    console.log('Expected signature:', expectedSignature);
    console.log('Received signature:', req.body.razorpay_signature);

    // Compare signatures
    if (expectedSignature === req.body.razorpay_signature) {
      console.log('Signature verification successful');
      
      // Update payment status
      const updatedPayment = await PaymentDetail.findOneAndUpdate(
        { orderId: req.body.razorpay_order_id },
        {
          paymentId: req.body.razorpay_payment_id,
          signature: req.body.razorpay_signature,
          status: "paid",
        },
        { new: true }
      );

      if (!updatedPayment) {
        console.error('Failed to update payment status');
        return res.status(500).json({
          success: false,
          message: "Failed to update payment status"
        });
      }

      console.log('Payment updated successfully:', updatedPayment);
      return res.json({
        success: true,
        message: "Payment verified successfully"
      });
    } else {
      console.error('Signature verification failed');
      return res.status(400).json({
        success: false,
        message: "Payment verification failed - Invalid signature"
      });
    }
  } catch (error) {
    console.error('Error in payment verification:', error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during payment verification"
    });
  }
});

module.exports = router;
