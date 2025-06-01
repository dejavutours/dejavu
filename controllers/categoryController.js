const mongoose = require('mongoose');
const Category = require('../models/categorymst');
const NewTours = require('../models/newTours');
const path = require('path');
const fs = require('fs');

// Get all categories
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isDeleted: false }).sort({ displayOrder: 1 });
    res.render('pages/admin/categoryMaster', {
      categories,
      csrfToken: req.csrfToken(),
    });
  } catch (error) {
    console.error('Error retrieving categories:', error);
    res.status(500).send('Error retrieving categories.');
  }
};

// Get active categories for dropdowns
exports.getCategoryList = async (req, res) => {
  try {
    const categories = await Category.find({ isDeleted: false, isActive: true })
      .select('name image categoryId')
      .sort({ displayOrder: 1 });
    res.json({ success: true, categories });
  } catch (error) {
    console.error('Error retrieving category list:', error);
    res.status(500).json({ success: false, message: 'Error retrieving categories.' });
  }
};

// Check active trips for a category
exports.checkActiveTrips = async (req, res) => {
  try {
    const { categoryName } = req.body;
    const activeTrips = await NewTours.find({
      'tripCategories': categoryName,
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

// Upsert category
exports.upsertCategory = async (req, res) => {
  try {
    const { id, name, isActive, oldImage } = req.body;
    let imagePath = oldImage || '';

    // Handle image upload
    if (req.file) {
      imagePath = `/images/categories/${req.file.filename}`;
      if (id && oldImage) {
        const oldImagePath = path.join(__dirname, '..', 'public', oldImage);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    } else if (!id && !imagePath) {
      return res.status(400).json({
        success: false,
        message: 'An image is required for new categories.'
      });
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required.'
      });
    }

    // Check active trips before deactivating
    if (id && isActive === 'false') {
      const activeTrips = await NewTours.find({
        'deptcities.Category': name,
        isActive: true
      }).select('name');
      if (activeTrips.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot deactivate category with active trips.',
          trips: activeTrips
        });
      }
    }

    // Normalize isActive to boolean
    const isActiveBoolean = isActive === 'true' || isActive === 'on';

    if (id) {
      // Update existing category
      const category = await Category.findById(id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found.'
        });
      }

      const duplicate = await Category.findOne({
        name,
        _id: { $ne: id },
        isDeleted: false
      });
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: 'Category name already exists.'
        });
      }

      category.name = name;
      category.isActive = isActiveBoolean;
      if (imagePath) category.image = imagePath;
      await category.save();
      return res.json({
        success: true,
        message: 'Category updated successfully.'
      });
    } else {
      // Add new category
      const existingCategory = await Category.findOne({
        name,
        isDeleted: false
      });
      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Category name already exists.'
        });
      }

      const maxOrder = await Category.find({isDeleted:false}).sort({ displayOrder: -1 }).limit(1);
      const newOrder = maxOrder.length > 0 ? maxOrder[0].displayOrder + 1 : 0;

      const newCategory = new Category({
        name,
        image: imagePath,
        displayOrder: newOrder,
        isActive: isActiveBoolean
      });
      await newCategory.save();
      return res.json({
        success: true,
        message: 'Category created successfully.'
      });
    }
  } catch (error) {
    console.error('Error in upsertCategory:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing category.'
    });
  }
};

// Delete category
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.'
      });
    }

    // Check for active trips
    const activeTrips = await NewTours.find({
      'tripCategories': category.name,
      isActive: true
    }).select('name');
    if (activeTrips.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with active trips.',
        trips: activeTrips
      });
    }

    // Delete image
    if (category.image && category.image !== '/images/categories/default.jpg') {
      const imagePath = path.join(__dirname, '..', 'public', category.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Soft delete
    category.isDeleted = true;
    category.isActive = false;
    await category.save();

    // Reorder remaining categories
    const remainingCategories = await Category.find({ isDeleted: false }).sort({ displayOrder: 1 });
    for (let i = 0; i < remainingCategories.length; i++) {
      remainingCategories[i].displayOrder = i;
      await remainingCategories[i].save();
    }

    res.json({
      success: true,
      message: 'Category deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting category.'
    });
  }
};

// Update category order
exports.updateCategoryOrder = async (req, res) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order data.'
      });
    }

    for (let i = 0; i < order.length; i++) {
      await Category.findByIdAndUpdate(
        order[i],
        { displayOrder: i },
        { new: true }
      );
    }

    res.json({
      success: true,
      message: 'Category order updated successfully.'
    });
  } catch (error) {
    console.error('Error updating category order:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating category order.'
    });
  }
};