const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const TripBookingDetail = require('../models/TripBookingDetail');
const NewTours = require('../models/newTours');
const { nanoid } = require('nanoid');

// Initialize Razorpay instance
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Razorpay order and save booking
router.post('/order', async (req, res) => {
  try {
    const {
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
    } = req.body;

    // Validate inputs
    if (!tourId || !transportType || !joiningFrom || !travelDate || !adults || !personDetails || !payingAmount) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Validate tour exists
    const tour = await NewTours.findById(tourId);
    if (!tour) {
      return res.status(404).json({ success: false, message: 'Tour not found' });
    }

    // Validate transport type exists
    const transport = tour.deptcities
      .flatMap(city => city.price)
      .find(t => t.transferType === transportType);
    if (!transport) {
      return res.status(400).json({ success: false, message: 'Invalid transport type' });
    }

    // Validate joining city and travel date
      const city = tour.deptcities.find(c => c.City === joiningFrom);
      if (!city) {
        return res.status(400).json({ success: false, message: 'Invalid joining city' });
      }
      const [startDateStr, endDateStr] = travelDate.split(' to ');
      const [startDay, startMonth, startYear] = startDateStr.split(' ');
      const monthMap = { 'Jan': 'January', 'Feb': 'February', 'Mar': 'March', 'Apr': 'April', 'May': 'May', 'Jun': 'June', 'Jul': 'July', 'Aug': 'August', 'Sep': 'September', 'Oct': 'October', 'Nov': 'November', 'Dec': 'December' };
      const normalizedMonth = monthMap[startMonth] || startMonth;
      const dateObj = city.dates.find(d => d.Year === startYear && d.Month === normalizedMonth && d.dates.split(', ').includes(parseInt(startDay).toString()));
      if (!dateObj) {
        return res.status(400).json({ success: false, message: 'Invalid travel date' });
      }

      // Parse travel date (e.g., "13 Jul 2025 to 14 Jul 2025")
      const tripStartDate = new Date(`${startDay.padStart(2, '0')} ${normalizedMonth} ${startYear} 00:00:00 UTC`);
      const tripEndDate = new Date(`${endDateStr} 00:00:00 UTC`);
      if (isNaN(tripStartDate) || isNaN(tripEndDate)) {
        return res.status(400).json({ success: false, message: 'Invalid travel date format' });
      }
      // Validate end date (1 day after start for 1-day trip)
      // const expectedEndDate = new Date(tripStartDate);
      // expectedEndDate.setDate(tripStartDate.getDate() + 1);
      // if (tripEndDate.getTime() !== expectedEndDate.getTime()) {
      //   return res.status(400).json({ success: false, message: 'End date must be one day after start date' });
      // }

    // Validate person details
    const adultCount = parseInt(adults);
    const childCount = parseInt(children) || 0;
    if (personDetails.length !== adultCount + childCount) {
      return res.status(400).json({ success: false, message: 'Person details count does not match adult/child counts' });
    }

    let adultAgeCount = 0;
    const today = new Date();
    for (const person of personDetails) {
      const birthdate = new Date(person.birthdate);
      const age = today.getFullYear() - birthdate.getFullYear() - 
        (today.getMonth() < birthdate.getMonth() || 
         (today.getMonth() === birthdate.getMonth() && today.getDate() < birthdate.getDate()) ? 1 : 0);
      if (age > 10) adultAgeCount++;
      if (!person.gender || !person.birthdate || !person.phone.match(/^\+?\d{10,15}$/)) {
        return res.status(400).json({ success: false, message: 'Invalid person details: gender, birthdate, and phone are required' });
      }
    }
    if (adultAgeCount === 0) {
      return res.status(400).json({ success: false, message: 'At least one adult is required' });
    }
    if (adultAgeCount > adultCount || (personDetails.length - adultAgeCount) > childCount) {
      return res.status(400).json({ success: false, message: 'Age-based adult/child counts do not match selected counts' });
    }

    // Calculate total cost
    const subtotal = (adultCount * parseInt(Adultprice)) + (childCount * parseInt(childprice));
    const gst = subtotal * 0.05;
    const totalTripCost = subtotal + gst;
    if (parseFloat(payingAmount) !== totalTripCost) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount' });
    }

    // Create booking
    const booking = new TripBookingDetail({
      userId: userId,
      toursSystemId: tourId,
      transportType,
      totalPerson: { adult: adultCount, child: childCount },
      personDetails: personDetails.map(person => {
        const birthdate = new Date(person.birthdate);
        const age = today.getFullYear() - birthdate.getFullYear() - 
          (today.getMonth() < birthdate.getMonth() || 
           (today.getMonth() === birthdate.getMonth() && today.getDate() < birthdate.getDate()) ? 1 : 0);
        return {
          firstName: person.firstName || '',
          surname: person.surname || '',
          gender: person.gender,
          birthdate: birthdate,
          phone: person.phone,
          altphone: person.altphone || '',
          isAdult: age > 10
        };
      }),
      joiningFrom,
      tripStartDate,
      tripEndDate,
      totalTripCost,
      paidAmount: 0,
      duePayment: totalTripCost,
      bookingStatus: 'Pending',
      paymentStatus: 'Pending',
    });

    await booking.save();

    // Create Razorpay order
    const order = await razorpayInstance.orders.create({
      amount: totalTripCost * 100, // In paise
      currency: 'INR',
      receipt: nanoid(),
      payment_capture: '1',
    });

    // Store order details
    booking.paidAmountRef.push({
      isThroughPymtGateway: true,
      orderId: order.id,
      paymentDate: new Date(),
      amount: totalTripCost,
    });
    await booking.save();

    // Return order details for frontend modal
    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },
      bookingId: booking._id,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      name: name || 'Guest',
      email: email || '',
      contact: contact || '',
    });
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// Verify payment and update booking
router.post('/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      // Payment verified
      const booking = await TripBookingDetail.findById(bookingId);
      if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
      }

      booking.paidAmount = booking.totalTripCost;
      booking.duePayment = 0;
      booking.paymentStatus = 'Paid';
      booking.bookingStatus = 'Confirmed';
      booking.paidAmountRef[booking.paidAmountRef.length - 1].paymentId = razorpay_payment_id;

      await booking.save();

      res.json({ success: true, message: 'Payment successful', booking });
    } else {
      // Signature mismatch
      const booking = await TripBookingDetail.findById(bookingId);
      if (booking) {
        booking.paymentStatus = 'Failed';
        booking.bookingStatus = 'Cancelled';
        await booking.save();
      }

      res.json({ success: false, message: 'Payment verification failed' });
    }
  } catch (err) {
    console.error('Error verifying payment:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

module.exports = router;