const mongoose = require('mongoose');
const express = require("express");
const fs = require("fs");
const path = require("path");
const otpGenerator = require("otp-generator");
const AWS = require("aws-sdk");
const jwt = require("jsonwebtoken");

const gmailuser = require("../models/gmailuser");
const User = require("../models/user");
const Mobileuser = require("../models/mobileuser");
const NewTours = require("../models/newTours");
const TripBookingDetail = require("../models/TripBookingDetail");
const fileHelper = require("../util/file");
const City = require("../models/citymst");
const Statemst = require("../models/statemst");
const bannerImg = require("../models/bannerImg");
const Category = require("../models/categorymst");
const DisplayOrder = require('../models/DisplayOrder');

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_SMS,
  secretAccessKey: process.env.AWS_SECERET_ACCESS_KEY_SMS,
  region: process.env.AWS_REGION,
});


exports.getotp = async (req, res, next) => {
  const otp = otpGenerator.generate(4, {
    upperCaseAlphabets: false,
    specialChars: false,
    lowerCaseAlphabets: false,
    digits: true,
  });
  const phone = `+91${req.body.phone}`;
  const sns = new AWS.SNS();
  const params = {
    Message: `Your OTP for verification is: ${otp}`,
    PhoneNumber: phone,
  };
  try {
    // Store OTP and expiration in MongoDB
    const user = await Mobileuser.findOneAndUpdate(
      { phoneNumber: phone },
      {
        otp: otp,
        otpExpiration: new Date(Date.now() + 5 * 60 * 1000), // OTP expires in 5 minutes
      },
      { upsert: true, new: true }
    );
    // Send SMS
    const data = await sns.publish(params).promise();
    // res.render('verifyOTP', { phoneNumber: req.body.phone, otpSent: true });
    return res.send(true); // Return OTP in case you need to verify it later
  } catch (err) {
    console.error("Error sending OTP:", err);
    return res.send(false);
  }
};

exports.verifyotp = async (req, res, next) => {
  const { phone2, otp } = req.body;
  try {
    const user = await Mobileuser.findOne({ phoneNumber: "+91" + phone2 });
    if (!user) {
      return res.status(404).send("User not found");
    }

    // Verify OTP
    if (user.otp === Number(otp) && user.otpExpiration > new Date()) {
      // OTP is valid and not expired
      // Implement session management or JWT token creation for authentication
      // Generate JWT token
      const accessToken = jwt.sign(user.phoneNumber, process.env.JWT_TOKEN);
      // res.send(accessToken);
      res.json({ accessToken });
      // res.send('OTP verified successfully');
    } else {
      res.status(401).send("Invalid OTP or OTP expired");
    }
  } catch (err) {
    console.error("Error verifying OTP:", err);
    res.status(500).send("Failed to verify OTP");
  }
};


