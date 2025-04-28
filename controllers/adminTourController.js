const NewTours = require('../models/newTours');
const TripBookingDetail = require('../models/TripBookingDetail');
const path = require('path');
const fileHelper = require('../util/file');

/**
 * Get tours with filters, pagination, and analytics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getTours = async (req, res) => {
  try {
    const { status, state, priceMin, priceMax, destinations, page = 1 } = req.query;
    const limit = 10;
    const skip = (page - 1) * limit;
    const query = {};

    // Build query based on filters
    if (status) query.isActive = status === 'true';
    if (state) query.state = state;
    if (priceMin && !isNaN(parseInt(priceMin))) query.price = { $gte: parseInt(priceMin) };
    if (priceMax && !isNaN(parseInt(priceMax))) query.price = { ...query.price, $lte: parseInt(priceMax) };
    if (destinations) query.destinations = { $regex: destinations, $options: 'i' };

    // Fetch tours and analytics
    const totalTours = await NewTours.countDocuments(query);
    const tourPackages = await NewTours.find(query)
      .sort({ displayOrder: 1 })
    //   .skip(skip)
    //   .limit(limit)
      .lean();
    const states = await NewTours.distinct('state');
    const stats = {
      totalTours: await NewTours.countDocuments(),
      activeTours: await NewTours.countDocuments({ isActive: true }),
      totalBookings: await TripBookingDetail.countDocuments(),
      bookingTrends: await TripBookingDetail.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { '_id': 1 } },
        { $project: { date: '$_id', count: 1, _id: 0 } },
      ]),
    };

    // Sanitize tourPackages data
    tourPackages.forEach(tour => {
      tour.name = (tour.name || '').replace(/[()"]/g, ''); // Remove parentheses and quotes
      tour.state = (tour.state || '').replace(/[()"]/g, '');
      tour.destinations = (tour.destinations || '').replace(/[()"]/g, '');
      tour.price = tour.price || 0;
      tour.isActive = !!tour.isActive;
      tour.imageurl = (tour.imageurl || '').replace(/[()"]/g, '');
      tour.bannerimages = Array.isArray(tour.bannerimages) ? tour.bannerimages.map(img => img.replace(/[()"]/g, '')) : [];
      tour.documentUrl = (tour.documentUrl || '').replace(/[()"]/g, '');
      tour.metaKeywords = Array.isArray(tour.metaKeywords) ? tour.metaKeywords.map(k => k.replace(/[()"]/g, '')) : [];
      tour.metaDescription = (tour.metaDescription || '').replace(/[()"]/g, '');
      tour.displayOrder = tour.displayOrder || 0;
      tour._id = tour._id ? tour._id.toString() : '';
    });

    // Sanitize states
    states.forEach((state, index) => {
      states[index] = (state || '').replace(/[()"]/g, '');
    });

    // Sanitize filters
    const filters = {
      status: (status || '').replace(/[()"]/g, ''),
      state: (state || '').replace(/[()"]/g, ''),
      priceMin: (priceMin || '').replace(/[()"]/g, ''),
      priceMax: (priceMax || '').replace(/[()"]/g, ''),
      destinations: (destinations || '').replace(/[()"]/g, ''),
    };

    // Log data for debugging
    console.log('tourPackages:', JSON.stringify(tourPackages, null, 2));
    console.log('stats:', stats);
    console.log('states:', states);
    console.log('filters:', filters);

    // Render dashboard
    res.render('pages/admin/tourManagement', {
      tourPackages,
      stats: stats || { totalTours: 0, activeTours: 0, totalBookings: 0, bookingTrends: [] },
      states: states || [],
      filters,
      totalTours: totalTours || 0,
      currentPage: parseInt(page) || 1,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      profile: req.session.passport?.user || {},
      error: null,
    });
  } catch (err) {
    console.error('Error fetching tours:', err);
    res.status(500).render('pages/admin/tourManagement', {
      tourPackages: [],
      stats: { totalTours: 0, activeTours: 0, totalBookings: 0, bookingTrends: [] },
      states: [],
      filters: {},
      totalTours: 0,
      currentPage: 1,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      profile: req.session.passport?.user || {},
      error: 'Failed to load tours. Please try again.',
    });
  }
};

// Other controller functions remain unchanged
exports.updateTourOrder = async (req, res) => {
  const { order } = req.body;
  try {
    if (!Array.isArray(order)) throw new Error('Invalid order data');
    for (const item of order) {
      if (!item.id || typeof item.displayOrder !== 'number') throw new Error('Invalid order item');
      await NewTours.findByIdAndUpdate(item.id, { displayOrder: item.displayOrder });
    }
    res.json({ success: true, message: 'Tour order updated' });
  } catch (err) {
    console.error('Error updating tour order:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to update tour order' });
  }
};

exports.bulkUpdateTours = async (req, res) => {
  const { tourIds, action } = req.body;
  try {
    if (!Array.isArray(tourIds) || !['enable', 'disable', 'delete'].includes(action)) {
      throw new Error('Invalid input');
    }
    if (action === 'enable') {
      await NewTours.updateMany({ _id: { $in: tourIds } }, { isActive: true });
    } else if (action === 'disable') {
      await NewTours.updateMany({ _id: { $in: tourIds } }, { isActive: false });
    } else if (action === 'delete') {
      for (const id of tourIds) {
        const tour = await NewTours.findById(id);
        if (tour) {
          if (tour.imageurl) fileHelper.deleteFile(path.join(__dirname, '../public', tour.imageurl));
          if (tour.bannerimages) {
            tour.bannerimages.forEach(img => fileHelper.deleteFile(path.join(__dirname, '../public', img)));
          }
          if (tour.documentUrl) fileHelper.deleteFile(path.join(__dirname, '../public', tour.documentUrl));
          await NewTours.deleteOne({ _id: id });
        }
      }
    }
    res.json({ success: true, message: `${tourIds.length} tours ${action}d` });
  } catch (err) {
    console.error('Error performing bulk action:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to perform bulk action' });
  }
};

exports.duplicateTour = async (req, res) => {
  const { tourId } = req.body;
  try {
    const tour = await NewTours.findById(tourId);
    if (!tour) throw new Error('Tour not found');

    let newName = `${tour.name} (Copy)`;
    let suffix = 1;
    while (await NewTours.findOne({ name: newName })) {
      newName = `${tour.name} (Copy ${suffix})`;
      suffix++;
    }

    const newTour = new NewTours({
      ...tour.toObject(),
      _id: undefined,
      name: newName,
      displayOrder: (await NewTours.countDocuments()) + 1,
    });
    await newTour.save();
    res.json({ success: true, message: 'Tour duplicated' });
  } catch (err) {
    console.error('Error duplicating tour:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to duplicate tour' });
  }
};

exports.updateTourSEO = async (req, res) => {
  const { tourId, metaKeywords, metaDescription } = req.body;
  try {
    if (!tourId || !metaKeywords || !metaDescription) throw new Error('Missing required fields');
    const keywords = metaKeywords.split(',').map(k => k.trim()).filter(k => k);
    if (keywords.length > 15) throw new Error('Too many keywords (max 15)');
    await NewTours.findByIdAndUpdate(tourId, { metaKeywords: keywords, metaDescription });
    res.json({ success: true, message: 'SEO updated' });
  } catch (err) {
    console.error('Error updating SEO:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to update SEO' });
  }
};

exports.updateTourImages = async (req, res) => {
  const { tourId } = req.body;
  try {
    const tour = await NewTours.findById(tourId);
    if (!tour) {
      if (req.files) req.files.forEach(file => fileHelper.deleteFile(file.path));
      throw new Error('Tour not found');
    }

    let bannerimages = tour.bannerimages || [];
    let documentUrl = tour.documentUrl;

    req.files.forEach(file => {
      if (file.mimetype === 'application/pdf') {
        if (documentUrl) fileHelper.deleteFile(path.join(__dirname, '../public', documentUrl));
        documentUrl = `/documents/tours/${file.filename}`;
      } else {
        const filePath = `/images/tours/${file.filename}`;
        bannerimages.push(filePath);
      }
    });

    await NewTours.findByIdAndUpdate(tourId, { bannerimages, documentUrl });
    res.json({ success: true, message: 'Images updated', bannerimages, documentUrl });
  } catch (err) {
    if (req.files) req.files.forEach(file => fileHelper.deleteFile(file.path));
    console.error('Error updating images:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to update images' });
  }
};

exports.updateImageUrl = async (req, res) => {
  try {
    const { tripId } = req.body;
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No image uploaded' });
    }
    if (req.files.length > 1) {
      req.files.forEach((file) => fileHelper.deleteFile(`images/tours/${file.filename}`));
      return res.status(400).json({ success: false, message: 'Only one image allowed for imageurl' });
    }

    const newImageUrl = `/images/tours/${req.files[0].filename}`;
    const trip = await NewTours.findById(tripId);
    if (!trip) {
      fileHelper.deleteFile(`images/tours/${req.files[0].filename}`);
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    if (trip.imageurl) {
      fileHelper.deleteFile(path.join(__dirname, '../public', trip.imageurl));
    }
    trip.imageurl = newImageUrl;
    await trip.save();

    res.json({ success: true, imageUrl: newImageUrl });
  } catch (error) {
    console.error('Error in updateImageUrl:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};