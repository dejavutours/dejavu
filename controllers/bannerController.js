const mongoose = require('mongoose');
const BannerImg = require('../models/bannerImg');
const path = require('path');
const fs = require('fs');

// Get all banners
exports.getAllBanners = async (req, res) => {
  try {
    const banners = await BannerImg.find({ isDeleted: false }).sort({ displayOrder: 1 });
    res.render('pages/admin/bannerMaster', {
      banners,
      csrfToken: req.csrfToken(),
    });
  } catch (error) {
    console.error('Error retrieving banners:', error);
    res.status(500).send('Error retrieving banners.');
  }
};

// Get active banners for frontend use
exports.getBannerList = async (req, res) => {
  try {
    const banners = await BannerImg.find({ isDeleted: false, isActive: true })
      .select('caption image bannerId')
      .sort({ displayOrder: 1 });
    res.json({ success: true, banners });
  } catch (error) {
    console.error('Error retrieving banner list:', error);
    res.status(500).json({ success: false, message: 'Error retrieving banners.' });
  }
};

// Upsert banner
exports.upsertBanner = async (req, res) => {
  try {
    const { id, caption, isActive, oldImage } = req.body;
    let imagePath = oldImage || '';

    // Handle image upload
    if (req.file) {
      imagePath = `/images/banners/${req.file.filename}`;
      if (id && oldImage) {
        const oldImagePath = path.join(__dirname, '..', 'public', oldImage);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    } else if (!id && !imagePath) {
      return res.status(400).json({
        success: false,
        message: 'A banner image is required for new banners.'
      });
    }

    if (!caption) {
      return res.status(400).json({
        success: false,
        message: 'Caption is required.'
      });
    }

    // Normalize isActive to boolean
    const isActiveBoolean = isActive === 'true' || isActive === 'on';

    if (id) {
      // Update existing banner
      const banner = await BannerImg.findById(id);
      if (!banner) {
        return res.status(404).json({
          success: false,
          message: 'Banner not found.'
        });
      }

      const duplicate = await BannerImg.findOne({
        caption,
        _id: { $ne: id },
        isDeleted: false
      });
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: 'Banner caption already exists.'
        });
      }

      banner.caption = caption;
      banner.isActive = isActiveBoolean;
      if (imagePath) banner.image = imagePath;
      await banner.save();
      return res.json({
        success: true,
        message: 'Banner updated successfully.'
      });
    } else {
      // Add new banner
      const existingBanner = await BannerImg.findOne({
        caption,
        isDeleted: false
      });
      if (existingBanner) {
        return res.status(400).json({
          success: false,
          message: 'Banner caption already exists.'
        });
      }

      const maxOrder = await BannerImg.find({isDeleted:false}).sort({ displayOrder: -1 }).limit(1);
      const newOrder = maxOrder.length > 0 ? maxOrder[0].displayOrder + 1 : 0;

      const newBanner = new BannerImg({
        caption,
        image: imagePath,
        displayOrder: newOrder,
        isActive: isActiveBoolean
      });
      await newBanner.save();
      return res.json({
        success: true,
        message: 'Banner created successfully.'
      });
    }
  } catch (error) {
    console.error('Error in upsertBanner:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing banner.'
    });
  }
};

// Delete banner
exports.deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const banner = await BannerImg.findById(id);
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found.'
      });
    }

    // Delete image
    if (banner.image) {
      const imagePath = path.join(__dirname, '..', 'public', banner.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Soft delete
    banner.isDeleted = true;
    banner.isActive = false;
    await banner.save();

    // Reorder remaining banners
    const remainingBanners = await BannerImg.find({ isDeleted: false }).sort({ displayOrder: 1 });
    for (let i = 0; i < remainingBanners.length; i++) {
      remainingBanners[i].displayOrder = i;
      await remainingBanners[i].save();
    }

    res.json({
      success: true,
      message: 'Banner deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting banner:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting banner.'
    });
  }
};

// Update banner order
exports.updateBannerOrder = async (req, res) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order data.'
      });
    }

    for (let i = 0; i < order.length; i++) {
      await BannerImg.findByIdAndUpdate(
        order[i],
        { displayOrder: i },
        { new: true }
      );
    }

    res.json({
      success: true,
      message: 'Banner order updated successfully.'
    });
  } catch (error) {
    console.error('Error updating banner order:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating banner order.'
    });
  }
};