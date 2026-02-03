const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const TripBookingDetail = require('../models/TripBookingDetail');
const NewTours = require('../models/newTours');
const MobileUser = require('../models/mobileuser');
const GmailUser = require('../models/gmailuser');
const PaymentLog = require('../models/PaymentLog');
const BookingLead = require('../models/BookingLead');
const EmailService = require('../util/emailService');
const generateInvoicePDF = require('../util/generateInvoicePDF');
const generateReceiptPDF = require('../util/generateReceiptPDF');

// Send email with documents for a booking
const sendEmail = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { to, subject, body, includeInvoice, includeReceipts } = req.body;

    const booking = await TripBookingDetail.findById(bookingId);
    if (!booking) {
      return res.redirect(`/admin/search-documents?bookingNumber=${req.query.bookingNumber || ''}&error=${encodeURIComponent('Booking not found')}`);
    }

    const tour = await NewTours.findById(booking.toursSystemId);
    if (!tour) {
      return res.redirect(`/admin/search-documents?bookingNumber=${booking.bookingNumber}&error=${encodeURIComponent('Tour not found')}`);
    }

    const attachments = [];

    // Validate and generate invoice if requested
    if (includeInvoice) {
      if (booking.bookingStatus === 'Cancelled') {
        return res.redirect(`/admin/search-documents?bookingNumber=${booking.bookingNumber}&error=${encodeURIComponent('Cannot send invoice for a cancelled booking')}`);
      }
      if (!booking.invoicePath || !fs.existsSync(booking.invoicePath)) {
        const invoiceFileName = `invoice_${booking.bookingNumber}_${booking._id}.pdf`;
        const invoicePath = path.join(__dirname, '..', 'paymentdocs', 'invoices', invoiceFileName);
        await generateInvoicePDF(booking, tour, invoicePath);
        booking.invoicePath = invoicePath;
        await booking.save();
      }
      attachments.push({
        filename: `Invoice_${booking.bookingNumber}.pdf`,
        path: booking.invoicePath
      });
    }

    // Validate and generate receipts if requested
    if (includeReceipts) {
      const paymentLogs = await PaymentLog.find({ bookingId: booking._id, status: 'success' });
      if (!paymentLogs.length) {
        return res.redirect(`/admin/search-documents?bookingNumber=${booking.bookingNumber}&error=${encodeURIComponent('No successful payments found to include receipts')}`);
      }
      for (const log of paymentLogs) {
        if (!log.receiptPath || !fs.existsSync(log.receiptPath)) {
          const receiptFileName = `receipt_${booking.bookingNumber}_${booking._id}_${log._id}.pdf`;
          const receiptPath = path.join(__dirname, '..', 'paymentdocs', 'receipts', receiptFileName);
          await generateReceiptPDF(booking, tour, log, receiptPath);
          log.receiptPath = receiptPath;
          await log.save();
        }
        attachments.push({
          filename: `Receipt_${booking.bookingNumber}_${log._id}.pdf`,
          path: log.receiptPath
        });
      }
    }

    // Use default subject and body if not provided
    const emailSubject = subject || `Booking Documents: ${tour.name} (${booking.bookingNumber})`;
    const emailBody = body || EmailService.generateBookingConfirmationHtml(booking, tour);

    await EmailService.sendManualEmail(to || booking.email, emailSubject, emailBody, attachments);

    res.redirect(`/admin/search-documents?bookingNumber=${booking.bookingNumber}&success=${encodeURIComponent('Email sent successfully')}`);
  } catch (error) {
    console.error('Error sending manual email:', error);
    res.redirect(`/admin/search-documents?bookingNumber=${req.query.bookingNumber || ''}&error=${encodeURIComponent('Failed to send email')}`);
  }
};

