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
      updatedUser = await mobileuser.findOneAndUpdate(
        { phoneNumber: req.verifiedPhoneNumber },
        { details: req.body },
        { new: true }
      );
    }

    if (!updatedUser && req.user) {
      updatedUser = await gmailuser.findOneAndUpdate(
        { email: req.user.email },
        { details: req.body },
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

    const filter = {
      tripStartDate: isUpcomingTrips
        ? { $gte: new Date() }
        : { $lt: new Date() },
      tempUserID: accessToken
        ? verifiedPhoneNumber
          ? Number(verifiedPhoneNumber.slice(-10))
          : null
        : user?.email,
    };

    const items = await TripBookingDetail.find(filter)
      .skip((crrPage - 1) * pageLimit)
      .limit(pageLimit)
      .sort({ tripStartDate: isUpcomingTrips ? 1 : -1 })
      .select([
        'userId',
        'tempUserID',
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
