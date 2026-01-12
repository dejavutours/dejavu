const mobileuser = require('../models/mobileuser');
const gmailuser = require('../models/gmailuser');
const TripBookingDetail = require('../models/TripBookingDetail');
const PaymentLog = require('../models/PaymentLog');
const PaymentService = require('../services/paymentService');
const { formatMongoDateForUIAsYYYYMMMDD, formatMongoDateForUIAsYYYYMMDD } = require('../util/UtilityService');
const fs = require('fs');
const path = require('path');

// Handler to update the user's profile based on phone number or email
exports.updateUserProfile = async (req, res, next) => {
  try {
    let updatedUser = null;

    if (req.verifiedPhoneNumber) {
      const existingUser = await mobileuser.findOne({ phoneNumber: req.verifiedPhoneNumber });
      updatedUser = await mobileuser.findOneAndUpdate(
        { phoneNumber: req.verifiedPhoneNumber },
        {
          details: {
            ...existingUser?.details,
            ...req.body,
            birthDate: existingUser?.details?.birthDate || req.body.birthDate,
            gender: existingUser?.details?.gender || req.body.gender
          }
        },
        { new: true }
      );
    }

    if (!updatedUser && req.user) {
      const existingUser = await gmailuser.findOne({ email: req.user.email });
      updatedUser = await gmailuser.findOneAndUpdate(
        { email: req.user.email },
        {
          details: {
            ...existingUser?.details,
            ...req.body,
            birthDate: existingUser?.details?.birthDate || req.body.birthDate,
            gender: existingUser?.details?.gender || req.body.gender
          }
        },
        { new: true }
      );
    }

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found or update failed' });
    }

    res.status(200).json({ message: 'User profile updated successfully', updatedUser });
  } catch (error) {
    console.error('Error in updating user profile:', error);
    next(error);
  }
};

// Fetch User's booked trips based on pagination
exports.getBookingHistoryItem = async (req, res, next) => {
  try {
    const { accessToken } = res.locals;
    const { verifiedPhoneNumber, user } = req;
    const { crrPage = 1, pageLimit = 10, newTabIndex } = req.body;
    const isUpcomingTrips = newTabIndex === '2';

    let userInfo;

    if (user) {
      const email = user.email || '';
      userInfo = await gmailuser.findOne({ email });
    } else if (verifiedPhoneNumber) {
      userInfo = await mobileuser.findOne({ phoneNumber: verifiedPhoneNumber });
    }

    if (!userInfo) {
      return res.status(404).json({ error: 'User not found' });
    }

    const filter = {
      tripStartDate: isUpcomingTrips ? { $gte: new Date() } : { $lt: new Date() },
      userId: userInfo._id.toString(),
      bookingStatus: "Confirmed",
    };

    const items = await TripBookingDetail.find(filter)
      .skip((crrPage - 1) * pageLimit)
      .limit(pageLimit)
      .sort({ createdAt: -1 }) // Sort by creation date, latest first
      .select([
        '_id',
        'userId',
        'toursSystemId',
        'tripName',
        'tripCode',
        'imageName',
        'bookingNumber',
        'totalPerson',
        'personDetails',
        'joiningFrom',
        'bookingStatus',
        'totalTripCost',
        'totalTripCostWithGST',
        'duePayment',
        'paymentStatus',
        'tripStartDate',
        'tripEndDate',
        'invoicePath',
      ])
      .populate('toursSystemId')
      .lean();

    // Fetch payment logs for each booking
    for (let item of items) {
      const paymentLogs = await PaymentLog.find({ bookingId: item._id, status: 'success' })
        .select('paymentDate amount receiptPath')
        .lean();
      item.paymentLogs = paymentLogs;
    }

    // Format date fields
    items.forEach((item) => {
      item.tripStartDate = formatMongoDateForUIAsYYYYMMMDD(item.tripStartDate);
      item.tripEndDate = formatMongoDateForUIAsYYYYMMMDD(item.tripEndDate);
    });

    const totalItems = await TripBookingDetail.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / pageLimit);

    res.json({ items, paginationDet: { crrPage, totalPages } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server Error' });
  }
};

// Handler to fetch and display the user's trips
exports.getMyTrips = async (req, res, next) => {
  try {
    const { verifiedPhoneNumber, user } = req;

    let profileFormData = {};
    if (verifiedPhoneNumber) {
      profileFormData = await mobileuser.findOne({ phoneNumber: verifiedPhoneNumber });
    } else if (user) {
      profileFormData = await gmailuser.findOne({ email: user.email });
    }

    const formattedBirthDate = formatMongoDateForUIAsYYYYMMDD(profileFormData?.details?.birthDate);

    const details = {
      ...(profileFormData?.details || {}),
      birthDate: formattedBirthDate,
    };

    res.render('pages/profile/profile', {
      profileFormData: details,
      myTrips: [],
    });
  } catch (error) {
    console.error('Error in getMyTrips:', error);
    next(error);
  }
};

// Initiate a new payment for the remaining amount
exports.initiatePayment = async (req, res, next) => {
  try {
    const { bookingId, amount } = req.body;
    const booking = await TripBookingDetail.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.duePayment < amount) {
      return res.status(400).json({ success: false, message: 'Amount exceeds due payment' });
    }

    const paymentResult = await PaymentService.createPaymentOrder(bookingId, amount);
    res.status(200).json({ success: true, order: paymentResult.order, paymentLogId: paymentResult.paymentLogId });
  } catch (error) {
    console.error('Error initiating payment:', error);
    res.status(500).json({ success: false, message: 'Failed to initiate payment' });
  }
};

// Verify payment (called after Razorpay payment)
exports.verifyPayment = async (req, res, next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentLogId } = req.body;
    const result = await PaymentService.verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentLogId);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ success: false, message: 'Failed to verify payment' });
  }
};

// Download receipt
exports.downloadReceipt = async (req, res, next) => {
  try {
    const paymentLogId = req.params.paymentLogId;
    const paymentLog = await PaymentLog.findById(paymentLogId);
    if (!paymentLog || !paymentLog.receiptPath) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    const filePath = path.resolve(paymentLog.receiptPath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Receipt file not found on server' });
    }

    res.download(filePath, path.basename(paymentLog.receiptPath));
  } catch (error) {
    console.error('Error downloading receipt:', error);
    res.status(500).json({ message: 'Failed to download receipt' });
  }
};

// Download invoice
exports.downloadInvoice = async (req, res, next) => {
  try {
    const bookingId = req.params.bookingId;
    const booking = await TripBookingDetail.findById(bookingId);
    if (!booking || !booking.invoicePath) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const filePath = path.resolve(booking.invoicePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Invoice file not found on server' });
    }

    res.download(filePath, path.basename(booking.invoicePath));
  } catch (error) {
    console.error('Error downloading invoice:', error);
    res.status(500).json({ message: 'Failed to download invoice' });
  }
};