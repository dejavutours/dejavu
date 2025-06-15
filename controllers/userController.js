const GmailUser = require('../models/gmailuser');
const MobileUser = require('../models/mobileuser');
const TripBookingDetail = require('../models/TripBookingDetail');
const NewTours = require('../models/newTours');
// const { sendEmail } = require('../utils/emailUtils');
const mongoose = require('mongoose');

const getUsers = async (req, res) => {
  try {
    const { type, tripName, contact, page = 1, limit = 30 } = req.query;
    const skip = (page - 1) * limit;

    // Initialize filters
    let gmailQuery = {};
    let mobileQuery = {};
    let userIds = null;

    // Filter by trip name
    if (tripName) {
      const tourIds = await NewTours.find({ name: { $regex: tripName, $options: 'i' } }).distinct('_id');
      userIds = await TripBookingDetail.find({ toursSystemId: { $in: tourIds } }).distinct('userId');
      gmailQuery._id = { $in: userIds };
      mobileQuery._id = { $in: userIds };
    }

    // Filter by contact info
    if (contact) {
      const contactRegex = { $regex: contact, $options: 'i' };
      gmailQuery.$or = [
        { email: contactRegex },
        { 'details.email': contactRegex },
        { 'details.mobileNumber': contactRegex }
      ];
      mobileQuery.$or = [
        { phoneNumber: contactRegex },
        { 'details.email': contactRegex },
        { 'details.mobileNumber': contactRegex }
      ];
    }

    // Fetch users based on type
    let users = [];
    let total = 0;

    if (type === 'gmail') {
      users = await GmailUser.find(gmailQuery).skip(skip).limit(limit);
      users = users.map(user => ({
        ...user.toObject(),
        type: 'gmail',
        bookings: 0 // Placeholder, updated below
      }));
      total = await GmailUser.countDocuments(gmailQuery);
    } else if (type === 'mobile') {
      users = await MobileUser.find(mobileQuery).skip(skip).limit(limit);
      users = users.map(user => ({
        ...user.toObject(),
        type: 'mobile',
        bookings: 0 // Placeholder, updated below
      }));
      total = await MobileUser.countDocuments(mobileQuery);
    } else {
      const gmailUsers = await GmailUser.find(gmailQuery).skip(skip).limit(limit);
      const mobileUsers = await MobileUser.find(mobileQuery).skip(skip).limit(limit);
      users = [
        ...gmailUsers.map(user => ({ ...user.toObject(), type: 'gmail', bookings: 0 })),
        ...mobileUsers.map(user => ({ ...user.toObject(), type: 'mobile', bookings: 0 }))
      ];
      total = await GmailUser.countDocuments(gmailQuery) + await MobileUser.countDocuments(mobileQuery);
    }

    // Get confirmed booking counts for all users
    if (users.length > 0) {
      const userIdList = users.map(u => mongoose.Types.ObjectId(u._id));
      const bookingCounts = await TripBookingDetail.aggregate([
        {
          $match: {
            userId: { $in: userIdList.map(id => id.toString()) },
            bookingStatus: 'Confirmed',
            paymentStatus: { $in: ['Partial', 'Paid'] }
          }
        },
        {
          $group: {
            _id: '$userId',
            count: { $sum: 1 }
          }
        }
      ]);

      // Map booking counts to users
      users = users.map(user => ({
        ...user,
        bookings: bookingCounts.find(b => b._id === user._id.toString())?.count || 0
      }));
    }

    // Sort users by _id to ensure consistent pagination
    users.sort((a, b) => a._id.toString().localeCompare(b._id.toString()));

    // Render EJS template
    res.render('pages/admin/userMaster', {
      users,
      total,
      currentPage: parseInt(page),
      filters: { type, tripName, contact },
      csrfToken: req.csrfToken ? req.csrfToken() : null,
      error: null
    });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).render('pages/admin/userMaster', {
      users: [],
      total: 0,
      currentPage: 1,
      filters: {},
      csrfToken: req.csrfToken ? req.csrfToken() : null,
      error: 'Failed to load users'
    });
  }
};


const getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).render('pages/admin/userDetail', {
        user: null,
        bookings: [],
        remainingPayment: 0,
        error: 'Invalid user ID',
        csrfToken: req.csrfToken ? req.csrfToken() : null
      });
    }

    let user = await GmailUser.findById(id) || await MobileUser.findById(id);
    if (!user) {
      return res.status(404).render('pages/admin/userDetail', {
        user: null,
        bookings: [],
        remainingPayment: 0,
        error: 'User not found',
        csrfToken: req.csrfToken ? req.csrfToken() : null
      });
    }

    const bookings = await TripBookingDetail.find({ userId: id })
      .populate('toursSystemId', 'name state destinations price')
      .sort({ createdAt: -1 });

    const remainingPayment = bookings.reduce((sum, b) => sum + (b.totalTripCost - b.paidAmount), 0);

    // Render EJS template
    res.render('pages/admin/userDetail', {
      user: { ...user.toObject(), type: user.email ? 'gmail' : 'mobile' },
      bookings,
      remainingPayment,
      error: null,
      csrfToken: req.csrfToken ? req.csrfToken() : null
    });
  } catch (err) {
    console.error('Error fetching user details:', err);
    res.status(500).render('pages/admin/userDetail', {
      user: null,
      bookings: [],
      remainingPayment: 0,
      error: 'Failed to load user details',
      csrfToken: req.csrfToken ? req.csrfToken() : null
    });
  }
};

