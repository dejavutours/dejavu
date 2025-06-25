const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const TripBookingDetail = require('../models/TripBookingDetail');
const NewTours = require('../models/newTours');
const MobileUser = require('../models/mobileuser');
const GmailUser = require('../models/gmailuser');
const PaymentLog = require('../models/PaymentLog');
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

// Get booking details
const getBookingDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.warn(`Invalid booking ID: ${id}`);
      return res.status(400).render('pages/admin/booking-detail', {
        booking: null,
        error: 'Invalid booking ID',
        csrfToken: req.csrfToken()
      });
    }

    const booking = await TripBookingDetail.findById(id).populate({
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

    let userDetails = null;
    try {
      if (mongoose.Types.ObjectId.isValid(booking.userId)) {
        userDetails = await MobileUser.findOne({ _id: booking.userId });
        if (!userDetails) {
          userDetails = await GmailUser.findOne({ _id: booking.userId });
        }
      }
    } catch (err) {
      console.error(`Error fetching user details for userId: ${booking.userId}`, err);
    }

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
  downloadReceipt
};