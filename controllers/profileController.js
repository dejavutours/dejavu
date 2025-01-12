const Mobileuser = require('../models/mobileuser');
const Gmailuser = require('../models/gmailuser');
const PaymentDetail = require('../models/payment-detail');
const Tours = require('../models/tours');

// Handler to update the user's profile based on phone number or email
exports.updateUserProfile = async (req, res, next) => {
  try {
    let updatedUser = null;

    if (req.verifiedPhoneNumber) {
      updatedUser = await Mobileuser.findOneAndUpdate(
        { phoneNumber: req.verifiedPhoneNumber },
        { details: req.body },
        { new: true }
      );
    }

    if (!updatedUser && req.user) {
      updatedUser = await Gmailuser.findOneAndUpdate(
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

// Handler to fetch and display the user's trips
exports.getMyTrips = async (req, res, next) => {
  try {
    const { accessToken } = res.locals;
    const { verifiedPhoneNumber, user } = req;

    const contact = verifiedPhoneNumber
      ? Number(
          verifiedPhoneNumber.length === 12
            ? verifiedPhoneNumber.slice(2)
            : verifiedPhoneNumber
        )
      : null;

    const filter = accessToken
      ? { contact, status: 'paid' }
      : { email: user?.email, status: 'paid' };

    const myTrips = await PaymentDetail.find(filter);
    const tests = await Tours.find().distinct('name');
    const allTours = await Tours.find();

    const imageUrls = myTrips.map((trip) => {
      const tour = allTours.find(({ name }) => name === trip.destination);
      return tour?.imageurl || null;
    });

    let profileFormData = {};
    if (verifiedPhoneNumber) {
      profileFormData = await Mobileuser.findOne({
        phoneNumber: verifiedPhoneNumber,
      });
    } else if (user) {
      profileFormData = await Gmailuser.findOne({ email: user.email });
    }

    // Ensure birthDate is formatted as YYYY-MM-DD
    const formattedBirthDate =
      profileFormData.details && profileFormData.details.birthDate
        ? new Date(profileFormData.details.birthDate)
            .toISOString()
            .split('T')[0]
        : '';

    const details = {
      ...(profileFormData.details || {}),
      birthDate: formattedBirthDate,
    };

    res.render('pages/mytrips3', {
      test: tests,
      myTrips,
      profileFormData: details,
      imageurl: imageUrls,
    });
  } catch (error) {
    console.error('Error in getMyTrips:', error);
    next(error);
  }
};