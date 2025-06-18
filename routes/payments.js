const express = require('express');
const router = express.Router();
const TripBookingDetail = require('../models/TripBookingDetail');
const NewTours = require('../models/newTours');
const PaymentService = require('../services/paymentService');

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
    if (!tourId || !transportType || !joiningFrom || !travelDate || !adults || !personDetails || !payingAmount || !paymentType) {
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
    console.error(`Error creating order: tourId=${req.body.tourId}, travelDate=${req.body.travelDate}`, err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, paymentLogId } = req.body;

    const result = await PaymentService.verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature, paymentLogId);
    res.json(result);
  } catch (err) {
    console.error('Error verifying payment:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// New endpoint for admin to record manual payments
router.post('/manual-payment', async (req, res) => {
  try {
    const { bookingId, amount, paymentMethod, referenceId, notes } = req.body;

    if (!bookingId || !amount || !paymentMethod) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const paymentLog = await PaymentService.recordManualPayment(bookingId, amount, paymentMethod, referenceId, notes);
    res.json({ success: true, paymentLog });
  } catch (err) {
    console.error('Error recording manual payment:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

module.exports = router;