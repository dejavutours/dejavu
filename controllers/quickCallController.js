const QuickCallRequest = require('../models/QuickCallRequest');
const NewTours = require("../models/newTours");

// Controller to handle Quick Call request submission
exports.submitQuickCallRequest = async (req, res) => {
  try {
    const { guestName, mobileNo, tripId, responded, markAsSpam, requestedDate } = req.body;

    // Basic validation
    if (!guestName || !mobileNo || !tripId) {
      return res.status(400).json({ error: 'Guest name, mobile number, and trip ID are required.' });
    }

    // Create a new Quick Call request
    const quickCallRequest = new QuickCallRequest({
      guestName,
      mobileNo,
      tripId,
      responded: responded || false,
      markAsSpam: markAsSpam || false,
      requestedDate: requestedDate ? new Date(requestedDate) : new Date()
    });

    // Save to database
    await quickCallRequest.save();

    // Respond with success
    res.status(201).json({ message: 'Quick Call request submitted successfully.' });
  } catch (error) {
    console.error('Error submitting Quick Call request:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// Controller to render Quick Call requests page with initial data
exports.renderQuickCallRequests = async (req, res) => {
  try {
    const quickCallRequests = await QuickCallRequest.find()
      .populate('tripId')
      .sort({ requestedDate: -1 }); // Sort by latest

    // Fetch unique trip names for the filter dropdown
    const trips = await QuickCallRequest.distinct('tripId');
    const tripDetails = await QuickCallRequest.find({ tripId: { $in: trips } })
      .populate('tripId')
      .lean();
    const uniqueTrips = [...new Set(tripDetails.map(req => req.tripId ? req.tripId.name : 'N/A'))];

    res.render('pages/admin/quickCall', {
      quickCallRequests,
      uniqueTrips,
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.error('Error rendering Quick Call requests:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Controller to fetch all Quick Call requests with filtering and grouping
exports.getQuickCallRequests = async (req, res) => {
  try {
    const { search, groupBy, trip, responded, markAsSpam, timeRange } = req.query;

    // Build the query
    let query = {};

    // Apply search filter (guestName or mobileNo)
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { guestName: searchRegex },
        { mobileNo: searchRegex }
      ];
    }

    // Filter by trip
    if (trip && trip !== 'all') {
      const matchingTrips = await NewTours.find({ name: trip }).lean();
      const matchingTripIds = matchingTrips.map(t => t._id);
      query.tripId = { $in: matchingTripIds };
    }

    // Filter by responded status
    if (responded && responded !== 'all') {
      query.responded = responded === 'true';
    }

    // Filter by markAsSpam status
    if (markAsSpam && markAsSpam !== 'all') {
      query.markAsSpam = markAsSpam === 'true';
    }

    // Filter by time range (day-wise, week-wise, month-wise)
    if (timeRange && timeRange !== 'all') {
      const now = new Date();
      let startDate;

      if (timeRange === 'day') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (timeRange === 'week') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()); // Start of the week (Sunday)
      } else if (timeRange === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1); // Start of the month
      }

      if (startDate) {
        query.requestedDate = { $gte: startDate };
      }
    }

    // Fetch requests and populate tripId for trip details
    let requests;
    if (groupBy === 'mobileNo') {
      // Group by mobileNo
      requests = await QuickCallRequest.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$mobileNo',
            requests: {
              $push: {
                _id: '$_id',
                guestName: '$guestName',
                mobileNo: '$mobileNo',
                tripId: '$tripId',
                responded: '$responded',
                markAsSpam: '$markAsSpam',
                requestedDate: '$requestedDate',
                createdAt: '$createdAt'
              }
            }
          }
        },
        { $sort: { '_id': 1 } } // Sort by mobileNo
      ]);

      // Populate tripId for each request
      for (let group of requests) {
        for (let request of group.requests) {
          request.trip = await QuickCallRequest.findById(request._id).populate('tripId').then(doc => doc.tripId);
        }
      }
    } else if (groupBy === 'tripId') {
      // Group by tripId
      requests = await QuickCallRequest.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$tripId',
            requests: {
              $push: {
                _id: '$_id',
                guestName: '$guestName',
                mobileNo: '$mobileNo',
                tripId: '$tripId',
                responded: '$responded',
                markAsSpam: '$markAsSpam',
                requestedDate: '$requestedDate',
                createdAt: '$createdAt'
              }
            }
          }
        },
        { $sort: { '_id': 1 } } // Sort by tripId
      ]);

      // Populate tripId for each group
      for (let group of requests) {
        group.trip = await QuickCallRequest.findOne({ tripId: group._id }).populate('tripId').then(doc => doc.tripId);
        for (let request of group.requests) {
          request.trip = group.trip;
        }
      }
    } else {
      // No grouping, fetch all with population
      requests = await QuickCallRequest.find(query)
        .populate('tripId')
        .sort({ requestedDate: -1 });
    }

    res.status(200).json({ success: true, requests });
  } catch (error) {
    console.error('Error fetching Quick Call requests:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// Controller to update responded or markAsSpam status
exports.updateQuickCallRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { responded, markAsSpam } = req.body;

    const updateData = {};
    if (typeof responded === 'boolean') updateData.responded = responded;
    if (typeof markAsSpam === 'boolean') updateData.markAsSpam = markAsSpam;

    const updatedRequest = await QuickCallRequest.findByIdAndUpdate(id, updateData, { new: true });

    if (!updatedRequest) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    res.status(200).json({ success: true, message: 'Request updated successfully.', request: updatedRequest });
  } catch (error) {
    console.error('Error updating Quick Call request:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};