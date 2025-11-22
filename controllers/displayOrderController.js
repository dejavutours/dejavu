// controllers/displayOrderController.js
const DisplayOrder = require('../models/DisplayOrder');
const Category = require('../models/categorymst');
const NewTours = require('../models/newTours');
const mongoose = require('mongoose');

exports.getCategoryTripOrderPage = async (req, res) => {
    try {
        const categories = await Category.find({ isDeleted: false, isActive: true })
            .select('name')
            .sort({ displayOrder: 1 });

        res.render('pages/admin/categoryTripOrder', {
            categories,
            csrfToken: req.csrfToken()
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.getTripsForCategory = async (req, res) => {
    try {
        const { categoryName } = req.query;
        const category = await Category.findOne({ name: categoryName, isDeleted: false });
        if (!category) return res.json({ success: false, message: 'Category not found' });

        // Get saved order
        const displayOrder = await DisplayOrder.findOne({
            type: 'category_trips',
            parentId: category._id
        });

        let trips = await NewTours.find({
            tripCategories: categoryName,
            isActive: true,
            isDeleted: { $ne: true }
        }).select('name imageurl price days').lean();

        if (displayOrder && displayOrder.tripIds.length > 0) {
            const orderedMap = new Map();
            displayOrder.tripIds.forEach((id, index) => orderedMap.set(id.toString(), index));

            trips.sort((a, b) => {
                const posA = orderedMap.has(a._id.toString()) ? orderedMap.get(a._id.toString()) : Infinity;
                const posB = orderedMap.has(b._id.toString()) ? orderedMap.get(b._id.toString()) : Infinity;
                return posA - posB;
            });
        }

        res.json({ success: true, trips, categoryId: category._id });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: 'Error fetching trips' });
    }
};

exports.saveCategoryTripOrder = async (req, res) => {
    try {
        const { categoryId, tripIds } = req.body; // tripIds = array of _id strings

        await DisplayOrder.findOneAndUpdate(
            { type: 'category_trips', parentId: categoryId },
            {
                type: 'category_trips',
                parentId: categoryId,
                tripIds: tripIds.map(id => mongoose.Types.ObjectId(id))
            },
            { upsert: true, new: true }
        );

        res.json({ success: true, message: 'Display order saved successfully!' });
    } catch (err) {
        console.error(err);
        res.json({ success: false, message: 'Failed to save order' });
    }
};