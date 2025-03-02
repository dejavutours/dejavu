const City = require('../models/citymst');

exports.getCities = async (req, res) => {
    try {
        const cities = await City.find({ isDeleted: false });
        var stateCities = require('../json/statecities.json');
        res.render('pages/cities', { cities, stateCities, csrfToken:req.csrfToken() });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error retrieving cities.");
    }
};

//
// API to fetch all active cities (for dropdown)
exports.getCityList = async (req, res) => {
    try {
        const cities = await City.find({ isDeleted: false, isActive: true })
                                 .select("name state image cityId");
        res.json({ success: true, cities });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Error retrieving cities." });
    }
};

exports.addCity = async (req, res) => {
    try {
        const { name, state } = req.body;
        const image = req.file ? `/images/${req.file.filename}` : null;

        if (!name || !state || !image) {
            return res.status(400).send("All fields are required.");
        }

        const existingCity = await City.findOne({ name, state });
        if (existingCity) {
            return res.status(400).send("City already exists in this state.");
        }

        const newCity = new City({ name, state, image });
        await newCity.save();

        res.redirect('/cities');
    } catch (error) {
        console.error(error);
        res.status(500).send("Error adding city.");
    }
};


exports.updateCity = async (req, res) => {
    console.log("Request Body:", req.body);
    console.log("Uploaded File:", req.file);
    
    try {
        const { id } = req.params;
        const { name, state, oldImage } = req.body;
        const image = req.file ? `/images/${req.file.filename}` : oldImage; 

        if (!name || !state) {
            return res.status(400).send("Name and state are required.");
        }

        const city = await City.findById(id);
        if (!city) return res.status(404).send("City not found.");

        const duplicate = await City.findOne({ name, state, _id: { $ne: id } });
        if (duplicate) return res.status(400).send("City already exists in this state.");

        city.name = name;
        city.state = state;
        city.image = image;

        await city.save();
        res.redirect('/cities');
    } catch (error) {
        console.error(error);
        res.status(500).send("Error updating city.");
    }
};

exports.deleteCity = async (req, res) => {
    try {
        const { id } = req.params;
        await City.findByIdAndUpdate(id, { isDeleted: true });
        res.redirect('/cities');
    } catch (error) {
        console.error(error);
        res.status(500).send("Error deleting city.");
    }
};
