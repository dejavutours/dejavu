const CustomTrip = require('../models/customTripSchema');

// Get all custom trips
exports.getCustomTrips = async (req, res) => {
  try {
    const customTrips = await CustomTrip.find().sort({ createdAt: -1 }); // Sort by latest
    res.render('pages/admin/customTrip', {
      customTrips,
      csrfToken: req.csrfToken(),
    });
  } catch (error) {
    console.error('Error fetching custom trips:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete custom trip
exports.deleteCustomTrip = async (req, res) => {
  try {
    const { id } = req.params;
    await CustomTrip.findByIdAndDelete(id);
    res.json({ success: true, message: 'Custom trip deleted successfully' });
  } catch (error) {
    console.error('Error deleting custom trip:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Bulk delete custom trips
exports.bulkDeleteCustomTrips = async (req, res) => {
  try {
    const { ids } = req.body;
    await CustomTrip.deleteMany({ _id: { $in: ids } });
    res.json({ success: true, message: 'Selected custom trips deleted successfully' });
  } catch (error) {
    console.error('Error bulk deleting custom trips:', error);
    res.status(500).json({ error: 'Server error' });
  }
};