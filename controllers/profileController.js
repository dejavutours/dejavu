const mobileuser = require('../models/mobileuser');
const gmailuser = require('../models/gmailuser');
const TripBookingDetail = require('../models/TripBookingDetail');
const PaymentDetail = require('../models/payment-detail');
const Tours = require('../models/tours');
const {
  formatMongoDateForUIAsYYYYMMMDD,
  formatMongoDateForUIAsYYYYMMDD,
} = require('../util/UtilityService');

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
      return res
        .status(404)
        .json({ message: 'User not found or update failed' });
    }

    res
      .status(200)
      .json({ message: 'User profile updated successfully', updatedUser });
  } catch (error) {
    console.error('Error in updating user profile:', error);
    next(error);
  }
};

// Fetch User's booked trips based on pagination.
exports.getBookingHistoryItem = async (req, res, next) => {
  try {
    const { accessToken } = res.locals;
    const { verifiedPhoneNumber, user } = req;
    const { crrPage = 1, pageLimit = 10, newTabIndex } = req.body;
    const isUpcomingTrips = newTabIndex === '2';

    let userInfo;

    if (user) {
      // Google login (session-based)
      const email = user.email || '';
      userInfo = await gmailuser.findOne({ email });

    } else if (verifiedPhoneNumber) {
      // Mobile login (JWT-based)
      userInfo = await mobileuser.findOne({ phoneNumber: verifiedPhoneNumber });
    }

    if (!userInfo) {
      return res.status(404).json({ error: 'User not found' });
    }

    const filter = {
      tripStartDate: isUpcomingTrips
        ? { $gte: new Date() }
        : { $lt: new Date() },
      userId: userInfo._id
    };

    const items = await TripBookingDetail.find(filter)
      .skip((crrPage - 1) * pageLimit)
      .limit(pageLimit)
      .sort({ tripStartDate: isUpcomingTrips ? 1 : -1 })
      .select([
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
        'duePayment',
        'paymentStatus',
        'tripStartDate',
        'tripEndDate',
      ])
      .populate('toursSystemId')  // Populate the referenced newtrouse schema
      .lean();

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
      profileFormData = await mobileuser.findOne({
        phoneNumber: verifiedPhoneNumber,
      });
    } else if (user) {
      profileFormData = await gmailuser.findOne({ email: user.email });
    }

    // Ensure birthDate is formatted as YYYY-MM-DD.
    const formattedBirthDate = formatMongoDateForUIAsYYYYMMDD(
      profileFormData?.details?.birthDate
    );

    const details = {
      ...(profileFormData.details || {}),
      birthDate: formattedBirthDate,
    };

    res.render('pages/profile/Profile', {
      profileFormData: details,
      myTrips: [],
    });
  } catch (error) {
    // BT: ::Pending:: improve Error handling flow.
    console.error('Error in getMyTrips:', error);
    next(error);
  }
};