// send all the require detail to main index page of the user
exports.getIndexPage = async (req, res, next) => {
  try {
    const tests = await NewTours.find().distinct("name");
    const response = await this.getFiltertourAPIUseOnly(req, res, false);

    // Function to get state-wise trips
    async function getStateWiseTrips() {
      // Fetch active, non-deleted states from Statemst
      const states = await Statemst.find({ isActive: true, isDeleted: false })
        .select("name image displayOrder")
        .lean(); // Use lean for performance

      // Aggregate trip counts from NewTours
      const validStatesRaw = await NewTours.aggregate([
        {
          $match: {
            isActive: true,
            state: { $exists: true, $ne: null, $ne: "" },
          },
        },
        {
          $group: {
            _id: { $toUpper: { $trim: { input: "$state" } } },
            count: { $sum: 1 },
          },
        },
      ]);

      // Create a map of master states for quick lookup
      const stateMap = new Map(states.map((s) => [s.name.toUpperCase(), s]));

      // Include all states from NewTours, merging with master data when available
      const validStates = validStatesRaw.map((stateDoc) => {
        const stateName = stateDoc._id;
        const imageFile = stateName.toLowerCase().replace(/\s+/g, "") + ".jpg";
        const masterState = stateMap.get(stateName);
        return {
          name: stateName,
          place: stateDoc.count,
          thumb: masterState?.image || `/img/State/${imageFile}`,
          displayOrder: masterState?.displayOrder ?? Number.MAX_SAFE_INTEGER, // High value for unmatched states
        };
      });

      // Sort by displayOrder, then by trip count for unmatched states
      validStates.sort((a, b) => {
        if (a.displayOrder === b.displayOrder) {
          return b.place - a.place; // Sort by trip count if displayOrder is equal
        }
        return a.displayOrder - b.displayOrder;
      });

      return validStates;
    }

    // Function to get category-wise trips
    async function getCategoryWiseTrips() {
      const categoryImages = {
        Adventure: "Adventure.jpg",
        Backpacking: "backpacking.jpg",
        Beach: "beach.jpg",
        Camping: "camping.jpg",
        Couple: "Couple.jpg",
        Group: "group.jpg",
        Heritage: "heritage.jpg",
        Himalaya: "himalaya.jpg",
        Monsoon: "Monsoon.jpg",
        "North-East": "north-east.jpg",
        Offbeat: "offbeat.jpg",
        Safari: "safari.jpg",
        Sightseeing: "Sightseeing.jpg",
        Solo: "Solo.jpg",
        Spiritual: "spiritual.jpg",
        Summer: "Summer.jpg",
        Trekking: "trekking.jpg",
        Waterfall: "waterfall.jpg",
        Wildlife: "wildlife.jpg",
        Winter: "Winter.jpg",
        Festival: "Winter.jpg",
        Leisure: "Winter.jpg",
        All: "Winter.jpg",
      };
      // Fetch active, non-deleted categories from Category schema
      const categories = await Category.find({
        isActive: true,
        isDeleted: false,
      })
        .select("name image displayOrder")
        .lean();
      // Aggregate trip counts from NewTours
      const categoryTripsRaw = await NewTours.aggregate([
        { $match: { isActive: true } },
        {
          $addFields: {
            tripCategories: {
              $cond: {
                if: {
                  $or: [
                    { $eq: ["$tripCategories", []] },
                    { $eq: ["$tripCategories", null] },
                    {
                      $eq: [
                        {
                          $filter: {
                            input: "$tripCategories",
                            as: "category",
                            cond: {
                              $and: [
                                { $ne: ["$$category", ""] },
                                { $ne: ["$$category", null] },
                                {
                                  $ne: [{ $trim: { input: "$$category" } }, ""],
                                }, // fixed
                              ],
                            },
                          },
                        },
                        [],
                      ],
                    },
                  ],
                },
                then: ["All"], // Default to "All" for empty/null categories
                else: {
                  $map: {
                    input: "$tripCategories",
                    as: "category",
                    in: { $trim: { input: "$$category" } },
                  },
                },
              },
            },
          },
        },
        {
          $unwind: {
            path: "$tripCategories",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $match: {
            tripCategories: { $nin: ["", null] },
          },
        },
        {
          $group: {
            _id: "$tripCategories",
            count: { $sum: 1 },
            trips: { $push: { name: "$name", imageurl: "$imageurl" } },
          },
        },
      ]);

      // Create a map of master categories for quick lookup
      const categoryMap = new Map(
        categories.map((c) => [c.name.toUpperCase(), c])
      );

      // Include all categories from NewTours, merging with master data
      let categoryTrips = categoryTripsRaw
        .map((categoryDoc) => {
          const categoryName = categoryDoc._id;
          if (!categoryName || categoryName === "") return null;
          const imageFile = categoryImages[categoryName];
          const masterCategory = categoryMap.get(categoryName.toUpperCase());
          return {
            name: categoryName,
            count: categoryDoc.count,
            trips: categoryDoc.trips,
            thumb: masterCategory?.image || `/img/Tour category/${imageFile}`,
            displayOrder:
              masterCategory?.displayOrder ?? Number.MAX_SAFE_INTEGER,
          };
        })
        .filter((item) => item !== null);

      // Sort by displayOrder, then alphabetically, with "All" at the end
      categoryTrips.sort((a, b) => {
        if (a.name === "All") return 1;
        if (b.name === "All") return -1;
        if (a.displayOrder === b.displayOrder) {
          return a.name.localeCompare(b.name); // Alphabetical for equal displayOrder
        }
        return a.displayOrder - b.displayOrder;
      });

      return categoryTrips;
    }

    // Function to get departure city-wise trips
    async function getDepartureCityTrips() {
      // Fetch active, non-deleted cities from City schema
      const cities = await City.find({ isActive: true, isDeleted: false })
        .select("name image displayOrder")
        .lean();

      // Aggregate trip counts from NewTours
      const departureCitiesRaw = await NewTours.aggregate([
        {
          $match: {
            isActive: true,
            deptcities: { $exists: true, $ne: [] },
          },
        },
        {
          $unwind: "$deptcities",
        },
        {
          $match: {
            "deptcities.City": { $exists: true, $nin: ["", null] },
          },
        },
        {
          $group: {
            _id: "$deptcities.City",
            count: { $sum: 1 },
            trips: {
              $push: {
                name: "$name",
                bannerimages: "$bannerimages",
                imageurl: "$imageurl",
                days: "$days",
                destinations: "$destinations",
                price: "$price",
                state: "$state",
                deptcity: "$deptcities.City",
                tripDuration: "$deptcities.tripDuration",
                dates: "$deptcities.dates",
                adultPrice: {
                  $arrayElemAt: ["$deptcities.price.adultPrice", 0],
                },
              },
            },
          },
        },
      ]);

      // Create a map of master cities for quick lookup
      const cityMap = new Map(cities.map((c) => [c.name.toUpperCase(), c]));

      // Include all cities from NewTours, merging with master data
      const departureCities = departureCitiesRaw.map((cityDoc) => {
        const cityName = cityDoc._id;
        const masterCity = cityMap.get(cityName.toUpperCase());
        return {
          name: cityName,
          count: cityDoc.count,
          thumb: masterCity?.image || `/img/cities/default_city.jpg`,
          trips: cityDoc.trips,
          displayOrder: masterCity?.displayOrder ?? Number.MAX_SAFE_INTEGER,
        };
      });

      // Sort by displayOrder, then alphabetically
      departureCities.sort((a, b) => {
        if (a.displayOrder === b.displayOrder) {
          return a.name.localeCompare(b.name);
        }
        return a.displayOrder - b.displayOrder;
      });

      return departureCities;
    }

    // Function to get homepage-featured category-wise trips (only isShowOnHomePage = true)
    async function getHomepageCategoryTrips() {
      // Step 1: Get only categories that are active + marked to show on homepage
      const homepageCategories = await Category.find({
        isActive: true,
        isDeleted: false,
        isShowOnHomePage: true
      })
        .select("name image displayOrder")
        .sort({ displayOrder: 1 })
        .lean();

      if (homepageCategories.length === 0) return [];

      // Step 2: Get custom trip order from DisplayOrder model (if exists)
      const displayOrders = await DisplayOrder.find({
        type: 'category_trips',
        parentId: { $in: homepageCategories.map(c => c._id) }
      }).lean();

      const orderMap = new Map();
      displayOrders.forEach(doc => {
        orderMap.set(doc.parentId.toString(), doc.tripIds || []);
      });

      // Step 3: Fetch all active trips
      const allTrips = await NewTours.find({
        isActive: true,
        isDeleted: false
      })
        .select("name imageurl bannerimages destinations days price adultPrice tripDuration state tripCategories displayOrder")
        .lean();

      // Step 4: Group trips by category and apply custom order
      const result = homepageCategories.map(category => {
        const categoryName = category.name;
        const customTripIds = orderMap.get(category._id.toString()) || [];

        // Filter trips belonging to this category
        let categoryTrips = allTrips.filter(trip =>
          trip.tripCategories &&
          trip.tripCategories.map(c => c.trim()).includes(categoryName)
        );

        // Apply custom display order if exists
        if (customTripIds.length > 0) {
          const ordered = [];
          const remaining = [];

          customTripIds.forEach(id => {
            const trip = categoryTrips.find(t => t._id.toString() === id.toString());
            if (trip) ordered.push(trip);
          });

          // Add remaining trips (not in custom order) at the end
          categoryTrips.forEach(trip => {
            if (!customTripIds.some(id => id.toString() === trip._id.toString())) {
              remaining.push(trip);
            }
          });

          // Sort remaining by displayOrder or name
          remaining.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0) || a.name.localeCompare(b.name));

          categoryTrips = [...ordered, ...remaining];
        } else {
          // Default sort by displayOrder field in trip
          categoryTrips.sort((a, b) => (a.displayOrder || 99999) - (b.displayOrder || 99999));
        }

        return {
          ...category,
          trips: categoryTrips.slice(0, 20), // limit if needed
          count: categoryTrips.length
        };
      });

      return result;
    }

    // Fetch banner images
    async function getBannerImages() {
      // Fetch active, non-deleted banners from bannerImg
      const banners = await bannerImg
        .find({ isActive: true, isDeleted: false })
        .select("image displayOrder")
        .sort({ displayOrder: 1 })
        .lean();

      if (banners.length === 0) {
        // Fallback to static banners from old API
        return [
          { url: "/img/Banner & other/banner1.jpg", caption: "" },
          { url: "/img/Banner & other/banner2.jpg", caption: "" },
          { url: "/img/Banner & other/banner3.jpg", caption: "" },
          { url: "/img/Banner & other/banner4.jpg", caption: "" },
          { url: "/img/Banner & other/banner5.jpg", caption: "" },
          { url: "/img/Banner & other/Banner6.jpg", caption: "" },
          { url: "/img/Banner & other/banner7.jpg", caption: "" },
          { url: "/img/Banner & other/banner8.jpg", caption: "" },
          { url: "/img/Banner & other/banner9.jpg", caption: "" },
          { url: "/img/Banner & other/banner10.jpg", caption: "" },
          { url: "/img/Banner & other/banner11.jpg", caption: "" },
          { url: "/img/Banner & other/banner12.jpg", caption: "" },
          { url: "/img/Banner & other/banner13.jpg", caption: "" },
          { url: "/img/Banner & other/banner14.jpg", caption: "" },
        ];
      }

      return banners.map((banner) => ({
        url: banner.image,
        caption: banner.caption || "",
      }));
    }

    // Fetch all required data
    const placeItems = await getStateWiseTrips();
    const categoryItems = await getCategoryWiseTrips();
    const departureCities = await getDepartureCityTrips();
    const bannerImages = await getBannerImages();
    const homepageCategoryRows = await getHomepageCategoryTrips();
    // Render the index page
    res.render("pages/index", {
      tourPackages: response.tours,
      test: tests,
      user: req.user,
      placeItems,
      bannerImages,
      categoryItems,
      homepageCategoryRows,
      departureCities,
    });
  } catch (error) {
    console.error("Error in getIndexPage:", error);
    res.status(500).send("Internal Server Error");
  }
};