// Generate and send invoice manually
const sendInvoice = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { to } = req.body;

    const booking = await TripBookingDetail.findById(bookingId);
    if (!booking) {
      return res.redirect(`/admin/search-documents?bookingNumber=${req.query.bookingNumber || ''}&error=${encodeURIComponent('Booking not found')}`);
    }

    if (booking.bookingStatus === 'Cancelled') {
      return res.redirect(`/admin/search-documents?bookingNumber=${booking.bookingNumber}&error=${encodeURIComponent('Cannot send invoice for a cancelled booking')}`);
    }

    const tour = await NewTours.findById(booking.toursSystemId);
    if (!tour) {
      return res.redirect(`/admin/search-documents?bookingNumber=${booking.bookingNumber}&error=${encodeURIComponent('Tour not found')}`);
    }

    // Generate invoice if not exists or file is missing
    if (!booking.invoicePath || !fs.existsSync(booking.invoicePath)) {
      const invoiceFileName = `invoice_${booking.bookingNumber}_${booking._id}.pdf`;
      const invoicePath = path.join(__dirname, '..', 'paymentdocs', 'invoices', invoiceFileName);
      await generateInvoicePDF(booking, tour, invoicePath);
      booking.invoicePath = invoicePath;
      await booking.save();
    }

    await EmailService.sendManualEmail(
      to || booking.email,
      `Invoice for Booking ${booking.bookingNumber}`,
      EmailService.generateBookingConfirmationHtml(booking, tour),
      [{ filename: `Invoice_${booking.bookingNumber}.pdf`, path: booking.invoicePath }]
    );

    res.redirect(`/admin/search-documents?bookingNumber=${booking.bookingNumber}&success=${encodeURIComponent('Invoice sent successfully')}`);
  } catch (error) {
    console.error('Error sending invoice:', error);
    res.redirect(`/admin/search-documents?bookingNumber=${req.query.bookingNumber || ''}&error=${encodeURIComponent('Failed to send invoice')}`);
  }
};

// Fetch bookings with filters
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
      let userDetails = null;
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

    const pendingLeadsCount = await BookingLead.countDocuments({ leadStatus: 'pending' });

    const stats = {
      bookingsToday: await TripBookingDetail.countDocuments({ createdAt: { $gte: startOfDay } }),
      bookingsThisWeek: await TripBookingDetail.countDocuments({ createdAt: { $gte: startOfWeek } }),
      bookingsThisMonth: await TripBookingDetail.countDocuments({ createdAt: { $gte: startOfMonth } }),
      totalAmountThisMonth: (await TripBookingDetail.aggregate([
        { $match: { createdAt: { $gte: startOfMonth }, paymentStatus: 'Paid' } },
        { $group: { _id: null, total: { $sum: '$paidAmount' } } }
      ]))[0]?.total || 0,
      pendingLeadsCount,
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

// Get booking details
const getBookingDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).render('pages/admin/booking-detail', {
        booking: null,
        error: 'Invalid booking ID',
        csrfToken: req.csrfToken()
      });
    }

    // Fetch booking + populate tour
    const booking = await TripBookingDetail.findById(id)
      .populate({
        path: 'toursSystemId',
        select: 'name state destinations price about activities'
      })
      .lean(); // better performance for rendering

    if (!booking) {
      return res.status(404).render('pages/admin/booking-detail', {
        booking: null,
        error: 'Booking not found',
        csrfToken: req.csrfToken()
      });
    }

    // Ensure duePayment is correct (sometimes it can be inconsistent)
    const finalAmount = booking.adminFinalAmount || booking.totalTripCostWithGST || booking.totalTripCost || 0;
    booking.duePayment = Math.max(0, finalAmount - (booking.paidAmount || 0));

    // Fetch user
    let userDetails = null;
    if (booking.userId && mongoose.Types.ObjectId.isValid(booking.userId)) {
      userDetails = await MobileUser.findById(booking.userId).lean() ||
                    await GmailUser.findById(booking.userId).lean();
    }

    // Analytics
    const userBookings = await TripBookingDetail.find({ userId: booking.userId }).lean();
    const totalBookings = userBookings.length;
    const lifetimeValue = userBookings.reduce((sum, b) => sum + (b.paidAmount || 0), 0);

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

    // Latest receipt (if multiple payments)
    const latestReceipt = await PaymentLog.findOne({ bookingId: booking._id })
      .sort({ paymentDate: -1 })
      .select('receiptPath')
      .lean();

    const enrichedBooking = {
      ...booking,
      userDetails,
      tourDetails: booking.toursSystemId,
      duePayment: booking.duePayment,           // ensure it's here
      invoicePath: booking.invoicePath,
      receiptPath: latestReceipt?.receiptPath || booking.receiptPath, // prefer latest
      analytics: {
        totalBookings,
        lifetimeValue,
        paymentBreakdown: {
          total: finalAmount,
          paid: booking.paidAmount || 0,
          remaining: booking.duePayment
        },
        bookingHistory
      }
    };

    res.render('pages/admin/booking-detail', {
      booking: enrichedBooking,
      error: null,
      csrfToken: req.csrfToken()
    });

  } catch (err) {
    console.error('Error in getBookingDetails:', err);
    res.status(500).render('pages/admin/booking-detail', {
      booking: null,
      error: 'Failed to load booking details',
      csrfToken: req.csrfToken()
    });
  }
};

// Update booking status
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

// Bulk update booking status
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

