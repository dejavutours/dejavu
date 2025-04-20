// controllers/adminBookingController.js

const TripBookingDetail = require('../models/TripBookingDetail');
const NewTours = require('../models/newTours');
const MobileUser = require('../models/mobileuser');
const GmailUser = require('../models/gmailuser');
const mongoose = require('mongoose');


// controllers/adminBookingController.js (update getBookings)
const getBookings = async (req, res) => {
  try {
    const { bookingStatus, paymentStatus, tripStartDate, tripName, page = 1 } = req.query;
    const limit = 10;
    const skip = (page - 1) * limit;
    const query = {};
    const filters = { bookingStatus, paymentStatus, tripStartDate, tripName };

    if (bookingStatus) query.bookingStatus = bookingStatus;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (tripStartDate) {
      const startDate = new Date(tripStartDate);
      query.tripStartDate = { $gte: startDate, $lte: new Date(startDate.setHours(23, 59, 59)) };
    }
    if (tripName) {
      query.$or = [
        { tripName: { $regex: tripName, $options: 'i' } },
        { toursSystemId: { $in: await NewTours.find({ name: { $regex: tripName, $options: 'i' } }).distinct('_id') } }
      ];
    }

    const totalBookings = await TripBookingDetail.countDocuments(query);
    const bookings = await TripBookingDetail.find(query)
      .populate('toursSystemId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const enrichedBookings = await Promise.all(bookings.map(async (booking) => {
      if (mongoose.Types.ObjectId.isValid(booking.userId)) {
        userDetails = await MobileUser.findOne({ _id: booking.userId });
        if (!userDetails) {
          userDetails = await GmailUser.findOne({ _id: booking.userId });
        }
      } else {
        console.warn(`Invalid ObjectId: ${booking.userId}`);
      }
      return {
        ...booking.toObject(),
        userDetails,
        tourDetails: booking.toursSystemId
      };
    }));

    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Chart Data
    const statusCounts = await TripBookingDetail.aggregate([
      { $group: { _id: '$bookingStatus', count: { $sum: 1 } } },
      { $project: { status: '$_id', count: 1, _id: 0 } }
    ]);

    const revenueTrend = await TripBookingDetail.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
          paymentStatus: 'Paid'
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: '$paidAmount' }
        }
      },
      { $sort: { '_id': 1 } },
      { $project: { date: '$_id', total: 1, _id: 0 } }
    ]);

    const stats = {
      bookingsToday: await TripBookingDetail.countDocuments({ createdAt: { $gte: startOfDay } }),
      bookingsThisWeek: await TripBookingDetail.countDocuments({ createdAt: { $gte: startOfWeek } }),
      bookingsThisMonth: await TripBookingDetail.countDocuments({ createdAt: { $gte: startOfMonth } }),
      totalAmountThisMonth: (await TripBookingDetail.aggregate([
        { $match: { createdAt: { $gte: startOfMonth }, paymentStatus: 'Paid' } },
        { $group: { _id: null, total: { $sum: '$paidAmount' } } }
      ]))[0]?.total || 0,
      perTripStats: await TripBookingDetail.aggregate([
        { $match: { createdAt: { $gte: startOfMonth } } },
        {
          $lookup: {
            from: 'newtours',
            localField: 'toursSystemId',
            foreignField: '_id',
            as: 'tour'
          }
        },
        { $unwind: { path: '$tour', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: { tripId: '$toursSystemId', tripName: { $ifNull: ['$tour.name', '$tripName'] } },
            bookings: { $sum: 1 },
            totalAmount: { $sum: '$paidAmount' }
          }
        },
        {
          $project: {
            tripName: '$_id.tripName',
            bookings: 1,
            totalAmount: 1,
            _id: 0
          }
        }
      ]),
      chartData: {
        statusCounts,
        revenueTrend
      }
    };

    res.render('pages/admin/bookings', {
      bookings: enrichedBookings,
      stats,
      filters,
      error: null,
      totalBookings,
      csrfToken: req.csrfToken(),
      currentPage: parseInt(page)
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('pages/admin/bookings', {
      bookings: [],
      stats: {
        bookingsToday: 0,
        bookingsThisWeek: 0,
        bookingsThisMonth: 0,
        totalAmountThisMonth: 0,
        perTripStats: [],
        chartData: { statusCounts: [], revenueTrend: [] }
      },
      filters: {},
      error: 'Failed to load bookings. Please try again later.',
      totalBookings: 0,
      currentPage: 1,
      csrfToken: req.csrfToken(),
    });
  }
};

