const City = require("../models/citymst");
const path = require("path");
const fs = require("fs");

// Get all cities
exports.getCities = async (req, res) => {
  try {
    const cities = await City.find({ isDeleted: false });
    const stateCities = require("../json/statecities.json");
    res.render("pages/cities", {
      cities,
      stateCities,
      csrfToken: req.csrfToken(),
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error retrieving cities.");
  }
};

// API to fetch all active cities (for dropdown)
exports.getCityList = async (req, res) => {
  try {
    const cities = await City.find({ isDeleted: false, isActive: true }).select(
      "name state image cityId"
    );
    res.json({ success: true, cities });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error retrieving cities." });
  }
};

// Upsert city (add or update)
exports.upsertCity = async (req, res) => {
  try {
    const { id, name, state, oldImage } = req.body;
    let imagePath = oldImage || "/images/cities/default.jpg";

    // Handle image upload
    if (req.file) {
      imagePath = `/images/cities/${req.file.filename}`;

      // If updating and old image exists, delete the old image
      if (id && oldImage && oldImage !== "/images/cities/default.jpg") {
        const oldImagePath = path.join(__dirname, "..", "public", oldImage);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    }

    if (!name || !state) {
      return res.status(400).send("Name and state are required.");
    }

    if (id) {
      // Update existing city
      const city = await City.findById(id);
      if (!city) return res.status(404).send("City not found.");

      const duplicate = await City.findOne({ name, state, _id: { $ne: id } });
      if (duplicate) return res.status(400).send("City already exists in this state.");

      city.name = name;
      city.state = state;
      city.image = imagePath;
      await city.save();
    } else {
      // Add new city
      const existingCity = await City.findOne({ name, state });
      if (existingCity) return res.status(400).send("City already exists in this state.");

      const newCity = new City({ name, state, image: imagePath });
      await newCity.save();
    }

    res.redirect("/cities");
  } catch (error) {
    console.error("Error in upsertCity:", error);
    res.status(500).send("Error processing city.");
  }
};

// Delete city
exports.deleteCity = async (req, res) => {
  try {
    const { id } = req.params;
    const city = await City.findById(id);
    if (!city) return res.status(404).send("City not found.");

    // Delete the image file if it exists
    if (city.image && city.image !== "/images/cities/default.jpg") {
      const imagePath = path.join(__dirname, "..", "public", city.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await City.findByIdAndUpdate(id, { isDeleted: true });
    res.redirect("/cities");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error deleting city.");
  }
};


// async function migrateCityImages() {
//   const cities = await City.find();
//   for (const city of cities) {
//     if (city.image && city.image !== "/images/cities/default.jpg") {
//       const oldImagePath = path.join(__dirname, "public", city.image);
//       const filename = path.basename(city.image);
//       const newImagePath = path.join(__dirname, "public", "images", "cities", filename);

//       if (fs.existsSync(oldImagePath)) {
//         fs.renameSync(oldImagePath, newImagePath);
//         city.image = `/images/cities/${filename}`;
//         await city.save();
//       }
//     }
//   }
//   console.log("Migration completed.");
// }

// migrateCityImages();