// Search bookings for autocomplete
const searchBookings = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.length < 3) {
      return res.json([]);
    }

    const bookings = await TripBookingDetail.find({
      bookingNumber: { $regex: query, $options: 'i' }
    })
      .populate('toursSystemId', 'name')
      .limit(10)
      .select('bookingNumber toursSystemId');

    const results = bookings.map(booking => ({
      bookingNumber: booking.bookingNumber,
      tourName: booking.toursSystemId ? booking.toursSystemId.name : 'N/A'
    }));

    res.json(results);
  } catch (error) {
    console.error('Error searching bookings:', error);
    res.status(500).json([]);
  }
};

// Render search and document generation page
const searchAndGenerateDocs = async (req, res) => {
  try {
    const { bookingNumber } = req.query;
    if (!bookingNumber) {
      return res.render('pages/admin/search-documents', {
        booking: null,
        paymentLogs: [],
        error: null,
        success: null,
        csrfToken: req.csrfToken()
      });
    }

    const booking = await TripBookingDetail.findOne({ bookingNumber })
      .populate('toursSystemId', 'name state destinations price about activities');
    if (!booking) {
      return res.render('pages/admin/search-documents', {
        booking: null,
        paymentLogs: [],
        error: 'Booking not found',
        success: null,
        csrfToken: req.csrfToken()
      });
    }

    const paymentLogs = await PaymentLog.find({ bookingId: booking._id });
    res.render('pages/admin/search-documents', {
      booking: {
        ...booking.toObject(),
        tourDetails: booking.toursSystemId ? booking.toursSystemId.toObject() : null
      },
      paymentLogs,
      error: null,
      success: null,
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.error('Error in searchAndGenerateDocs:', error);
    res.redirect(`/admin/search-documents?bookingNumber=${bookingNumber || ''}&error=${encodeURIComponent('Failed to load booking details')}`);
  }
};

// Generate invoice for a booking
const generateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await TripBookingDetail.findById(id);
    if (!booking) {
      return res.redirect(`/admin/search-documents?bookingNumber=${req.query.bookingNumber || ''}&error=${encodeURIComponent('Booking not found')}`);
    }

    if (booking.bookingStatus === 'Cancelled') {
      return res.redirect(`/admin/search-documents?bookingNumber=${booking.bookingNumber}&error=${encodeURIComponent('Cannot generate invoice for a cancelled booking')}`);
    }

    const tour = await NewTours.findById(booking.toursSystemId);
    if (!tour) {
      return res.redirect(`/admin/search-documents?bookingNumber=${booking.bookingNumber}&error=${encodeURIComponent('Tour not found')}`);
    }

    const invoiceFileName = `invoice_${booking.bookingNumber}_${booking._id}.pdf`;
    const invoicePath = path.join(__dirname, '..', 'paymentdocs', 'invoices', invoiceFileName);
    await generateInvoicePDF(booking, tour, invoicePath);
    booking.invoicePath = invoicePath;
    await booking.save();

    res.redirect(`/admin/search-documents?bookingNumber=${booking.bookingNumber}&success=${encodeURIComponent('Invoice generated successfully')}`);
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.redirect(`/admin/search-documents?bookingNumber=${req.query.bookingNumber || ''}&error=${encodeURIComponent('Failed to generate invoice')}`);
  }
};

// Generate receipt for a payment log
const generateReceipt = async (req, res) => {
  try {
    const { bookingId, paymentLogId } = req.params;
    const booking = await TripBookingDetail.findById(bookingId);
    if (!booking) {
      return res.redirect(`/admin/search-documents?bookingNumber=${req.query.bookingNumber || ''}&error=${encodeURIComponent('Booking not found')}`);
    }

    const tour = await NewTours.findById(booking.toursSystemId);
    if (!tour) {
      return res.redirect(`/admin/search-documents?bookingNumber=${booking.bookingNumber}&error=${encodeURIComponent('Tour not found')}`);
    }

    const paymentLog = await PaymentLog.findById(paymentLogId);
    if (!paymentLog || paymentLog.status !== 'success') {
      return res.redirect(`/admin/search-documents?bookingNumber=${booking.bookingNumber}&error=${encodeURIComponent('Payment log not found or not successful')}`);
    }

    const receiptFileName = `receipt_${booking.bookingNumber}_${booking._id}_${paymentLog._id}.pdf`;
    const receiptPath = path.join(__dirname, '..', 'paymentdocs', 'receipts', receiptFileName);
    await generateReceiptPDF(booking, tour, paymentLog, receiptPath);
    paymentLog.receiptPath = receiptPath;
    await paymentLog.save();

    res.redirect(`/admin/search-documents?bookingNumber=${booking.bookingNumber}&success=${encodeURIComponent('Receipt generated successfully')}`);
  } catch (error) {
    console.error('Error generating receipt:', error);
    res.redirect(`/admin/search-documents?bookingNumber=${req.query.bookingNumber || ''}&error=${encodeURIComponent('Failed to generate receipt')}`);
  }
};

