const NewTours = require('../models/newTours');
const TripBookingDetail = require('../models/TripBookingDetail');
const BookingLead = require('../models/BookingLead');
const CustomTrip = require('../models/customTripSchema');
const QuickCallRequest = require('../models/QuickCallRequest');
const User = require('../models/user');

exports.getDashboard = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ── Trip stats ──
    const [totalTrips, activeTrips] = await Promise.all([
      NewTours.countDocuments({ isDeleted: false }),
      NewTours.countDocuments({ isDeleted: false, isActive: true }),
    ]);

    // ── Booking stats ──
    const [totalBookings, todayBookings, confirmedBookings, pendingBookings] = await Promise.all([
      TripBookingDetail.countDocuments({}),
      TripBookingDetail.countDocuments({ createdAt: { $gte: today } }),
      TripBookingDetail.countDocuments({ status: { $regex: /confirmed/i } }),
      TripBookingDetail.countDocuments({ status: { $regex: /pending/i } }),
    ]);

    // ── Lead stats ──
    const [totalLeads, pendingLeads, contactedLeads, convertedLeads] = await Promise.all([
      BookingLead.countDocuments({}),
      BookingLead.countDocuments({ status: 'pending' }),
      BookingLead.countDocuments({ status: 'contacted' }),
      BookingLead.countDocuments({ status: 'converted' }),
    ]);

    // ── Other module stats ──
    const [totalCustomTrips, totalQuickCalls, totalCustomers] = await Promise.all([
      CustomTrip.countDocuments({}),
      QuickCallRequest.countDocuments({}),
      User.countDocuments({}),
    ]);

    // ── Recent bookings (last 6) ──
    const recentBookings = await TripBookingDetail.find({})
      .sort({ createdAt: -1 })
      .limit(6)
      .select('guestName tripName status totalAmount createdAt joiningFrom')
      .lean();

    // ── Recent leads (last 5) ──
    const recentLeads = await BookingLead.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .populate({ path: 'tripId', select: 'name' })
      .select('guestName mobileNo status createdAt tripId')
      .lean();

    res.render('pages/admin/dashboard', {
      pageTitle: 'Dashboard',
      activeNav: 'dashboard',
      breadcrumbs: [],
      stats: {
        totalTrips,
        activeTrips,
        totalBookings,
        todayBookings,
        confirmedBookings,
        pendingBookings,
        totalLeads,
        pendingLeads,
        contactedLeads,
        convertedLeads,
        totalCustomTrips,
        totalQuickCalls,
        totalCustomers,
      },
      recentBookings,
      recentLeads,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).render('pages/admin/dashboard', {
      pageTitle: 'Dashboard',
      activeNav: 'dashboard',
      breadcrumbs: [],
      stats: {},
      recentBookings: [],
      recentLeads: [],
      error: 'Could not load all dashboard data.',
    });
  }
};
