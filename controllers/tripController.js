const mongoose = require('mongoose');
const NewTours = require('../models/newTours');

exports.getTrips = async (req, res) => {
  try {
    // Fetch all non-deleted trips
    const trips = await NewTours.find({ isDeleted: false })
      .select('name state imageurl isActive destinations route days price tripType altitude bestSession tripCategories bestMonthToVisit travelerType activities about displayOrder')
      .sort({ displayOrder: 1, createdAt: -1 });

    // Get unique states for filter dropdown
    const states = await NewTours.distinct('state', { isDeleted: false });

    res.render('pages/admin/trips', {
      trips,
      states,
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.error('Error fetching trips:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateOrder = async (req, res) => {
  try {
    const { order } = req.body;

    if (!Array.isArray(order)) {
      return res.status(400).json({ success: false, message: 'Invalid order data' });
    }

    // Validate all IDs are valid MongoDB ObjectIds
    const isValidIds = order.every(id => mongoose.Types.ObjectId.isValid(id));
    if (!isValidIds) {
      return res.status(400).json({ success: false, message: 'Invalid trip IDs' });
    }

    // Update displayOrder for each trip
    const updatePromises = order.map(async (id, index) => {
      await NewTours.findByIdAndUpdate(id, { displayOrder: index }, { new: true });
    });

    await Promise.all(updatePromises);

    res.json({ success: true, message: 'Trip order updated successfully' });
  } catch (error) {
    console.error('Error updating trip order:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};