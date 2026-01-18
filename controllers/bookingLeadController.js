const mongoose = require('mongoose');
const BookingLead = require('../models/BookingLead');
const TripBookingDetail = require('../models/TripBookingDetail');
const NewTours = require('../models/newTours');
const MobileUser = require('../models/mobileuser');
const GmailUser = require('../models/gmailuser');
const generateInvoicePDF = require('../util/generateInvoicePDF');
const generateReceiptPDF = require('../util/generateReceiptPDF');
const EmailService = require('../util/emailService');
const PaymentLog = require('../models/PaymentLog');
const path = require('path');
const fs = require('fs');

// Create a new booking lead (for BNPL)
const createBookingLead = async (req, res) => {
  try {
    const {
      tripId,
      userId,
      guestName,
      guestPhone,
      guestEmail,
      transportType,
      joiningFrom,
      travelDate,
      adults,
      children,
      personDetails,
      Adultprice,
      childprice,
      name,
      email,
      contact,
    } = req.body;

    // Validate required fields
    if (!tripId || !transportType || !joiningFrom || !travelDate || !adults || !personDetails) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Validate tour exists
    const tour = await NewTours.findById(tripId);
    if (!tour) {
      return res.status(404).json({ success: false, message: 'Tour not found' });
    }

    // Find the selected city in deptcities
    const city = tour.deptcities.find(c => c.City === joiningFrom);
    if (!city) {
      return res.status(400).json({ success: false, message: `Invalid joining city: ${joiningFrom}` });
    }

    // Validate transport type and prices
    const transport = city.price.find(t => t.transferType === transportType);
    if (!transport) {
      return res.status(400).json({ success: false, message: `Invalid transport type: ${transportType} for city ${joiningFrom}` });
    }

    // Validate travel date
    const tripStartDate = new Date(travelDate);
    if (isNaN(tripStartDate)) {
      return res.status(400).json({ success: false, message: 'Invalid travel date format' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate trip end date
    const tripDays = parseInt(city.tripDuration) || 1;
    const tripEndDate = new Date(tripStartDate);
    tripEndDate.setDate(tripStartDate.getDate() + (tripDays - 1));

    // Calculate total cost
    const adultCount = parseInt(adults);
    const childCount = parseInt(children) || 0;
    const subtotal = (adultCount * transport.adultPrice) + (childCount * transport.childPrice);
    const gst = subtotal * 0.05;
    const totalTripCostWithGST = subtotal + gst;

    // Process person details
    const processedPersonDetails = personDetails.map(person => {
      const birthdate = new Date(person.birthdate);
      const age = today.getFullYear() - birthdate.getFullYear() -
        (today.getMonth() < birthdate.getMonth() ||
          (today.getMonth() === birthdate.getMonth() && today.getDate() < birthdate.getDate()) ? 1 : 0);
      return {
        firstName: person.firstName,
        surname: person.surname,
        gender: person.gender,
        birthdate: birthdate,
        phone: person.phone,
        altphone: person.altphone || '',
        isAdult: age > 10,
      };
    });

    // Create booking lead
    const bookingLead = new BookingLead({
      tripId,
      userId: userId ,
      guestName: guestName || name ,
      guestPhone: guestPhone || contact ,
      guestEmail: guestEmail || email ,
      transportType,
      joiningFrom,
      tripStartDate,
      tripEndDate,
      totalPerson: { adult: adultCount, child: childCount },
      personDetails: processedPersonDetails,
      totalTripCost: subtotal,
      totalTripCostWithGST,
      callbackRequested: true,
      leadStatus: 'pending',
      createdBy: 'user',
    });

    await bookingLead.save();

    res.json({
      success: true,
      message: 'Booking lead created successfully. Our team will contact you soon.',
      leadId: bookingLead._id,
    });
  } catch (err) {
    console.error('Error creating booking lead:', {
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      validationErrors: err.name === 'ValidationError' ? err.errors : undefined,
    });
    
    if (err.name === 'ValidationError') {
      const validationErrors = Object.values(err.errors || {}).map(e => e.message).join(', ');
      return res.status(400).json({ 
        success: false, 
        message: `Validation error: ${validationErrors}`,
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again or contact support.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Get booking leads list (admin)
const getBookingLeads = async (req, res) => {
  try {
    const { leadStatus, tripId, tripStartDate, page = 1 } = req.query;
    const limit = 10;
    const skip = (page - 1) * limit;
    const query = {};
    const filters = { leadStatus, tripId, tripStartDate };

    if (leadStatus) query.leadStatus = leadStatus;
    if (tripId) query.tripId = tripId;
    if (tripStartDate) {
      const startDate = new Date(tripStartDate);
      query.tripStartDate = { $gte: startDate, $lte: new Date(startDate.setHours(23, 59, 59)) };
    }

    const totalLeads = await BookingLead.countDocuments(query);
    const leads = await BookingLead.find(query)
      .populate('tripId', 'name state destinations')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const enrichedLeads = await Promise.all(leads.map(async (lead) => {
      let userDetails = null;
      if (lead.userId && mongoose.Types.ObjectId.isValid(lead.userId)) {
        userDetails = await MobileUser.findOne({ _id: lead.userId });
        if (!userDetails) {
          userDetails = await GmailUser.findOne({ _id: lead.userId });
        }
      }
      return {
        ...lead.toObject(),
        userDetails,
        tourDetails: lead.tripId,
      };
    }));

    // Get status counts for stats
    const statusCounts = await BookingLead.aggregate([
      { $group: { _id: '$leadStatus', count: { $sum: 1 } } },
      { $project: { status: '$_id', count: 1, _id: 0 } }
    ]);

    const stats = {
      totalLeads: await BookingLead.countDocuments(),
      pendingLeads: await BookingLead.countDocuments({ leadStatus: 'pending' }),
      contactedLeads: await BookingLead.countDocuments({ leadStatus: 'contacted' }),
      convertedLeads: await BookingLead.countDocuments({ leadStatus: 'converted' }),
      statusCounts,
    };

    res.render('pages/admin/booking-leads', {
      leads: enrichedLeads,
      stats,
      filters,
      error: null,
      totalLeads,
      csrfToken: req.csrfToken(),
      currentPage: parseInt(page),
    });
  } catch (err) {
    console.error('Error fetching booking leads:', {
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
    res.status(500).render('pages/admin/booking-leads', {
      leads: [],
      stats: {
        totalLeads: 0,
        pendingLeads: 0,
        contactedLeads: 0,
        convertedLeads: 0,
        statusCounts: [],
      },
      filters: {},
      error: 'Failed to load booking leads. Please try again later.',
      totalLeads: 0,
      currentPage: 1,
      csrfToken: req.csrfToken(),
    });
  }
};

// Get booking lead details (admin)
const getBookingLeadDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).render('pages/admin/booking-lead-detail', {
        lead: null,
        error: 'Invalid lead ID',
        csrfToken: req.csrfToken(),
      });
    }

    const lead = await BookingLead.findById(id).populate({
      path: 'tripId',
      select: 'name state destinations price about activities deptcities',
    });

    if (!lead) {
      return res.status(404).render('pages/admin/booking-lead-detail', {
        lead: null,
        error: 'Booking lead not found',
        csrfToken: req.csrfToken(),
      });
    }

    let userDetails = null;
    try {
      if (lead.userId && mongoose.Types.ObjectId.isValid(lead.userId)) {
        userDetails = await MobileUser.findOne({ _id: lead.userId });
        if (!userDetails) {
          userDetails = await GmailUser.findOne({ _id: lead.userId });
        }
      }
    } catch (err) {
      console.error(`Error fetching user details for userId: ${lead.userId}`, err);
    }

    // Get converted booking if exists
    let convertedBooking = null;
    if (lead.convertedToBookingId) {
      convertedBooking = await TripBookingDetail.findById(lead.convertedToBookingId)
        .populate('toursSystemId', 'name');
    }

    const enrichedLead = {
      ...lead.toObject(),
      userDetails: userDetails ? userDetails.toObject() : null,
      tourDetails: lead.tripId ? lead.tripId.toObject() : null,
      convertedBooking,
    };

    res.render('pages/admin/booking-lead-detail', {
      lead: enrichedLead,
      error: lead.tripId ? null : 'Tour details not found for this lead',
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.error(`Error in getBookingLeadDetails for leadId: ${req.params.id}`, {
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
    res.status(500).render('pages/admin/booking-lead-detail', {
      lead: null,
      error: 'Failed to load booking lead details. Please try again or contact support.',
      csrfToken: req.csrfToken(),
    });
  }
};

// Update lead status
const updateLeadStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { leadStatus, adminNotes } = req.body;

    if (!['pending', 'contacted', 'converted', 'rejected', 'expired'].includes(leadStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const lead = await BookingLead.findById(id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Booking lead not found' });
    }

    lead.leadStatus = leadStatus;
    if (adminNotes !== undefined) {
      lead.adminNotes = adminNotes;
    }
    await lead.save();

    res.json({ success: true, message: 'Lead status updated successfully', lead });
  } catch (err) {
    console.error('Error updating lead status:', {
      leadId: req.params.id,
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
    
    if (err.name === 'ValidationError') {
      const validationErrors = Object.values(err.errors || {}).map(e => e.message).join(', ');
      return res.status(400).json({ 
        success: false, 
        message: `Validation error: ${validationErrors}`,
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again or contact support.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// // Convert lead to booking
// const convertLeadToBooking = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { adminFinalAmount, paymentStatus, bookingStatus, adminNotes } = req.body;

//     const lead = await BookingLead.findById(id).populate('tripId');
//     if (!lead) {
//       return res.status(404).json({ success: false, message: 'Booking lead not found' });
//     }

//     if (lead.leadStatus === 'converted') {
//       return res.status(400).json({ success: false, message: 'Lead has already been converted' });
//     }

//     // Calculate final amount and discount
//     const finalAmount = adminFinalAmount !== undefined ? parseFloat(adminFinalAmount) : lead.totalTripCostWithGST;
//     const discountAmount = Math.max(0, lead.totalTripCostWithGST - finalAmount);

//     // Get user email if exists
//     let userEmail = lead.guestEmail || null;
//     if (!userEmail && lead.userId && mongoose.Types.ObjectId.isValid(lead.userId)) {
//       const mobileUser = await MobileUser.findById(lead.userId);
//       if (mobileUser) {
//         userEmail = mobileUser.details?.email || null;
//       } else {
//         const gmailUser = await GmailUser.findById(lead.userId);
//         if (gmailUser) {
//           userEmail = gmailUser.email || null;
//         }
//       }
//     }

//     // Create booking from lead
//     const booking = new TripBookingDetail({
//       userId: lead.userId || null,
//       toursSystemId: lead.tripId._id,
//       transportType: lead.transportType,
//       totalPerson: lead.totalPerson,
//       personDetails: lead.personDetails,
//       joiningFrom: lead.joiningFrom,
//       tripStartDate: lead.tripStartDate,
//       tripEndDate: lead.tripEndDate,
//       totalTripCost: lead.totalTripCost,
//       totalTripCostWithGST: finalAmount, // Use final amount
//       paidAmount: 0,
//       duePayment: finalAmount,
//       bookingStatus: bookingStatus || 'Pending',
//       paymentStatus: paymentStatus || 'Pending',
//       email: userEmail,
//       adminFinalAmount: finalAmount,
//       discountAmount,
//       createdBy: 'lead_conversion',
//       adminNotes: adminNotes || '',
//       sourceLeadId: lead._id,
//     });

//     await booking.save();

//     // Update lead
//     lead.leadStatus = 'converted';
//     lead.convertedToBookingId = booking._id;
//     if (adminNotes) {
//       lead.adminNotes = adminNotes;
//     }
//     await lead.save();

//     // Generate invoice PDF and send email notifications (non-blocking)
//     let paymentLog = null;
//     try {
//       // Ensure tour is populated for PDF generation
//       const tour = await NewTours.findById(lead.tripId._id);
//       if (!tour) {
//         console.warn(`Tour not found for lead conversion: ${lead.tripId._id}`);
//       } else {
//         // Generate invoice PDF
//         try {
//           const invoiceFileName = `invoice_${booking.bookingNumber}_${booking._id}.pdf`;
//           const invoicePath = path.join(__dirname, '..', 'paymentdocs', 'invoices', invoiceFileName);
          
//           // Ensure invoices directory exists
//           const invoicesDir = path.dirname(invoicePath);
//           if (!fs.existsSync(invoicesDir)) {
//             fs.mkdirSync(invoicesDir, { recursive: true });
//           }
          
//           await generateInvoicePDF(booking, tour, invoicePath);
//           booking.invoicePath = invoicePath;
//           await booking.save();
//         } catch (pdfError) {
//           console.error('Error generating invoice PDF during lead conversion:', {
//             bookingId: booking._id,
//             error: pdfError.message,
//             stack: process.env.NODE_ENV === 'development' ? pdfError.stack : undefined,
//           });
//           // Continue even if PDF generation fails
//         }

//         // If payment status is 'Paid', create a PaymentLog and generate receipt
//         if (paymentStatus === 'Paid' && finalAmount > 0) {
//           try {
//             paymentLog = new PaymentLog({
//               bookingId: booking._id,
//               amount: finalAmount,
//               paymentDate: new Date(),
//               paymentMethod: 'manual',
//               status: 'success',
//               transactionDetails: {
//                 referenceId: `LEAD-${lead._id}`,
//                 notes: 'Payment recorded during lead conversion',
//               },
//             });
//             await paymentLog.save();

//             // Update booking payment details
//             booking.paidAmount = finalAmount;
//             booking.duePayment = 0;
//             booking.paymentStatus = 'Paid';
//             await booking.save();

//             // Generate receipt PDF
//             try {
//               const receiptFileName = `receipt_${booking.bookingNumber}_${booking._id}_${paymentLog._id}.pdf`;
//               const receiptPath = path.join(__dirname, '..', 'paymentdocs', 'receipts', receiptFileName);
              
//               // Ensure receipts directory exists
//               const receiptsDir = path.dirname(receiptPath);
//               if (!fs.existsSync(receiptsDir)) {
//                 fs.mkdirSync(receiptsDir, { recursive: true });
//               }
              
//               await generateReceiptPDF(booking, tour, paymentLog, receiptPath);
//               paymentLog.receiptPath = receiptPath;
//               await paymentLog.save();
//             } catch (receiptError) {
//               console.error('Error generating receipt PDF during lead conversion:', {
//                 bookingId: booking._id,
//                 paymentLogId: paymentLog._id,
//                 error: receiptError.message,
//                 stack: process.env.NODE_ENV === 'development' ? receiptError.stack : undefined,
//               });
//               // Continue even if receipt generation fails
//             }
//           } catch (paymentLogError) {
//             console.error('Error creating payment log during lead conversion:', {
//               bookingId: booking._id,
//               error: paymentLogError.message,
//               stack: process.env.NODE_ENV === 'development' ? paymentLogError.stack : undefined,
//             });
//             // Continue even if payment log creation fails
//           }
//         }

//         // Send email notifications (only if email exists)
//         if (userEmail) {
//           try {
//             await EmailService.sendBookingConfirmation(booking, tour, paymentLog);
//             await EmailService.sendAdminNotification(booking, tour, paymentLog);
//           } catch (emailError) {
//             console.error('Error sending email notifications during lead conversion:', {
//               bookingId: booking._id,
//               email: userEmail,
//               error: emailError.message,
//               stack: process.env.NODE_ENV === 'development' ? emailError.stack : undefined,
//             });
//             // Continue even if email sending fails
//           }
//         } else {
//           console.warn(`No email address found for booking ${booking.bookingNumber}, skipping email notification`);
//         }
//       }
//     } catch (notificationError) {
//       console.error('Error in post-conversion notifications:', {
//         bookingId: booking._id,
//         error: notificationError.message,
//         stack: process.env.NODE_ENV === 'development' ? notificationError.stack : undefined,
//       });
//       // Don't fail the conversion if notifications fail
//     }

//     res.json({
//       success: true,
//       message: 'Lead converted to booking successfully',
//       bookingId: booking._id,
//       bookingNumber: booking.bookingNumber,
//     });
//   } catch (err) {
//     console.error('Error converting lead to booking:', {
//       leadId: req.params.id,
//       error: err.message,
//       stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
//       validationErrors: err.name === 'ValidationError' ? err.errors : undefined,
//     });
    
//     if (err.name === 'ValidationError') {
//       const validationErrors = Object.values(err.errors || {}).map(e => e.message).join(', ');
//       return res.status(400).json({ 
//         success: false, 
//         message: `Validation error: ${validationErrors}`,
//         error: process.env.NODE_ENV === 'development' ? err.message : undefined
//       });
//     }
    
//     res.status(500).json({ 
//       success: false, 
//       message: 'Server error. Please try again or contact support.',
//       error: process.env.NODE_ENV === 'development' ? err.message : undefined
//     });
//   }
// };

// Delete lead
const deleteLead = async (req, res) => {
  try {
    const { id } = req.params;

    const lead = await BookingLead.findById(id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Booking lead not found' });
    }

    if (lead.leadStatus === 'converted') {
      return res.status(400).json({ success: false, message: 'Cannot delete a converted lead' });
    }

    await BookingLead.findByIdAndDelete(id);

    res.json({ success: true, message: 'Lead deleted successfully' });
  } catch (err) {
    console.error('Error deleting lead:', {
      leadId: req.params.id,
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again or contact support.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Get user's booking leads (for profile)
const getUserBookingLeads = async (req, res) => {
  try {
    const { verifiedPhoneNumber, user } = req;
    const { crrPage = 1, pageLimit = 10 } = req.body;

    let userInfo;
    if (user) {
      const email = user.email || '';
      userInfo = await GmailUser.findOne({ email });
    } else if (verifiedPhoneNumber) {
      userInfo = await MobileUser.findOne({ phoneNumber: verifiedPhoneNumber });
    }

    if (!userInfo) {
      return res.status(404).json({ error: 'User not found' });
    }

    const filter = {
      userId: userInfo._id.toString(),
      leadStatus: { $in: ['pending', 'contacted'] },
    };

    const items = await BookingLead.find(filter)
      .populate('tripId', 'name imageurl state')
      .skip((crrPage - 1) * pageLimit)
      .limit(pageLimit)
      .sort({ createdAt: -1 })
      .lean();

    const totalItems = await BookingLead.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / pageLimit);

    res.json({ items, paginationDet: { crrPage, totalPages } });
  } catch (err) {
    console.error('Error fetching user booking leads:', {
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
    res.status(500).json({ 
      error: 'Server error. Please try again or contact support.',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Get booking leads statistics (for badges and dashboard)
const getBookingLeadsStats = async (req, res) => {
  try {
    const pendingCount = await BookingLead.countDocuments({ leadStatus: 'pending' });
    const contactedCount = await BookingLead.countDocuments({ leadStatus: 'contacted' });
    const convertedCount = await BookingLead.countDocuments({ leadStatus: 'converted' });
    const totalCount = await BookingLead.countDocuments({});

    res.json({
      success: true,
      stats: {
        pending: pendingCount,
        contacted: contactedCount,
        converted: convertedCount,
        total: totalCount,
      },
    });
  } catch (err) {
    console.error('Error fetching booking leads stats:', {
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again or contact support.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

module.exports = {
  createBookingLead,
  getBookingLeads,
  getBookingLeadDetails,
  updateLeadStatus,
  deleteLead,
  getUserBookingLeads,
  getBookingLeadsStats,
};

