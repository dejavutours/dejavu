const mongoose = require('mongoose');
const State = require('../models/statemst');
const NewTours = require('../models/newTours');
const path = require('path');
const fs = require('fs');

// Get all states
exports.getAllStates = async (req, res) => {
  try {
        const states = await State.find({ isDeleted: false }).sort({ displayOrder: 1 });
        res.render('pages/admin/stateMaster', {
            states,
            csrfToken: req.csrfToken(),
        });
    } catch (error) {
        console.error('Error retrieving states:', error);
        res.status(500).send('Error retrieving states.');
    }
};

// Get active states for dropdowns
exports.getStateList = async (req, res) => {
    try {
        const states = await State.find({ isDeleted: false, isActive: true })
            .select('name countryCode image stateId')
            .sort({ displayOrder: 1 });
        res.json({ success: true, states: states });
    } catch (error) {
        console.error('Error retrieving state list:', error);
        res.status(500).json({ success: false, message: 'Error retrieving states.' });
    }
};

// Check active trips for a state
exports.checkActiveTrips = async (req, res) => {
    try {
        const { stateName } = req.body;
        const activeTrips = await NewTours.find({
            'state': stateName,
            isActive: true
        }).select('name');
        
        if (activeTrips.length > 0) {
            return res.json({
                success: false,
                message: 'Active trips found.',
                trips: activeTrips
            });
        }
        
        res.json({ success: true, message: 'No active trips found.' });
    } catch (error) {
        console.error('Error checking active trips:', error);
        res.status(500).json({ success: false, message: 'Error checking active trips.' });
    }
};

// Upsert state
exports.upsertState = async (req, res) => {
    try {
      const { id, name, countryCode, isActive, oldImage } = req.body;
      let imagePath = oldImage || '';
  
      // Handle image upload
      if (req.file) {
        imagePath = `/images/states/${req.file.filename}`;
        if (id && oldImage) {
          const oldImagePath = path.join(__dirname, '..', 'public', oldImage);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
      } else if (!id && !imagePath) {
        return res.status(400).json({
          success: false,
          message: 'An image is required for new states.'
        });
      }
  
      if (!name || !countryCode) {
        return res.status(400).json({
          success: false,
          message: 'Name and country code are required.'
        });
      }
  
      // Check active trips before deactivating
      if (id && isActive === 'false') {
        const activeTrips = await NewTours.find({
          'deptcities.State': name,
          isActive: true
        }).select('name');
        if (activeTrips.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Cannot deactivate state with active trips.',
            trips: activeTrips
          });
        }
      }
  
      // Normalize isActive to boolean
      const isActiveBoolean = isActive === 'true' || isActive === 'on';
  
      if (id) {
        // Update existing state
        const state = await State.findById(id);
        if (!state) {
          return res.status(404).json({
            success: false,
            message: 'State not found.'
          });
        }
  
        const duplicate = await State.findOne({
          name,
          countryCode,
          _id: { $ne: id },
          isDeleted: false
        });
        if (duplicate) {
          return res.status(400).json({
            success: false,
            message: 'State already exists in this country.'
          });
        }
  
        state.name = name;
        state.countryCode = countryCode;
        state.isActive = isActiveBoolean;
        if (imagePath) state.image = imagePath;
        await state.save();
        return res.json({
          success: true,
          message: 'State updated successfully.'
        });
      } else {
        // Add new state
        const existingState = await State.findOne({
          name,
          countryCode,
          isDeleted: false
        });
        if (existingState) {
          return res.status(400).json({
            success: false,
            message: 'State already exists in this country.'
          });
        }
  
        const maxOrder = await State.find().sort({ displayOrder: -1 }).limit(1);
        const newOrder = maxOrder.length > 0 ? maxOrder[0].displayOrder + 1 : 0;
  
        const newState = new State({
          name,
          countryCode,
          image: imagePath,
          displayOrder: newOrder,
          isActive: isActiveBoolean
        });
        await newState.save();
        return res.json({
          success: true,
          message: 'State created successfully.'
        });
      }
    } catch (error) {
      console.error('Error in upsertState:', error);
      res.status(500).json({
        success: false,
        message: 'Error processing state.'
      });
    }
  };

// Delete state
exports.deleteState = async (req, res) => {
    try {
        const { id } = req.params;
        const state = await State.findById(id);
        if (!state) {
            return res.status(404).json({
                success: false,
                message: 'State not found.'
            });
        }

        // Check for active trips
        const activeTrips = await NewTours.find({
            'deptcities.State': state.name,
            isActive: true
        }).select('name');
        if (activeTrips.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete state with active trips.',
                trips: activeTrips
            });
        }

        // Delete image
        if (state.image && state.image !== '/images/states/default.jpg') {
            const imagePath = path.join(__dirname, '..', 'public', state.image);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        // Soft delete
        state.isDeleted = true;
        state.isActive = false;
        await state.save();

        // Reorder remaining states
        const remainingStates = await State.find({ isDeleted: false }).sort({ displayOrder: 1 });
        for (let i = 0; i < remainingStates.length; i++) {
            remainingStates[i].displayOrder = i;
            await remainingStates[i].save();
        }

        res.json({
            success: true,
            message: 'State deleted successfully.'
        });
    } catch (error) {
        console.error('Error deleting state:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting state.'
        });
    }
};

// Update state order
exports.updateStateOrder = async (req, res) => {
    try {
        const { order } = req.body;
        if (!Array.isArray(order)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid order data.'
            });
        }

        for (let i = 0; i < order.length; i++) {
            await State.findByIdAndUpdate(
                order[i],
                { displayOrder: i },
                { new: true }
            );
        }

        res.json({
            success: true,
            message: 'State order updated successfully.'
        });
    } catch (error) {
        console.error('Error updating state order:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating state order.'
        });
    }
};