// Remaining functions (unchanged as they are API endpoints)
const createUser = async (req, res) => {
  try {
    const { type, email, phoneNumber, name, details } = req.body;
    let user;

    if (type === 'gmail') {
      user = new GmailUser({ id: new mongoose.Types.ObjectId().toString(), email, name, details });
    } else if (type === 'mobile') {
      user = new MobileUser({ phoneNumber, otp: 1234, otpExpiration: new Date(), details });
    } else {
      return res.status(400).json({ message: 'Invalid user type' });
    }

    await user.save();
    res.status(201).json({ message: 'User created successfully', user });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ message: 'Failed to create user' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, phoneNumber, name, details } = req.body;

    let user = await GmailUser.findById(id) || await MobileUser.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.email) {
      user.email = email || user.email;
      user.name = name || user.name;
      user.details = { ...user.details, ...details };
    } else {
      user.phoneNumber = phoneNumber || user.phoneNumber;
      user.details = { ...user.details, ...details };
    }

    await user.save();
    res.status(200).json({ message: 'User updated successfully', user });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ message: 'Failed to update user' });
  }
};

const exportUsers = async (req, res) => {
  try {
    const { type, tripName, contact, format = 'csv' } = req.body;
    let query = {};

    if (type === 'gmail') query = { model: GmailUser };
    else if (type === 'mobile') query = { model: MobileUser };
    else query = { model: [GmailUser, MobileUser] };

    if (tripName) {
      const tourIds = await NewTours.find({ name: { $regex: tripName, $options: 'i' } }).distinct('_id');
      const userIds = await TripBookingDetail.find({ toursSystemId: { $in: tourIds } }).distinct('userId');
      query._id = { $in: userIds };
    }

    if (contact) {
      query.$or = [
        { email: { $regex: contact, $options: 'i' } },
        { phoneNumber: { $regex: contact, $options: 'i' } },
        { 'details.email': { $regex: contact, $options: 'i' } },
        { 'details.mobileNumber': { $regex: contact, $options: 'i' } }
      ];
    }

    let users = [];
    if (Array.isArray(query.model)) {
      const gmailUsers = await GmailUser.find(query._id ? { _id: query._id } : {});
      const mobileUsers = await MobileUser.find(query._id ? { _id: query._id } : {});
      users = [...gmailUsers, ...mobileUsers].map(user => ({
        ID: user._id,
        Type: user.email ? 'Gmail' : 'Mobile',
        Name: user.name || user.details.firstName,
        Email: user.email || user.details.email,
        Phone: user.phoneNumber || user.details.mobileNumber,
        State: user.details.state,
        City: user.details.city
      }));
    } else {
      users = await query.model.find(query._id ? { _id: query._id } : {});
      users = users.map(user => ({
        ID: user._id,
        Type: query.model === GmailUser ? 'Gmail' : 'Mobile',
        Name: user.name || user.details.firstName,
        Email: user.email || user.details.email,
        Phone: user.phoneNumber || user.details.mobileNumber,
        State: user.details.state,
        City: user.details.city
      }));
    }

    // if (format === 'excel') {
    //   const buffer = await exportToExcel(users, 'Users');
    //   res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    //   res.setHeader('Content-Disposition', 'attachment; filename=users.xlsx');
    //   res.send(buffer);
    // }
    //  else {
    //   const csv = exportToCSV(users);
    //   res.setHeader('Content-Type', 'text/csv');
    //   res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
    //   res.send(csv);
    // }
  } catch (err) {
    console.error('Error exporting users:', err);
    res.status(500).json({ message: 'Failed to export users' });
  }
};

const contactUsers = async (req, res) => {
  try {
    const { userIds, method, message } = req.body;
    if (!userIds || !method || !message) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const users = await GmailUser.find({ _id: { $in: userIds } }).concat(
      await MobileUser.find({ _id: { $in: userIds } })
    );

    if (method === 'email') {
    //   for (const user of users) {
    //     const email = user.email || user.details.email;
    //     if (email) {
    //       await sendEmail(email, 'Travel Update', message);
    //     }
    //   }
    } else if (method === 'sms') {
      // Placeholder for SMS integration
      console.log('SMS not implemented:', { users, message });
    }

    res.status(200).json({ message: 'Contact initiated successfully' });
  } catch (err) {
    console.error('Error contacting users:', err);
    res.status(500).json({ message: 'Failed to contact users' });
  }
};

const getUserBookings = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const bookings = await TripBookingDetail.find({ userId: id })
      .populate('toursSystemId', 'name state destinations price')
      .sort({ createdAt: -1 });

    res.status(200).json({ bookings });
  } catch (err) {
    console.error('Error fetching user bookings:', err);
    res.status(500).json({ message: 'Failed to load bookings' });
  }
};

module.exports = {
  getUsers,
  getUserDetails,
  createUser,
  updateUser,
  exportUsers,
  contactUsers,
  getUserBookings
};