const City = require("../models/citymst");
const path = require("path");
const fs = require("fs");

// Get all cities, sorted by displayOrder
exports.getCities = async (req, res) => {
  try {
    const cities = await City.find({ isDeleted: false }).sort({
      displayOrder: 1,
    });
    const stateCities = require("../json/statecities.json");
    res.render("pages/admin/cities", {
      cities,
      stateCities,
      csrfToken: req.csrfToken(),
    });
  } catch (error) {
    console.error("Error retrieving cities:", error);
    res.status(500).send("Error retrieving cities.");
  }
};

// API to fetch all active cities (for dropdown)
exports.getCityList = async (req, res) => {
  try {
    const cities = await City.find({ isDeleted: false, isActive: true })
      .select("name state image cityId")
      .sort({ displayOrder: 1 });
    res.json({ success: true, cities });
  } catch (error) {
    console.error("Error retrieving city list:", error);
    res
      .status(500)
      .json({ success: false, message: "Error retrieving cities." });
  }
};

// Upsert city (add or update)
exports.upsertCity = async (req, res) => {
  try {
    const { id, name, state, oldImage } = req.body;
    let imagePath = oldImage && oldImage !== "" ? oldImage : null;

    // Handle image upload
    if (req.file) {
      imagePath = `/images/cities/${req.file.filename}`;
      if (id && oldImage && oldImage !== "") {
        const oldImagePath = path.join(__dirname, "..", "public", oldImage);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    } else if (!id && !imagePath) {
      return res
        .status(400)
        .json({
          success: false,
          message: "An image is required for new cities.",
        });
    }

    if (!name || !state) {
      return res
        .status(400)
        .json({ success: false, message: "Name and state are required." });
    }

    if (id) {
      // Update existing city
      const city = await City.findById(id);
      if (!city)
        return res
          .status(404)
          .json({ success: false, message: "City not found." });

      const duplicate = await City.findOne({ name, state, _id: { $ne: id }, isDeleted: false });
      if (duplicate)
        return res
          .status(400)
          .json({
            success: false,
            message: "City already exists in this state.",
          });

      city.name = name;
      city.state = state;
      if (imagePath) city.image = imagePath; // Only update image if new imagePath is provided
      await city.save();
    } else {
      // Add new city
      const existingCity = await City.findOne({ name, state, isDeleted: false});
      if (existingCity)
        return res
          .status(400)
          .json({
            success: false,
            message: "City already exists in this state.",
          });

      const maxOrder = await City.find().sort({ displayOrder: -1 }).limit(1);
      const newOrder = maxOrder.length > 0 ? maxOrder[0].displayOrder + 1 : 0;

      const newCity = new City({
        name,
        state,
        image: imagePath,
        displayOrder: newOrder,
      });
      await newCity.save();
    }

    res.json({
      success: true,
      message: id ? "City updated successfully." : "City added successfully.",
    });
  } catch (error) {
    console.error("Error in upsertCity:", error);
    res.status(500).json({ success: false, message: "Error processing city." });
  }
};

// Delete city (soft delete) with displayOrder update
exports.deleteCity = async (req, res) => {
  try {
    const { id } = req.params;
    const city = await City.findById(id);
    if (!city)
      return res
        .status(404)
        .json({ success: false, message: "City not found." });

    // Delete the image file if it exists
    if (city.image && city.image !== "/images/cities/default.jpg") {
      const imagePath = path.join(__dirname, "..", "public", city.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Soft delete the city
    await City.findByIdAndUpdate(id, { isDeleted: true });

    // Reorder remaining cities
    const remainingCities = await City.find({ isDeleted: false }).sort({
      displayOrder: 1,
    });
    for (let i = 0; i < remainingCities.length; i++) {
      remainingCities[i].displayOrder = i;
      await remainingCities[i].save();
    }

    res.json({ success: true, message: "City deleted successfully." });
  } catch (error) {
    console.error("Error deleting city:", error);
    res.status(500).json({ success: false, message: "Error deleting city." });
  }
};

// Update city display order
exports.updateCityOrder = async (req, res) => {
  try {
    const { order } = req.body; // Array of city IDs in new order
    if (!Array.isArray(order)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid order data." });
    }

    // Update displayOrder for each city
    for (let i = 0; i < order.length; i++) {
      await City.findByIdAndUpdate(
        order[i],
        { displayOrder: i },
        { new: true }
      );
    }

    res.json({ success: true, message: "City order updated successfully." });
  } catch (error) {
    console.error("Error updating city order:", error);
    res
      .status(500)
      .json({ success: false, message: "Error updating city order." });
  }
};
