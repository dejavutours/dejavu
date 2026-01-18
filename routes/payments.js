const express = require('express');
const router = express.Router();
const TripBookingDetail = require('../models/TripBookingDetail');
const NewTours = require('../models/newTours');
const PaymentService = require('../services/paymentService');
const BookingLead = require('../models/BookingLead');

const parseTripDuration = (tripDuration) => {
  if (!tripDuration || typeof tripDuration !== 'string') return null;
  const match = tripDuration.match(/(\d+)\s*(?:D|Day|Days|d|\/|$)/i);
  return match ? parseInt(match[1], 10) : null;
};

router.post('/order', async (req, res) => {
  try {
    const {
      _csrf,
      tourId,
      userId,
      transportType,
      joiningFrom,
      travelDate,
      adults,
      children,
      personDetails,
      payingAmount,
      Adultprice,
      childprice,
      name,
      email,
      contact,
      paymentType,
    } = req.body;

    // Step 1: Validate required inputs
    if (!tourId || !transportType || !joiningFrom || !travelDate || !adults || !personDetails || !paymentType) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Handle BNPL separately - no payment amount required
    if (paymentType === 'bnpl') {
      // Validate tour exists
      const tour = await NewTours.findById(tourId);
      if (!tour) {
        return res.status(404).json({ success: false, message: 'Tour not found' });
      }

      // Find the selected city
      const city = tour.deptcities.find(c => c.City === joiningFrom);
      if (!city) {
        return res.status(400).json({ success: false, message: `Invalid joining city: ${joiningFrom}` });
      }

      // Validate transport type
      const transport = city.price.find(t => t.transferType === transportType);
      if (!transport) {
        return res.status(400).json({ success: false, message: `Invalid transport type: ${transportType}` });
      }

      // Validate travel date
      const tripStartDate = new Date(travelDate);
      if (isNaN(tripStartDate)) {
        return res.status(400).json({ success: false, message: 'Invalid travel date format' });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Calculate trip end date
      const tripDays = parseTripDuration(city.tripDuration) || 1;
      const tripEndDate = new Date(tripStartDate);
      tripEndDate.setDate(tripStartDate.getDate() + (tripDays - 1));

      // Calculate costs
      const adultCount = parseInt(adults);
      const childCount = parseInt(children) || 0;
      const subtotal = (adultCount * transport.adultPrice) + (childCount * transport.childPrice);
      const gst = subtotal * 0.05;
      const totalTripCostWithGST = subtotal + gst;

      // Validate personDetails array
      if (!personDetails || !Array.isArray(personDetails) || personDetails.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Person details are required. Please provide at least one person\'s information.'
        });
      }

      // Validate and process person details
      const processedPersonDetails = [];
      for (let i = 0; i < personDetails.length; i++) {
        const person = personDetails[i];

        // Validate required fields
        if (!person.firstName || !person.phone) {
          return res.status(400).json({
            success: false,
            message: `Person ${i + 1} details are incomplete. First name, surname, and phone are required.`
          });
        }


        // Validate phone format
        const cleanPhone = (person.phone || '').replace(/[^\d+]/g, '');
        if (!/^\+?\d{10,15}$/.test(cleanPhone)) {
          return res.status(400).json({
            success: false,
            message: `Person ${i + 1} phone number is invalid. Please provide a valid 10-15 digit phone number.`
          });
        }
        processedPersonDetails.push({
          firstName: person.firstName.trim(),
          phone: cleanPhone,
          isAdult:true
        });
      }

      // Validate we have processed person details
      if (processedPersonDetails.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Unable to process person details. Please check all fields are valid.'
        });
      }

      // Create booking lead with proper error handling
      try {
        const bookingLead = new BookingLead({
          tripId: tourId, // Use tourId from req.body
          userId: userId,
          guestName: (name || '').trim(),
          guestPhone: contact ? contact.replace(/[^\d+]/g, '') : null,
          guestEmail: email?.trim?.(),
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

        return res.json({
          success: true,
          message: 'Booking lead created successfully. Our team will contact you soon.',
          leadId: bookingLead._id,
          isBNPL: true,
        });
      } catch (saveError) {
        console.error('Error saving booking lead:', saveError);

        // Handle Mongoose validation errors
        if (saveError.name === 'ValidationError') {
          const validationErrors = Object.values(saveError.errors || {}).map(err => err.message).join(', ');
          return res.status(400).json({
            success: false,
            message: `Validation error: ${validationErrors}`,
            errors: saveError.errors
          });
        }

        // Handle duplicate key errors
        if (saveError.code === 11000) {
          return res.status(400).json({
            success: false,
            message: 'A booking lead with this information already exists.'
          });
        }

        // Generic error
        return res.status(500).json({
          success: false,
          message: 'Failed to create booking lead. Please try again or contact support.',
          error: process.env.NODE_ENV === 'development' ? saveError.message : undefined
        });
      }
    }

    // For full and partial payments, payingAmount is required
    if (!payingAmount) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    if (!['full', 'partial'].includes(paymentType)) {
      return res.status(400).json({ success: false, message: 'Invalid payment type' });
    }

    // Step 2: Validate tour exists
    const tour = await NewTours.findById(tourId);
    if (!tour) {
      return res.status(404).json({ success: false, message: 'Tour not found' });
    }

    // Step 3: Find the selected city in deptcities
    const city = tour.deptcities.find(c => c.City === joiningFrom);
    if (!city) {
      return res.status(400).json({ success: false, message: `Invalid joining city: ${joiningFrom}` });
    }

    // Step 4: Validate transport type and prices within the selected city
    const transport = city.price.find(t => t.transferType === transportType);
    if (!transport) {
      return res.status(400).json({ success: false, message: `Invalid transport type: ${transportType} for city ${joiningFrom}` });
    }

    // Step 5: Validate Adultprice and childprice
    if (parseInt(Adultprice) !== transport.adultPrice || parseInt(childprice) !== transport.childPrice) {
      return res.status(400).json({
        success: false,
        message: `Price mismatch for ${transportType} in ${joiningFrom}: expected adultPrice=${transport.adultPrice}, childPrice=${transport.childPrice}`,
      });
    }

    // Step 6: Validate travel date
    const tripStartDate = new Date(travelDate);
    if (isNaN(tripStartDate)) {
      return res.status(400).json({ success: false, message: 'Invalid travel date format' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (tripStartDate < today) {
      return res.status(400).json({ success: false, message: 'Travel date must be in the future' });
    }

    const year = tripStartDate.getFullYear().toString();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const month = monthNames[tripStartDate.getMonth()];
    const day = tripStartDate.getDate().toString().padStart(2, '0');

    if (!city.dates || !Array.isArray(city.dates)) {
      return res.status(400).json({ success: false, message: `Invalid date configuration for city ${joiningFrom}` });
    }

    const dateObj = city.dates.find(d => {
      const dYear = d.Year?.toString();
      const dMonth = d.Month?.toLowerCase();
      const dDates = d.dates?.split(', ').map(date => date.padStart(2, '0'));
      return dYear === year && dMonth === month.toLowerCase() && dDates?.includes(day);
    });

    if (!dateObj) {
      return res.status(400).json({
        success: false,
        message: `Travel date ${day} ${month} ${year} not available for ${joiningFrom}`,
      });
    }

    // Step 7: Validate trip duration
    const tripDays = parseTripDuration(city.tripDuration);
    if (!tripDays || tripDays <= 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid trip duration for ${joiningFrom}: must be a positive number of days`,
      });
    }

    // Step 8: Calculate trip end date
    const tripEndDate = new Date(tripStartDate);
    tripEndDate.setDate(tripStartDate.getDate() + (tripDays - 1));
    if (isNaN(tripEndDate)) {
      return res.status(400).json({ success: false, message: 'Invalid trip end date' });
    }

    // Step 9: Validate person details
    const adultCount = parseInt(adults);
    const childCount = parseInt(children) || 0;
    if (personDetails.length !== adultCount + childCount) {
      return res.status(400).json({ success: false, message: 'Person details count does not match adult/child counts' });
    }

    let adultAgeCount = 0;
    for (const person of personDetails) {
      if (!person.firstName || !person.firstName.match(/^[A-Za-z\s]+$/)) {
        return res.status(400).json({ success: false, message: 'Invalid first name: must contain only letters' });
      }
      if (!person.surname || !person.surname.match(/^[A-Za-z\s]+$/)) {
        return res.status(400).json({ success: false, message: 'Invalid surname: must contain only letters' });
      }
      if (!person.gender || !['Male', 'Female', 'Other'].includes(person.gender)) {
        return res.status(400).json({ success: false, message: 'Invalid gender' });
      }
      const birthdate = new Date(person.birthdate);
      if (isNaN(birthdate) || birthdate > today) {
        return res.status(400).json({ success: false, message: 'Invalid birthdate: must be a valid past date' });
      }
      if (!person.phone.match(/^\+?\d{10,15}$/)) {
        return res.status(400).json({ success: false, message: 'Invalid phone number: must be 10-15 digits' });
      }
      if (person.altphone && !person.altphone.match(/^\+?\d{10,15}$/)) {
        return res.status(400).json({ success: false, message: 'Invalid alternate phone number: must be 10-15 digits' });
      }

      const age = today.getFullYear() - birthdate.getFullYear() -
        (today.getMonth() < birthdate.getMonth() ||
          (today.getMonth() === birthdate.getMonth() && today.getDate() < birthdate.getDate()) ? 1 : 0);
      if (age < 5) {
        return res.status(400).json({ success: false, message: 'All travelers must be at least 5 years old' });
      }
      if (age > 10) adultAgeCount++;
    }

    if (adultAgeCount === 0) {
      return res.status(400).json({ success: false, message: 'At least one adult is required' });
    }
    if (adultAgeCount !== adultCount || (personDetails.length - adultAgeCount) !== childCount) {
      return res.status(400).json({ success: false, message: 'Age-based adult/child counts do not match selected counts' });
    }

    // Step 10: Calculate total cost
    const subtotal = (adultCount * transport.adultPrice) + (childCount * transport.childPrice);
    const gst = subtotal * 0.05;
    const totalTripCostWithGST = subtotal + gst;

    // Step 11: Validate payment amount
    const partialPayment = parseFloat(city.partialPayment) || 0;
    const submittedPayingAmount = parseFloat(payingAmount);
    let isPartial = false;

    if (paymentType === 'partial') {
      if (partialPayment <= 0) {
        return res.status(400).json({ success: false, message: `Partial payment not allowed for city ${joiningFrom}` });
      }
      if (Math.abs(submittedPayingAmount - partialPayment) > 0.01) {
        return res.status(400).json({
          success: false,
          message: `Invalid partial payment amount: expected ${partialPayment.toFixed(2)}, received ${submittedPayingAmount}`,
        });
      }
      if (partialPayment >= totalTripCostWithGST) {
        return res.status(400).json({ success: false, message: 'Partial payment cannot be greater than or equal to total cost' });
      }
      isPartial = true;
    } else if (paymentType === 'full') {
      if (Math.abs(submittedPayingAmount - totalTripCostWithGST) > 0.01) {
        return res.status(400).json({
          success: false,
          message: `Invalid full payment amount: expected ${totalTripCostWithGST.toFixed(2)}, received ${submittedPayingAmount}`,
        });
      }
    }

    // Step 12: Create booking
    const booking = new TripBookingDetail({
      userId: userId || null,
      toursSystemId: tourId,
      transportType,
      totalPerson: { adult: adultCount, child: childCount },
      personDetails: personDetails.map(person => {
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
      }),
      joiningFrom,
      tripStartDate,
      tripEndDate,
      totalTripCost: subtotal,
      totalTripCostWithGST,
      paidAmount: 0,
      duePayment: totalTripCostWithGST,
      bookingStatus: 'Pending',
      paymentStatus: 'Pending',
      email: email || null,
    });

    await booking.save();

    // Step 13: Create payment order using PaymentService
    const { order, paymentLogId } = await PaymentService.createPaymentOrder(booking._id, submittedPayingAmount);

    // Step 14: Return order details
    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },
      bookingId: booking._id,
      paymentLogId,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      name: name || 'Guest',
      email: email || '',
      contact: contact || '',
      isPartial,
    });
  } catch (err) {
    // Enhanced error logging
    console.error(`Error creating order:`, {
      tourId: req.body.tourId,
      travelDate: req.body.travelDate,
      paymentType: req.body.paymentType,
      userId: req.body.userId,
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      validationErrors: err.name === 'ValidationError' ? err.errors : undefined,
    });

    // Handle specific error types
    if (err.name === 'ValidationError') {
      const validationErrors = Object.values(err.errors || {}).map(e => e.message).join(', ');
      return res.status(400).json({
        success: false,
        message: `Validation error: ${validationErrors}`,
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }

    if (err.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid data format. Please check all fields and try again.',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }

    // Generic server error
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again or contact support.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, paymentLogId } = req.body;

    const result = await PaymentService.verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature, paymentLogId);
    res.json(result);
  } catch (err) {
    console.error('Error verifying payment:', {
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again or contact support.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Manual payment recording (for admin)
router.post('/manual-payment', async (req, res) => {
  try {
    const { bookingId, amount, paymentMethod, referenceId, notes } = req.body;

    // Validate required fields
    if (!bookingId || !amount || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: bookingId, amount, and paymentMethod are required'
      });
    }

    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment amount. Amount must be a positive number.'
      });
    }

    // Find booking
    const booking = await TripBookingDetail.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Validate payment amount doesn't exceed due amount
    const currentDue = booking.totalTripCostWithGST - booking.paidAmount;
    if (paymentAmount > currentDue) {
      return res.status(400).json({
        success: false,
        message: `Payment amount (${paymentAmount}) exceeds due amount (${currentDue})`
      });
    }

    // Find tour for document generation
    const tour = await NewTours.findById(booking.toursSystemId);
    if (!tour) {
      return res.status(404).json({
        success: false,
        message: 'Tour not found'
      });
    }

    // Create payment log
    const PaymentLog = require('../models/PaymentLog');
    const generateReceiptPDF = require('../util/generateReceiptPDF');
    const generateInvoicePDF = require('../util/generateInvoicePDF');
    const path = require('path');
    const fs = require('fs');

    const paymentLog = new PaymentLog({
      bookingId: booking._id,
      amount: paymentAmount,
      paymentDate: new Date(),
      paymentMethod: paymentMethod,
      status: 'success',
      transactionDetails: {
        referenceId: referenceId || `MANUAL-${booking._id}-${Date.now()}`,
        notes: notes || 'Payment recorded manually by admin',
      },
    });
    await paymentLog.save();

    // Update booking payment details (aligned with user-side logic)
    booking.paidAmount += paymentAmount;
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
      console.error('Error generating receipt PDF for manual payment:', {
        bookingId: booking._id,
        paymentLogId: paymentLog._id,
        error: receiptError.message,
        stack: process.env.NODE_ENV === 'development' ? receiptError.stack : undefined,
      });
      // Continue even if receipt generation fails
    }

    // Generate invoice ONLY if payment is fully paid (matching user-side expectation)
    // For partial payments, invoice is NOT generated
    if (booking.paymentStatus === 'Paid' && booking.duePayment === 0) {
      try {
        if (!booking.invoicePath) {
          // First full payment: generate a new invoice
          const invoiceFileName = `invoice_${booking.bookingNumber}_${booking._id}.pdf`;
          const invoicePath = path.join(__dirname, '..', 'paymentdocs', 'invoices', invoiceFileName);
          
          // Ensure invoices directory exists
          const invoicesDir = path.dirname(invoicePath);
          if (!fs.existsSync(invoicesDir)) {
            fs.mkdirSync(invoicesDir, { recursive: true });
          }
          
          await generateInvoicePDF(booking, tour, invoicePath);
          booking.invoicePath = invoicePath;
        } else {
          // Subsequent full payment: update the existing invoice
          await generateInvoicePDF(booking, tour, booking.invoicePath);
        }
        await booking.save();
      } catch (invoiceError) {
        console.error('Error generating/updating invoice for manual payment:', {
          bookingId: booking._id,
          error: invoiceError.message,
          stack: process.env.NODE_ENV === 'development' ? invoiceError.stack : undefined,
        });
        // Continue even if invoice generation fails
      }
    }
    // For partial payments, invoice is NOT generated (matching user-side expectation)

    res.json({
      success: true,
      message: 'Payment recorded successfully',
      booking: {
        _id: booking._id,
        bookingNumber: booking.bookingNumber,
        paidAmount: booking.paidAmount,
        duePayment: booking.duePayment,
        paymentStatus: booking.paymentStatus,
      },
      paymentLog: {
        _id: paymentLog._id,
        amount: paymentLog.amount,
        receiptPath: paymentLog.receiptPath,
      },
    });
  } catch (err) {
    console.error('Error recording manual payment:', {
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again or contact support.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});


module.exports = router;