exports.postAdminLogin = (req, res, next) => {
  const uname = req.body.username;
  const pwd = req.body.password;
  User.findOne({ username: uname })
    .then((user) => {
      if (!user) {
        return res.redirect("/");
      }
      if (user.password == pwd) {
        req.session.isLoggedIn = true;
        req.session.user = user;
        return req.session.save((err) => {
         res.redirect("/");
        });
      } else {
        return res.redirect("/");
      }
    })
    .catch((err) => {
      console.log(err);
    });
};

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    res.redirect("/");
  });
};

// Get the Add/Edit Tours detail page
// - If no trip ID is provided, return the Add Tours page with required details
// - If a trip ID is provided, fetch and return trip details for editing
exports.getAddTours = async (req, res, next) => {
  try {
    // Fetch active, non-deleted states from Statemst model
    const states = await Statemst.find({ isActive: true, isDeleted: false }).select('name countryCode').lean();

    // Check if request body contains a trip ID (for editing an existing tour)
    const tripid = req.query.tripid;
    if (tripid) {
      // Validate if tripid is a valid MongoDB ObjectId
      if (!tripid.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ error: "Invalid Trip ID format" });
      }

      try {
        // Fetch trip details from the database
        const tripdetails = await NewTours.findOne({ _id: tripid }).populate("CityId");

        if (!tripdetails) {
          return res.status(404).json({ error: "Trip not found" });
        }

        // Render Update Tours page with fetched trip details
        return res.render("pages/Addtours", {
          message: null,
          trips: tripdetails,
          states, // Pass states instead of states_arr
          csrfToken: req.csrfToken(),
        });
      } catch (err) {
        console.error("Error fetching trip details:", err);
        return res.status(500).json({ error: "Internal Server Error" });
      }
    }

    // If no trip ID is provided, render Add Tours page
    return res.render("pages/Addtours", {
      message: null,
      trips: [],
      states, // Pass states instead of states_arr
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.error("Error processing request:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// Fetch all Filters tours
exports.getFiltertourAPIUseOnly = async (req, res, sortByLatestUpdate) => {
  try {
    let filters = [];
    if (req && req.query && req.query.filterValue) {
      filters = JSON.parse(req.query.filterValue);
    }
    let queryConditions = [];

    // Filter by departure city
    if (filters["Departure city"] && filters["Departure city"].length > 0) {
      queryConditions.push({
        "deptcities.City": {
          $in: filters["Departure city"].map(
            (city) => new RegExp(`^${city}$`, "i")
          ),
        },
      });
    }

    // Filter by tour category (tags)
    if (filters["Tour category"] && filters["Tour category"].length > 0) {
      if (filters["Tour category"][0].toLowerCase() !== "all") {
        queryConditions.push({
          tripCategories: {
            $in: filters["Tour category"].map(
              (tag) => new RegExp(`^${tag}$`, "i")
            ),
          },
        });
      }
    }

    // Filter by tour type
    if (filters["Tour type"] && filters["Tour type"].length > 0) {
      queryConditions.push({
        travelerType: {
          $in: filters["Tour type"].map((type) => new RegExp(`^${type}$`, "i")),
        },
      });
    }

    if (filters["States"]) {
      let statesFilter = filters["States"];

      // Convert to array if it's not already
      if (!Array.isArray(statesFilter)) {
        statesFilter = [statesFilter];
      }

      queryConditions.push({
        state: {
          $in: statesFilter.map((type) => new RegExp(`^${type}$`, "i")),
        },
      });
    }

    if (req.query.searchValue) {
      //const regex = new RegExp(".*" +`^${req.query.searchValue}$`+".*", "i")
      const regex = new RegExp(
        ".*" + req.query.searchValue.split(" ").join(".*") + ".*",
        "i"
      );
      queryConditions.push({
        $or: [
          { name: regex },
          { state: regex },
          { destinations: regex },
          { route: regex },
          { about: regex },
          { "deptcities.City": regex },
          { "deptcities.State": regex },
          { tripType: regex },
          { "itinerary.description": regex },
          { activities: regex },
          { things_to_carry: regex },
          { guidelines: regex },
          { bookncancel: regex },
          { placestovisit: regex },
          { travelerType: regex },
          { tripCategories: regex },
        ],
      });
    }

    // Filter by departure date (only apply if dates are provided)
    if (
      filters["Filter by departure date between"] &&
      filters["Filter by departure date between"].length === 2
    ) {
      const [startDate, endDate] = filters["Filter by departure date between"];
      queryConditions.push({
        $or: [
          {
            trip_dates: { $gte: new Date(startDate), $lte: new Date(endDate) },
          },
          {
            upcomingtrip: {
              $gte: new Date(startDate),
              $lte: new Date(endDate),
            },
          },
        ],
      });
    }
    // Execute query with all filters applied
    const query = queryConditions.length > 0 ? { $and: queryConditions } : {};
    let tourQuery = NewTours.find(query);
    // Sort by recently updated records only if flag is passed
    if (sortByLatestUpdate) {
      tourQuery = tourQuery.sort({ updatedAt: -1 });
    } else {
      tourQuery = tourQuery.sort({ displayOrder: 1 })
    }
    const tourList = await tourQuery;
    return {
      tours: tourList,
      filters: filters,
    };
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// Fetch all tours
exports.getTours = async (req, res) => {
  try {
    const response = await this.getFiltertourAPIUseOnly(req, res, true); // Use NewTours instead of NewToursSchema
    // Determine baseUrl based on environment
    const baseUrl = process.env.NODE_ENV === 'production'
      ? 'https://https://www.dejavutours.in/' // Replace with your production domain
      : 'http://localhost:5000'; // Adjust port if needed
    //res.json(tours);
    res.render("pages/tourlist", {
      tourPackages: response.tours,
      filterChips: Object.values(response.filters).flat(),
      Searchvalue: req.query.searchValue,
      baseUrl
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Api method is used for upload image from textEditor while upload from text editor
exports.uploadImage = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    const filePath = `/images/${req.file.filename}`; // Correct URL
    res.json({ success: true, imageUrl: filePath });

    // res.json({ success: true, imageUrl: `/images/${fileName}` });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Validate unique tour name before adding or updating a tour
exports.getCheckToursUnique = async (req, res, next) => {
  try {
    const { name, tripId } = req.body; // Extract name and tripId from request body

    // Check if a tour with the given name already exists
    const ifExist = await NewTours.findOne({ name });

    if (ifExist) {
      if (tripId) {
        // Case: Updating an existing tour
        // Allow update only if the found record is the same as the one being updated
        if (ifExist._id.toString() !== tripId.toString()) {
          return res.json({
            exists: true,
            message: "Tour name already exists",
          });
        }
      } else {
        // Case: Adding a new tour
        return res.json({ exists: true, message: "Tour name must be unique" });
      }
    }
    res.json({ exists: false }); // No duplicate found, tour name is unique
  } catch (error) {
    console.error("Error in getCheckToursUnique:", error);
    res.status(500).json({ success: false, message: "Server error", error });
  }
};

// Add new trip detail
exports.postNewAddTours = async (req, res) => {
  try {
    const {
      name,
      tripId,
      state,
      destinations,
      route,
      days,
      price,
      tripType,
      about,
      activities,
      things_to_carry,
      package_cost,
      includenexclude,
      infonfaq,
      bookncancel,
      guidelines,
      altitude,
      bestSession,
      tripCategories, // Add new field
      bestMonthToVisit, // Add new field
      travelerType,
      existingImage,
      existingDocument,
      itinerary,
      deptcities,
      trip_dates,
    } = req.body;

    // Check if the tour name already exists
    const existingTour = await NewTours.findOne({ name, isActive: true, isDeleted: false });
    if (
      existingTour &&
      (!tripId || existingTour._id.toString() !== tripId.toString())
    ) {
      if (req.files && req.files.length > 0) {
        req.files.forEach((file) =>
          fileHelper.deleteFile(
            file.path.startsWith("images/")
              ? file.path
              : `documents/tours/${file.filename}`
          )
        );
      }
      return res.status(400).json({
        success: false,
        message: "Trip name must be unique",
        exists: true,
      });
    }

    // Parse JSON fields
    const parseJSONField = (field) =>
      typeof field === "string" ? JSON.parse(field) : field;
    const parsedItinerary = parseJSONField(itinerary);
    const parsedDeptCities = parseJSONField(deptcities);
    const parsedTripDates = parseJSONField(trip_dates);

    // Parse multi-select fields (arrays)
    const parsedBestSession = Array.isArray(bestSession)
      ? bestSession
      : typeof bestSession === "string"
        ? bestSession.split(",")
        : [];
    const parsedTripCategories = Array.isArray(tripCategories)
      ? tripCategories
      : typeof tripCategories === "string"
        ? tripCategories.split(",")
        : [];
    const parsedBestMonthToVisit = Array.isArray(bestMonthToVisit)
      ? bestMonthToVisit
      : typeof bestMonthToVisit === "string"
        ? bestMonthToVisit.split(",")
        : [];
    const parsedTravelerType = Array.isArray(travelerType)
      ? travelerType
      : typeof travelerType === "string"
        ? travelerType.split(",")
        : [];

    // Validate required fields
    const requiredFields = ["name", "state"];
    const missingFields = requiredFields.filter((field) => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // Handle image and document uploads
    let imageurl = existingImage || null;
    let documentUrl = existingDocument || null;
    let bannerimages = tripId
      ? (await NewTours.findById(tripId))?.bannerimages || []
      : [];

    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        if (file.mimetype === "application/pdf") {
          // Handle PDF
          documentUrl = `/documents/tours/${file.filename}`;
        } else {
          // Handle images
          imageurl = `/images/tours/${file.filename}`;
        }
      });
    }

    if (!imageurl && !tripId) {
      return res.status(400).json({
        success: false,
        message: "Main image is required for new trips",
      });
    }

    // Map deptcities to include new fields
    const formattedDeptCities = parsedDeptCities.map((city) => ({
      City: city.City || "",
      State: city.State || "",
      tripDuration: city.tripDuration || "",
      dates: city.dates || [],
      price: city.price || [],
      availableSlots: city.availableSlots || "0", // Ensure default
      partialPayment: city.partialPayment || "0", // Ensure default
      bookingCutoffDays: city.bookingCutoffDays || "0", // Ensure default
    }));

    // Set isActive based on form submission
    const isActive =
      req.body.isActive === "on" ||
      req.body.isActive === "true" ||
      req.body.isActive === true;

    const tourData = {
      name,
      state,
      imageurl,
      bannerimages,
      documentUrl,
      destinations,
      route,
      days,
      price: parseFloat(price) || 0,
      tripType,
      about,
      activities,
      itinerary: parsedItinerary,
      things_to_carry,
      includenexclude,
      package_cost,
      infonfaq,
      bookncancel,
      guidelines,
      trip_dates: parsedTripDates,
      deptcities: formattedDeptCities,
      altitude,
      bestSession: parsedBestSession,
      tripCategories: parsedTripCategories,
      bestMonthToVisit: parsedBestMonthToVisit,
      travelerType: parsedTravelerType,
      isActive, // Ensure isActive is set
    };

    if (tripId) {
      // Update existing trip
      const existingTrip = await NewTours.findById(tripId);
      if (imageurl && imageurl !== existingTrip.imageurl) {
        fileHelper.deleteFile(
          existingTrip.imageurl.replace("/images/tours/", "images/tours/")
        );
      }
      if (documentUrl && documentUrl !== existingTrip.documentUrl) {
        if (existingTrip.documentUrl) {
          fileHelper.deleteFile(
            existingTrip.documentUrl.replace(
              "/documents/tours/",
              "documents/tours/"
            )
          );
        }
      }
      const updatedTrip = await NewTours.findByIdAndUpdate(tripId, tourData, {
        new: true,
      });
      return res.status(200).json({
        success: true,
        message: "Trip updated successfully",
        trip: updatedTrip,
      });
    } else {
      // Create new trip
      const newTour = new NewTours(tourData);
      const savedTour = await newTour.save();
      return res.status(201).json({
        success: true,
        message: "Trip created successfully",
        trip: savedTour,
      });
    }
  } catch (error) {
    console.error("Error in postNewAddTours:", error);
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) =>
        fileHelper.deleteFile(
          file.path.startsWith("images/")
            ? file.path
            : `documents/tours/${file.filename}`
        )
      );
    }
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// Trip detial page new API and controller from the UI
// New trip detail by trip id
exports.getTripDetialbyName = async (req, res, next) => {
  try {
    const tripId = req.params?.name;
    const tripdetails = await NewTours.findOne({ name: tripId });

    if (!tripdetails) {
      return res
        .status(404)
        .json({ success: false, message: "Trip not found" });
    }

    // Define a default image path for unmatched or missing departure cities
    const defaultImage = "/images/default-departure.png";

    // Ensure deptcities exists and has valid values
    if (!tripdetails.deptcities || tripdetails.deptcities.length === 0) {
      tripdetails.deptcities = [
        {
          City: "Unknown",
          State: "Unknown",
          image: defaultImage,
        },
      ];
    }

    // Extract departure cities with valid values
    const departureCities = tripdetails.deptcities
      .filter(({ City, State }) => City && State)
      .map(({ City, State }) => ({
        City: City.trim().toLowerCase(),
        State: State.trim().toLowerCase(),
      }));

    // Fetch only matching city images
    let matchedCities = [];
    if (departureCities.length > 0) {
      matchedCities = await City.find(
        {
          $or: departureCities.map(({ City, State }) => ({
            name: { $regex: new RegExp(`^${City}$`, "i") },
            state: { $regex: new RegExp(`^${State}$`, "i") },
            isDeleted: false,
          })),
        },
        { image: 1, name: 1, state: 1 }
      );
    }

    // Map city images to deptcities
    const deptCitiesWithImages = tripdetails.deptcities.map((deptCity) => {
      if (!deptCity.City || !deptCity.State) {
        return {
          ...deptCity,
          City: "Unknown",
          State: "Unknown",
          image: defaultImage,
        };
      }

      const cityMatch = matchedCities.find(
        (city) =>
          city.name.toLowerCase() === deptCity.City.trim().toLowerCase() &&
          city.state.toLowerCase() === deptCity.State.trim().toLowerCase()
      );

      return {
        ...deptCity._doc,
        image: cityMatch ? cityMatch.image : defaultImage,
      };
    });

    // NEW: Verify if documentUrl points to an existing file
    let documentUrl = tripdetails.documentUrl || "";
    if (documentUrl) {
      const filePath = path.join(__dirname, "..", documentUrl);
      try {
        await fs.promises.access(filePath, fs.constants.F_OK);
      } catch (err) {
        console.warn(`PDF file not found at ${filePath}`);
        documentUrl = ""; // Set to empty if file doesn't exist
      }
    }
    // requrie to identify the user is logged in or not, will be find batter idea
    let loggedGmailUser = null;
    if (req.user) {
      loggedGmailUser = req.user;
    }

    // Fetch recommended trips based on categories
    let recommendedTrips = [];
    try {
      // Get current trip's categories
      const currentTripCategories = tripdetails.tripCategories || [];

      if (currentTripCategories.length > 0) {
        // Find trips with matching categories, excluding current trip
        recommendedTrips = await NewTours.find({
          _id: { $ne: tripdetails._id }, // Exclude current trip
          isActive: true,
          isDeleted: false,
          tripCategories: { $in: currentTripCategories }
        })
          .select('name state imageurl destinations days price tripCategories')
          .sort({ displayOrder: 1, createdAt: -1 })
          .limit(6); // Limit to 6 recommended trips
      }

      // If no category-based recommendations or not enough trips, get general recommendations
      if (recommendedTrips.length < 3) {
        const additionalTrips = await NewTours.find({
          _id: { $nin: [tripdetails._id, ...recommendedTrips.map(t => t._id)] },
          isActive: true,
          isDeleted: false
        })
          .select('name state imageurl destinations days price tripCategories')
          .sort({ displayOrder: 1, createdAt: -1 })
          .limit(6 - recommendedTrips.length);

        recommendedTrips = [...recommendedTrips, ...additionalTrips];
      }
    } catch (error) {
      console.error("Error fetching recommended trips:", error);
      // Continue without recommended trips if there's an error
    }

    res.render("pages/TripDetail", {
      trips: {
        ...tripdetails._doc,
        deptcities: deptCitiesWithImages,
        documentUrl,
        loggedGmailUser,
        csrfToken: req.csrfToken() // Pass the CSRF token to the EJS template
      },
      recommendedTrips: recommendedTrips || []
    });
  } catch (error) {
    console.error("Error fetching trip details:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* New trip detail by trip id
 * POST /admin/deleteTrip - Deletes a NewTours trip by ID
 * @param {Object} req - Express request object with tripId
 * @param {Object} res - Express response object
 */
exports.deleteTrip = async (req, res) => {
  try {
    const { tripId } = req.body;

    console.log("deleteTrip called with tripId:", tripId); // Debug log

    if (!tripId) {
      return res
        .status(400)
        .json({ success: false, message: "Trip ID is required" });
    }

    const result = await NewTours.deleteOne({ _id: tripId });
    console.log("Delete result:", result); // Debug log
    if (result.deletedCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Trip not found" });
    }

    res.json({ success: true, message: "Trip deleted successfully" });
  } catch (error) {
    console.error("Error in deleteTrip:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

/**
 * POST /admin/updateImageUrl - Updates the single required imageurl for a NewTours trip
 * Replaces the existing imageurl with a new one; deletion not allowed.
 * @param {Object} req - Express request with tripId and single image file
 * @param {Object} res - Express response object
 */
exports.updateImageUrl = async (req, res) => {
  try {
    const { tripId } = req.body;
    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No image uploaded" });
    }
    if (req.files.length > 1) {
      req.files.forEach((file) =>
        fileHelper.deleteFile(`images/tours/${file.filename}`)
      );
      return res.status(400).json({
        success: false,
        message: "Only one image allowed for imageurl",
      });
    }

    const newImageUrl = `/images/tours/${req.files[0].filename}`; // Updated path
    const trip = await NewTours.findById(tripId);
    if (!trip) {
      fileHelper.deleteFile(`images/tours/${req.files[0].filename}`);
      return res
        .status(404)
        .json({ success: false, message: "Trip not found" });
    }

    if (trip.imageurl) {
      fileHelper.deleteFile(
        trip.imageurl.replace("/images/tours/", "images/tours/")
      ); // Updated path
    }
    trip.imageurl = newImageUrl;
    await trip.save();

    res.json({ success: true, imageUrl: newImageUrl });
  } catch (error) {
    console.error("Error in updateImageUrl:", error);
    res.status(500).json({ success: false, message: "Server error", error });
  }
};

/**
 * POST /admin/updateBannerImages - Adds new banner images to a NewTours trip
 * Appends new images to the bannerimages array.
 * @param {Object} req - Express request with tripId and multiple image files
 * @param {Object} res - Express response object
 */
exports.updateBannerImages = async (req, res) => {
  try {
    const { tripId } = req.body;
    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No images uploaded" });
    }

    const imageUrls = req.files.map((file) => `/images/tours/${file.filename}`); // Updated path
    await NewTours.updateOne(
      { _id: tripId },
      { $push: { bannerimages: { $each: imageUrls } } }
    );

    res.json({ success: true, imageUrls });
  } catch (error) {
    console.error("Error in updateBannerImages:", error);
    res.status(500).json({ success: false, message: "Server error", error });
  }
};

/**
 * POST /admin/removeBannerImage - Removes a specific banner image from a NewTours trip
 * Pulls the specified image URL from the bannerimages array.
 * @param {Object} req - Express request with tripId and imageUrl
 * @param {Object} res - Express response object
 */
exports.removeBannerImage = async (req, res) => {
  try {
    const { tripId, imageUrl } = req.body;
    const trip = await NewTours.findById(tripId);
    if (!trip) {
      return res
        .status(404)
        .json({ success: false, message: "Trip not found" });
    }

    await NewTours.updateOne(
      { _id: tripId },
      { $pull: { bannerimages: imageUrl } }
    );
    // fileHelper.deleteFile(imageUrl.replace("/images/tours/", "images/tours/")); // Updated path

    res.json({ success: true });
  } catch (error) {
    console.error("Error in removeBannerImage:", error);
    res.status(500).json({ success: false, message: "Server error", error });
  }
};

/**
 * POST /admin/changeTripStatus - Toggles the active status of a NewTours trip
 * Sets isActive to true/false for enabling/disabling trips.
 * @param {Object} req - Express request object with tripId and isActive
 * @param {Object} res - Express response object
 */
exports.changeTripStatus = async (req, res) => {
  try {
    const { tripId, isActive } = req.body;
    await NewTours.updateOne({ _id: tripId }, { $set: { isActive: isActive } });
    res.json({ success: true });
  } catch (error) {
    console.error("Error in changeTripStatus:", error);
    res.status(500).json({ success: false, message: "Server error", error });
  }
};

// pass date and join in query
exports.renderBookingTourPage = async (req, res) => {
  try {
    const tripId = req?.params?.tripid;
    const city = req?.query?.city;
    const existingTrip = await NewTours.findById(tripId).lean();

    if (
      !existingTrip ||
      !existingTrip.deptcities ||
      existingTrip.deptcities.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message: "Trip or departure cities not found",
      });
    }

    // Initialize selected city data
    existingTrip.selectedCityDates = [];
    existingTrip.transportList = [];

    const selectedCity = existingTrip.deptcities.find(
      (cityDetail) => cityDetail.City.toLowerCase() === city?.toLowerCase()
    );

    if (selectedCity && selectedCity.dates && selectedCity.dates.length > 0) {
      const now = new Date();
      now.setUTCHours(0, 0, 0, 0); // Use UTC for filtering
      const monthMap = {
        January: 0,
        February: 1,
        March: 2,
        April: 3,
        May: 4,
        June: 5,
        July: 6,
        August: 7,
        September: 8,
        October: 9,
        November: 10,
        December: 11,
      };

      // Parse tripDuration as a number, default to 1 if invalid
      const duration = parseInt(selectedCity.tripDuration, 10) || 1;

      selectedCity.dates.forEach((dateBlock) => {
        const { Month, Year, dates } = dateBlock;
        const monthIndex = monthMap[Month];
        if (!dates || !Year || monthIndex === undefined) return;

        const dateList = dates
          .split(",")
          .map((day) => parseInt(day.trim()))
          .filter((day) => !isNaN(day));
        dateList.forEach((day) => {
          const startDate = new Date(Date.UTC(parseInt(Year), monthIndex, day));
          if (startDate >= now) {
            const endDate = new Date(startDate);
            endDate.setUTCDate(startDate.getUTCDate() + duration - 1); // Duration includes start day
            const formatDate = (date) =>
              `${String(date.getUTCDate()).padStart(
                2,
                "0"
              )} ${date.toLocaleString("en-US", {
                month: "short",
                timeZone: "UTC",
              })} ${date.getUTCFullYear()}`;
            existingTrip.selectedCityDates.push({
              value: startDate.toISOString(),
              text: `${formatDate(startDate)} - ${formatDate(endDate)}`,
            });
          }
        });
      });

      // Sort dates chronologically
      existingTrip.selectedCityDates.sort(
        (a, b) => new Date(a.value) - new Date(b.value)
      );

      // Set transportList for the selected city
      existingTrip.transportList =
        selectedCity.price && selectedCity.price.length > 0
          ? selectedCity.price
          : [];
    }

    // Set selectedInfo
    if (req.query) {
      existingTrip.selectedInfo = {
        city: req.query.city || "",
        date: req.query.date || "",
      };
    }

    // Filter deptcities to only the selected city for dropdown
    existingTrip.deptcities = existingTrip.deptcities.filter(
      (cityDetail) => cityDetail.City.toLowerCase() === city?.toLowerCase()
    );

    // Redirect to login if not authenticated
    if (!req.user && !req.verifiedPhoneNumber) {
      return res.redirect("/login");
    }

    // Fetch user data
    let userData = {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      birthDate: "",
      gender: "",
    };

    if (req.user) {
      userData.email = req.user.email || "";
      const gmailUser = await gmailuser.findOne({ email: req.user.email });
      if (gmailUser && gmailUser.details) {
        userData.id = gmailUser._id;
        userData.firstName =
          gmailUser.details.firstName || req.user.name?.split(" ")[0] || "";
        userData.lastName =
          gmailUser.details.lastName ||
          req.user.name?.split(" ").slice(1).join(" ") ||
          "";
        userData.email = gmailUser.details.email || req.user.email;
        userData.phone = gmailUser.details.mobileNumber || "";
        userData.birthDate = gmailUser.details.birthDate || "";
        userData.gender = gmailUser.details.gender || "";
        userData.isloginFromNumber = false;
      } else {
        userData.firstName = req.user.name?.split(" ")[0] || "Guest";
        userData.lastName = req.user.name?.split(" ").slice(1).join(" ") || "";
      }
    } else if (req.verifiedPhoneNumber) {
      const mobileUser = await Mobileuser.findOne({
        phoneNumber: req.verifiedPhoneNumber,
      });
      userData.phone = req.verifiedPhoneNumber || "";
      if (mobileUser && mobileUser.details) {
        userData.id = mobileUser._id;
        userData.firstName = mobileUser.details.firstName || "Guest";
        userData.lastName = mobileUser.details.lastName || "";
        userData.email = mobileUser.details.email || "";
        userData.birthDate = mobileUser.details.birthDate || "";
        userData.gender = mobileUser.details.gender || "";

        userData.isloginFromNumber = true;
      }
    }

    res.render("pages/BookTour", {
      tourDetails: existingTrip,
      userData,
      csrfToken: req.csrfToken(),
    });
  } catch (error) {
    console.error("Error in renderBookingTourPage:", error);
    res.status(500).json({ success: false, message: "Server error", error });
  }
};


exports.getTrips = async (req, res) => {
  try {
    // Fetch all non-deleted trips
    const trips = await NewTours.find({ isDeleted: false })
      .select('name state imageurl isActive destinations route days price tripType altitude bestSession tripCategories bestMonthToVisit travelerType activities about displayOrder')
      .sort({ displayOrder: 1, createdAt: -1 });

    // Get unique states for filter dropdown
    const states = await NewTours.distinct('state', { isDeleted: false });

    res.render('pages/admin/trips', {
      trips,
      states,
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.error('Error fetching trips:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateOrder = async (req, res) => {
  try {
    const { order } = req.body;

    if (!Array.isArray(order)) {
      return res.status(400).json({ success: false, message: 'Invalid order data' });
    }

    // Validate all IDs are valid MongoDB ObjectIds
    const isValidIds = order.every(id => mongoose.Types.ObjectId.isValid(id));
    if (!isValidIds) {
      return res.status(400).json({ success: false, message: 'Invalid trip IDs' });
    }

    // Update displayOrder for each trip
    const updatePromises = order.map(async (id, index) => {
      await NewTours.findByIdAndUpdate(id, { displayOrder: index }, { new: true });
    });

    await Promise.all(updatePromises);

    res.json({ success: true, message: 'Trip order updated successfully' });
  } catch (error) {
    console.error('Error updating trip order:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};