// Download invoice
const downloadInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await TripBookingDetail.findById(id);
    if (!booking) {
      return res.redirect(`/admin/search-documents?error=${encodeURIComponent('Booking not found')}`);
    }
    if (booking.bookingStatus === 'Cancelled') {
      return res.redirect(`/admin/search-documents?bookingNumber=${booking.bookingNumber}&error=${encodeURIComponent('Cannot download invoice for a cancelled booking')}`);
    }
    if (!booking.invoicePath || !fs.existsSync(booking.invoicePath)) {
      const tour = await NewTours.findById(booking.toursSystemId);
      if (!tour) {
        return res.redirect(`/admin/search-documents?bookingNumber=${booking.bookingNumber}&error=${encodeURIComponent('Tour not found')}`);
      }
      const invoiceFileName = `invoice_${booking.bookingNumber}_${booking._id}.pdf`;
      const invoicePath = path.join(__dirname, '..', 'paymentdocs', 'invoices', invoiceFileName);
      await generateInvoicePDF(booking, tour, invoicePath);
      booking.invoicePath = invoicePath;
      await booking.save();
    }
    res.download(booking.invoicePath, `Invoice_${booking.bookingNumber}.pdf`);
  } catch (error) {
    console.error('Error downloading invoice:', error);
    res.redirect(`/admin/search-documents?error=${encodeURIComponent('Failed to download invoice. Please try again.')}`);
  }
};

// Download receipt
const downloadReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const paymentLog = await PaymentLog.findById(id);
    if (!paymentLog) {
      return res.redirect(`/admin/search-documents?error=${encodeURIComponent('Payment log not found')}`);
    }
    const booking = await TripBookingDetail.findById(paymentLog.bookingId);
    if (!booking) {
      return res.redirect(`/admin/search-documents?error=${encodeURIComponent('Booking not found')}`);
    }
    if (!paymentLog.receiptPath || !fs.existsSync(paymentLog.receiptPath)) {
      const tour = await NewTours.findById(booking.toursSystemId);
      if (!tour) {
        return res.redirect(`/admin/search-documents?bookingNumber=${booking.bookingNumber}&error=${encodeURIComponent('Tour not found')}`);
      }
      const receiptFileName = `receipt_${booking.bookingNumber}_${booking._id}_${paymentLog._id}.pdf`;
      const receiptPath = path.join(__dirname, '..', 'paymentdocs', 'receipts', receiptFileName);
      await generateReceiptPDF(booking, tour, paymentLog, receiptPath);
      paymentLog.receiptPath = receiptPath;
      await paymentLog.save();
    }
    res.download(paymentLog.receiptPath, `Receipt_${booking.bookingNumber}_${paymentLog._id}.pdf`);
  } catch (error) {
    console.error('Error downloading receipt:', error);
    res.redirect(`/admin/search-documents?error=${encodeURIComponent('Failed to download receipt. Please try again.')}`);
  }
};