const bulkUpdateBookingStatus = async (req, res) => {
  try {
    const { bookingIds, bookingStatus } = req.body;
    if (!['Pending', 'Confirmed', 'Cancelled'].includes(bookingStatus)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    if (!Array.isArray(bookingIds) || bookingIds.length === 0) {
      return res.status(400).json({ message: 'No bookings selected' });
    }
    const result = await TripBookingDetail.updateMany(
      { _id: { $in: bookingIds } },
      { $set: { bookingStatus } }
    );
    if (result.modifiedCount > 0) {
      res.status(200).json({ message: `${result.modifiedCount} bookings updated successfully` });
    } else {
      res.status(404).json({ message: 'No bookings updated' });
    }
  } catch (err) {
    console.error('Error in bulk update:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

const getBookingDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate booking ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.warn(`Invalid booking ID: ${id}`);
      return res.status(400).render('pages/admin/booking-detail', {
        booking: null,
        error: 'Invalid booking ID',
        csrfToken: req.csrfToken()
      });
    }

    // Fetch booking with populated toursSystemId
    const booking = await TripBookingDetail.findById({_id:id}).populate({
      path: 'toursSystemId',
      select: 'name state destinations price about activities'
    });

    if (!booking) {
      console.warn(`Booking not found for ID: ${id}`);
      return res.status(404).render('pages/admin/booking-detail', {
        booking: null,
        error: 'Booking not found',
        csrfToken: req.csrfToken()
      });
    }

    // Fetch user details using userId
    let userDetails = null;
    try {
      if (mongoose.Types.ObjectId.isValid(booking.userId)) {
        userDetails = await MobileUser.findOne({_id: booking.userId}).select('details');
      }
      if (!userDetails) {
        userDetails = await GmailUser.findOne({ _id: booking.userId }).select('details');
      }
    } catch (err) {
      console.error(`Error fetching user details for userId: ${booking.userId}`, err);
    }

    // Mini Analytics
    const userBookings = await TripBookingDetail.find({ userId: booking.userId });
    const totalBookings = userBookings.length;
    const lifetimeValue = userBookings.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
    const paymentBreakdown = {
      total: booking.totalTripCost,
      paid: booking.paidAmount,
      remaining: booking.totalTripCost - booking.paidAmount
    };

    const bookingHistory = await TripBookingDetail.aggregate([
      {
        $match: {
          userId: booking.userId,
          createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } },
      { $project: { month: '$_id', count: 1, _id: 0 } }
    ]);

    const enrichedBooking = {
      ...booking.toObject(),
      userDetails: userDetails ? userDetails.toObject() : null,
      tourDetails: booking.toursSystemId ? booking.toursSystemId.toObject() : null,
      analytics: {
        totalBookings,
        lifetimeValue,
        paymentBreakdown,
        bookingHistory
      }
    };

    res.render('pages/admin/booking-detail', {
      booking: enrichedBooking,
      error: booking.toursSystemId ? null : 'Tour details not found for this booking',
      csrfToken: req.csrfToken()
    });
  } catch (err) {
    console.error(`Error in getBookingDetails for bookingId: ${req.params.id}`, err);
    res.status(500).render('pages/admin/booking-detail', {
      booking: null,
      error: 'Failed to load booking details',
      csrfToken: req.csrfToken()
    });
  }
};

const updateBookingStatus = async (req, res) => {
  try {
    const { bookingStatus } = req.body;
    const booking = await TripBookingDetail.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    booking.bookingStatus = bookingStatus;
    await booking.save();

    res.status(200).json({ message: 'Status updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  getBookings,
  getBookingDetails,
  updateBookingStatus,
  bulkUpdateBookingStatus
};