// Search users for booking creation
const getUsersForBooking = async (req, res) => {
  try {
    const { query, userType } = req.query;
    if (!query || query.length < 3) {
      return res.json([]);
    }

    // Enhanced search query - search by name, email, phone
    const searchQuery = {
      $or: [
        { phoneNumber: { $regex: query, $options: 'i' } },
        { 'details.mobileNumber': { $regex: query, $options: 'i' } },
        { 'details.firstName': { $regex: query, $options: 'i' } },
        { 'details.lastName': { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { 'details.email': { $regex: query, $options: 'i' } },
        { name: { $regex: query, $options: 'i' } }, // For Gmail users
      ],
    };

    let users = [];
    if (userType === 'mobile' || !userType) {
      const mobileUsers = await MobileUser.find(searchQuery)
        .limit(10)
        .select('phoneNumber details');
      users = mobileUsers.map(user => {
        const firstName = user.details?.firstName || '';
        const lastName = user.details?.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim() || 'No Name';
        const email = user.details?.email || '';
        const phone = user.phoneNumber || user.details?.mobileNumber || '';
        
        return {
          id: user._id,
          type: 'mobile',
          identifier: user.phoneNumber,
          fullName: fullName,
          firstName: firstName,
          lastName: lastName,
          email: email,
          phone: phone,
          details: user.details,
        };
      });
    }

    if (userType === 'gmail' || !userType) {
      const gmailUsers = await GmailUser.find(searchQuery)
        .limit(10)
        .select('email name details');
      users = users.concat(
        gmailUsers.map(user => {
          const firstName = user.details?.firstName || user.name?.split(' ')[0] || '';
          const lastName = user.details?.lastName || user.name?.split(' ').slice(1).join(' ') || '';
          const fullName = `${firstName} ${lastName}`.trim() || user.name || 'No Name';
          const email = user.email || user.details?.email || '';
          const phone = user.details?.mobileNumber || '';
          
          return {
            id: user._id,
            type: 'gmail',
            identifier: user.email,
            fullName: fullName,
            firstName: firstName,
            lastName: lastName,
            email: email,
            phone: phone,
            details: user.details,
          };
        })
      );
    }

    res.json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json([]);
  }
};

// Helper function to check if trip has available dates
const hasAvailableDates = (tour) => {
  if (!tour.deptcities || tour.deptcities.length === 0) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return tour.deptcities.some(city => {
    if (!city.dates || city.dates.length === 0) return false;
    
    const cutoffDays = parseInt(city.bookingCutoffDays || '0', 10);
    const cutoffDate = new Date(today);
    cutoffDate.setDate(today.getDate() + cutoffDays);
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    
    return city.dates.some(dateGroup => {
      if (!dateGroup.Year || !dateGroup.Month || !dateGroup.dates) return false;
      
      const monthNum = monthNames.indexOf(dateGroup.Month) + 1;
      if (monthNum === 0) return false;
      
      const dates = dateGroup.dates.split(', ');
      return dates.some(date => {
        const dateStr = date.trim();
        if (!dateStr) return false;
        try {
          const fullDate = new Date(`${dateGroup.Year}-${String(monthNum).padStart(2, '0')}-${dateStr.padStart(2, '0')}`);
          fullDate.setHours(0, 0, 0, 0);
          return fullDate > cutoffDate;
        } catch (e) {
          return false;
        }
      });
    });
  });
};

// Render create booking page
const renderCreateBooking = async (req, res) => {
  try {
    const allTours = await NewTours.find({ isActive: true, isDeleted: { $ne: true } })
      .select('name state deptcities')
      .sort({ name: 1 });

    // Filter tours to only include those with available dates
    const tours = allTours.filter(tour => hasAvailableDates(tour));

    res.render('pages/admin/create-booking', {
      tours: tours.map(t => ({ _id: t._id, name: t.name, state: t.state })),
      csrfToken: req.csrfToken(),
    });
  } catch (error) {
    console.error('Error rendering create booking page:', error);
    res.status(500).render('pages/admin/create-booking', {
      tours: [],
      error: 'Failed to load page',
      csrfToken: req.csrfToken(),
    });
  }
};

// Get tour details (API)
const getTourDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const tour = await NewTours.findById(id);
    if (!tour) {
      return res.status(404).json({ success: false, message: 'Tour not found' });
    }
    res.json(tour);
  } catch (error) {
    console.error('Error fetching tour details:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Create booking (admin)
const createBooking = async (req, res) => {
  try {
    const {
      userId,
      userType,
      createNewUser,
      newUserPhone,
      newUserEmail,
      newUserDetails,
      tourId,
      transportType,
      joiningFrom,
      travelDate,
      adults,
      children,
      personDetails,
      adminFinalAmount,
      paymentStatus,
      bookingStatus,
      adminNotes,
    } = req.body;

    // Validate required fields
    if (!tourId || !transportType || !joiningFrom || !travelDate || !adults || !personDetails) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Handle user creation or selection
    let finalUserId = userId;
    if (createNewUser === 'true') {
      if (userType === 'mobile' && newUserPhone) {
        // Check if user exists
        let existingUser = await MobileUser.findOne({ phoneNumber: newUserPhone });
        if (!existingUser) {
          // Create new mobile user
          existingUser = new MobileUser({
            phoneNumber: newUserPhone,
            otpExpiration: new Date(),
            otp: 0,
            paymentids: [],
            details: {
              firstName: newUserDetails?.firstName || '',
              lastName: newUserDetails?.lastName || '',
              email: newUserDetails?.email || '',
              mobileNumber: newUserPhone,
              ...newUserDetails,
            },
          });
          await existingUser.save();
        }
        finalUserId = existingUser._id.toString();
      } else if (userType === 'gmail' && newUserEmail) {
        // Check if user exists
        let existingUser = await GmailUser.findOne({ email: newUserEmail });
        if (!existingUser) {
          // Create new gmail user
          existingUser = new GmailUser({
            id: newUserEmail,
            name: newUserDetails?.firstName || newUserEmail,
            email: newUserEmail,
            paymentids: [],
            details: {
              firstName: newUserDetails?.firstName || '',
              lastName: newUserDetails?.lastName || '',
              email: newUserEmail,
              ...newUserDetails,
            },
          });
          await existingUser.save();
        }
        finalUserId = existingUser._id.toString();
      }
    }

    // Validate tour
    const tour = await NewTours.findById(tourId);
    if (!tour) {
      return res.status(404).json({ success: false, message: 'Tour not found' });
    }

    // Find city and transport
    const city = tour.deptcities.find(c => c.City === joiningFrom);
    if (!city) {
      return res.status(400).json({ success: false, message: `Invalid joining city: ${joiningFrom}` });
    }

    const transport = city.price.find(t => t.transferType === transportType);
    if (!transport) {
      return res.status(400).json({ success: false, message: `Invalid transport type: ${transportType}` });
    }

    // Validate and calculate dates
    const tripStartDate = new Date(travelDate);
    if (isNaN(tripStartDate)) {
      return res.status(400).json({ success: false, message: 'Invalid travel date format' });
    }

    const tripDays = parseInt(city.tripDuration) || 1;
    const tripEndDate = new Date(tripStartDate);
    tripEndDate.setDate(tripStartDate.getDate() + (tripDays - 1));

    // Calculate costs
    const adultCount = parseInt(adults);
    const childCount = parseInt(children) || 0;
    const subtotal = (adultCount * transport.adultPrice) + (childCount * transport.childPrice);
    const gst = subtotal * 0.05;
    const totalTripCostWithGST = subtotal + gst;

    // Validate and process person details
    if (!Array.isArray(personDetails) || personDetails.length === 0) {
      return res.status(400).json({ success: false, message: 'Person details are required. Please fill in traveler information.' });
    }
    
    if (personDetails.length !== (adultCount + childCount)) {
      return res.status(400).json({ 
        success: false, 
        message: `Person details count (${personDetails.length}) does not match total travelers (${adultCount + childCount})` 
      });
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const processedPersonDetails = personDetails.map((person, index) => {
      // Validate required fields
      if (!person.firstName || !person.surname || !person.gender || !person.birthdate || !person.phone) {
        throw new Error(`Person ${index + 1} details are incomplete. All fields are required.`);
      }
      
      const birthdate = new Date(person.birthdate);
      if (isNaN(birthdate.getTime())) {
        throw new Error(`Person ${index + 1} has invalid birthdate.`);
      }
      
      const age = today.getFullYear() - birthdate.getFullYear() -
        (today.getMonth() < birthdate.getMonth() ||
          (today.getMonth() === birthdate.getMonth() && today.getDate() < birthdate.getDate()) ? 1 : 0);
      return {
        firstName: person.firstName.trim(),
        surname: person.surname.trim(),
        gender: person.gender,
        birthdate: birthdate,
        phone: person.phone.trim(),
        altphone: (person.altphone || '').trim(),
        isAdult: age > 10,
      };
    });

    // Calculate final amount and discount
    // Store original price for discount calculation
    const originalPriceWithGST = totalTripCostWithGST;
    const finalAmount = adminFinalAmount !== undefined ? parseFloat(adminFinalAmount) : totalTripCostWithGST;
    const discountAmount = Math.max(0, originalPriceWithGST - finalAmount);

    // Get user email if exists
    let userEmail = null;
    if (finalUserId) {
      if (mongoose.Types.ObjectId.isValid(finalUserId)) {
        const mobileUser = await MobileUser.findById(finalUserId);
        if (mobileUser) {
          userEmail = mobileUser.details?.email || null;
        } else {
          const gmailUser = await GmailUser.findById(finalUserId);
          if (gmailUser) {
            userEmail = gmailUser.email || null;
          }
        }
      }
    }

    // Create booking
    const booking = new TripBookingDetail({
      userId: finalUserId || null,
      toursSystemId: tourId,
      transportType,
      totalPerson: { adult: adultCount, child: childCount },
      personDetails: processedPersonDetails,
      joiningFrom,
      tripStartDate,
      tripEndDate,
      totalTripCost: subtotal,
      totalTripCostWithGST: finalAmount, // Use final amount
      paidAmount: 0,
      duePayment: finalAmount,
      bookingStatus: bookingStatus || 'Pending',
      paymentStatus: paymentStatus || 'Pending',
      email: userEmail,
      adminFinalAmount: finalAmount,
      discountAmount,
      createdBy: 'admin',
      adminNotes: adminNotes || '',
    });

    await booking.save();

    // Handle payment recording and document generation (aligned with user-side flow)
    let paymentLog = null;
    try {
      // Determine paid amount and payment status (aligned with user-side flow)
      let paidAmount = 0;
      let actualPaymentStatus = paymentStatus || 'Pending';
      
      // If payment status indicates payment was made, determine the paid amount
      if (paymentStatus === 'Paid' || paymentStatus === 'Partial') {
        // For 'Paid', the paid amount equals the final amount (full payment)
        if (paymentStatus === 'Paid') {
          paidAmount = finalAmount;
          actualPaymentStatus = 'Paid';
        } else if (paymentStatus === 'Partial') {
          // For partial payment, we need the actual paid amount from request
          // Check if paidAmount is provided in request body
          const requestedPaidAmount = req.body.paidAmount ? parseFloat(req.body.paidAmount) : null;
          if (requestedPaidAmount !== null && requestedPaidAmount > 0 && requestedPaidAmount < finalAmount) {
            paidAmount = requestedPaidAmount;
            actualPaymentStatus = 'Partial';
          } else {
            // If no paid amount provided for partial, don't create payment log
            // Admin can record the payment later using the manual payment feature
            paidAmount = 0;
            actualPaymentStatus = 'Pending';
            console.warn(`Partial payment status selected but no paidAmount provided for booking ${booking._id}. Keeping as Pending.`);
          }
        }
      }

      // Create PaymentLog and generate documents only if payment was made
      if (paidAmount > 0 && (actualPaymentStatus === 'Paid' || actualPaymentStatus === 'Partial')) {
        try {
          paymentLog = new PaymentLog({
            bookingId: booking._id,
            amount: paidAmount,
            paymentDate: new Date(),
            paymentMethod: 'other',
            status: 'success',
            transactionDetails: {
              referenceId: `ADMIN-${booking._id}`,
              notes: adminNotes || 'Payment recorded during admin booking creation',
            },
          });
          await paymentLog.save();

          // Update booking payment details (aligned with user-side logic)
          booking.paidAmount = paidAmount;
          booking.duePayment = booking.totalTripCostWithGST - booking.paidAmount;
          booking.paymentStatus = booking.duePayment > 0 ? 'Partial' : 'Paid';
          booking.bookingStatus = 'Confirmed';
          await booking.save();

          // Generate receipt PDF (always generated for any payment, matching user-side flow)
          try {
            const receiptFileName = `receipt_${booking.bookingNumber}_${booking._id}_${paymentLog._id}.pdf`;
            const receiptPath = path.join(__dirname, '..', 'paymentdocs', 'receipts', receiptFileName);
            
            // Ensure receipts directory exists
            const receiptsDir = path.dirname(receiptPath);
            if (!fs.existsSync(receiptsDir)) {
              fs.mkdirSync(receiptsDir, { recursive: true });
            }
            
            await generateReceiptPDF(booking, tour, paymentLog, receiptPath);
            paymentLog.receiptPath = receiptPath;
            await paymentLog.save();
          } catch (receiptError) {
            console.error('Error generating receipt PDF during admin booking creation:', {
              bookingId: booking._id,
              paymentLogId: paymentLog._id,
              error: receiptError.message,
              stack: process.env.NODE_ENV === 'development' ? receiptError.stack : undefined,
            });
            // Continue even if receipt generation fails
          }

          // Generate invoice ONLY if payment is fully paid (matching user-side logic)
          // User-side generates invoice on first payment and updates on subsequent payments
          // But for admin, we only generate invoice when payment is FULLY_PAID
          if (booking.paymentStatus === 'Paid' && booking.duePayment === 0) {
            try {
              const invoiceFileName = `invoice_${booking.bookingNumber}_${booking._id}.pdf`;
              const invoicePath = path.join(__dirname, '..', 'paymentdocs', 'invoices', invoiceFileName);
              
              // Ensure invoices directory exists
              const invoicesDir = path.dirname(invoicePath);
              if (!fs.existsSync(invoicesDir)) {
                fs.mkdirSync(invoicesDir, { recursive: true });
              }
              
              await generateInvoicePDF(booking, tour, invoicePath);
              booking.invoicePath = invoicePath;
              await booking.save();
            } catch (invoiceError) {
              console.error('Error generating invoice PDF during admin booking creation:', {
                bookingId: booking._id,
                error: invoiceError.message,
                stack: process.env.NODE_ENV === 'development' ? invoiceError.stack : undefined,
              });
              // Continue even if invoice generation fails
            }
          }
          // For partial payments, invoice is NOT generated (matching user-side expectation)
        } catch (paymentLogError) {
          console.error('Error creating payment log during admin booking creation:', {
            bookingId: booking._id,
            error: paymentLogError.message,
            stack: process.env.NODE_ENV === 'development' ? paymentLogError.stack : undefined,
          });
          // Continue even if payment log creation fails
        }
      }

      // Send email notifications (only if email exists)
      if (userEmail) {
        try {
          await EmailService.sendBookingConfirmation(booking, tour, paymentLog);
          await EmailService.sendAdminNotification(booking, tour, paymentLog);
        } catch (emailError) {
          console.error('Error sending email notifications during admin booking creation:', {
            bookingId: booking._id,
            email: userEmail,
            error: emailError.message,
            stack: process.env.NODE_ENV === 'development' ? emailError.stack : undefined,
          });
          // Continue even if email sending fails
        }
      } else {
        console.warn(`No email address found for booking ${booking.bookingNumber}, skipping email notification`);
      }
    } catch (notificationError) {
      console.error('Error in post-creation notifications:', {
        bookingId: booking._id,
        error: notificationError.message,
        stack: process.env.NODE_ENV === 'development' ? notificationError.stack : undefined,
      });
      // Don't fail the booking creation if notifications fail
    }

    res.json({
      success: true,
      message: 'Booking created successfully',
      bookingId: booking._id,
      bookingNumber: booking.bookingNumber,
    });
  } catch (err) {
    console.error('Error creating booking:', {
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Update booking amount
const updateBookingAmount = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminFinalAmount, adminNotes } = req.body;

    const booking = await TripBookingDetail.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (adminFinalAmount === undefined) {
      return res.status(400).json({ success: false, message: 'Final amount is required' });
    }

    const finalAmount = parseFloat(adminFinalAmount);
    if (isNaN(finalAmount) || finalAmount < 0) {
      return res.status(400).json({ success: false, message: 'Invalid final amount' });
    }

    // Calculate discount (original price - final price)
    // Recalculate original price from base cost (before any admin adjustments)
    const originalSubtotal = booking.totalTripCost;
    const originalGST = originalSubtotal * 0.05;
    const originalPriceWithGST = originalSubtotal + originalGST;
    const discountAmount = Math.max(0, originalPriceWithGST - finalAmount);

    // Update booking
    booking.adminFinalAmount = finalAmount;
    booking.discountAmount = discountAmount;
    booking.totalTripCostWithGST = finalAmount; // Update total cost
    booking.duePayment = finalAmount - booking.paidAmount; // Recalculate due payment
    if (adminNotes !== undefined) {
      booking.adminNotes = adminNotes;
    }
    await booking.save();

    res.json({
      success: true,
      message: 'Booking amount updated successfully',
      booking: {
        adminFinalAmount: booking.adminFinalAmount,
        discountAmount: booking.discountAmount,
        totalTripCostWithGST: booking.totalTripCostWithGST,
        duePayment: booking.duePayment,
      },
    });
  } catch (err) {
    console.error('Error updating booking amount:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Update user contact information
const updateUserContact = async (req, res) => {
  try {
    const { id } = req.params;
    const { userType, contact } = req.body;

    if (!userType || !contact) {
      return res.status(400).json({ success: false, message: 'User type and contact information are required' });
    }

    let user;
    if (userType === 'mobile') {
      user = await MobileUser.findById(id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      user.details = user.details || {};
      user.details.email = contact;
      await user.save();
    } else if (userType === 'gmail') {
      user = await GmailUser.findById(id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      user.details = user.details || {};
      user.details.mobileNumber = contact;
      await user.save();
    } else {
      return res.status(400).json({ success: false, message: 'Invalid user type' });
    }

    res.json({ success: true, message: 'Contact information updated successfully', user });
  } catch (error) {
    console.error('Error updating user contact:', error);
    res.status(500).json({ success: false, message: 'Failed to update contact information' });
  }
};

// Exports
module.exports = {
  sendEmail,
  sendInvoice,
  getBookings,
  getBookingDetails,
  updateBookingStatus,
  bulkUpdateBookingStatus,
  searchBookings,
  searchAndGenerateDocs,
  generateInvoice,
  generateReceipt,
  downloadInvoice,
  downloadReceipt,
  getUsersForBooking,
  renderCreateBooking,
  createBooking,
  updateBookingAmount,
  getTourDetails,
  updateUserContact,
};