const express = require("express");

const Tours = require("../models/tours");

const Staycost = require("../models/staycost");
const gmailuser = require("../models/gmailuser");

const Newsletter = require("../models/newsletter");

const Contact = require("../models/contact");

const bookings = require("../models/registration");

const upcomingtrips = require("../models/upcoming");

const Accomodations = require("../models/accomodations");

const AccomodationsQuery = require("../models/accomodationquery");

const Blogs = require("../models/blog");

const User = require("../models/user");

const PaymentDetail = require("../models/payment-detail");

const Mobileuser = require("../models/mobileuser");

const NewTours = require("../models/newTours");

const TripBookingDetail = require("../models/TripBookingDetail");

const fileHelper = require("../util/file");

const PDFDocument = require("pdfkit");

const fs = require("fs");

const path = require("path");

const nodemailer = require("nodemailer");

const otpGenerator = require("otp-generator");

const AWS = require("aws-sdk");

const jwt = require("jsonwebtoken");

const City = require("../models/citymst");
const config = require("../json/statecities.json"); // Load state and city configuration

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_SMS,
  secretAccessKey: process.env.AWS_SECERET_ACCESS_KEY_SMS,
  region: process.env.AWS_REGION,
});

const { DeleteFileGallery, DeleteFileProofs, getFileStream } = require("../s3");
const { AsyncLocalStorage } = require("async_hooks");

var transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// send all the require detail to main index page of the user
exports.getIndexPage = async (req, res, next) => {
  const tests = await NewTours.find().distinct("name");
  const response = await this.getFiltertourAPIUseOnly(req, res, true);

  // Function to get state-wise trips (unchanged)
  async function getStateWiseTrips() {
    const validStatesRaw = await NewTours.aggregate([
      {
        $match: {
          isActive: true,
          state: { $exists: true, $ne: null, $ne: "" },
        },
      },
      {
        $project: {
          normalizedState: {
            $toUpper: { $trim: { input: "$state" } },
          },
        },
      },
      {
        $group: {
          _id: "$normalizedState",
          count: { $sum: 1 },
        },
      },
    ]);

    const validStates = validStatesRaw.map((stateDoc) => {
      const stateName = stateDoc._id;
      const imageFile = stateName.toLowerCase().replace(/\s+/g, "") + ".jpg";
      return {
        name: stateName,
        place: stateDoc.count,
        thumb: `/img/State/${imageFile}`,
      };
    });

    validStates.sort((a, b) => b.place - a.place);
    return validStates;
  }

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
                              { $ne: [{ $trim: { input: "$$category" } }, ""] },
                            ],
                          },
                        },
                      },
                      [],
                    ],
                  },
                ],
              },
              then: ["All"],
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
      { $sort: { _id: 1 } },
    ]);
  
    let categoryTrips = categoryTripsRaw
      .map((categoryDoc) => {
        const categoryName = categoryDoc._id;
        if (!categoryName || categoryName === "") return null;
        const imageFile = categoryImages[categoryName] || "default.jpg";
        return {
          name: categoryName,
          count: categoryDoc.count,
          trips: categoryDoc.trips,
          thumb: `/img/Tour category/${imageFile}`,
        };
      })
      .filter((item) => item !== null);
  
    categoryTrips.sort((a, b) => {
      if (a.name === "All") return 1;
      if (b.name === "All") return -1;
      return a.name.localeCompare(b.name);
    });
  
    return categoryTrips;
  }

  // New function to get departure city-wise trips
  async function getDepartureCityTrips() {
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
          "deptcities.City": { $exists: true, $nin: ["", null] }, // ✅ Exclude empty and null
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
              destinations:"$destinations",
              price: "$price",
              state: "$state",
              deptcity: "$deptcities.City",
              tripDuration: "$deptcities.tripDuration",
              dates: "$deptcities.dates",
              adultPrice: { $arrayElemAt: ["$deptcities.price.adultPrice", 0] },
            },
          },
        },
      },
      {
        $sort: { _id: 1 }, // Alphabetically sort city names
      },
    ]);
  
    const departureCities = departureCitiesRaw.map((cityDoc) => {
      const cityName = cityDoc._id;
      const imageFile = cityName.toLowerCase().replace(/\s+/g, "_") + "_city.jpg";
      return {
        name: cityName,
        count: cityDoc.count,
        thumb: `/img/cities/${imageFile}`, // e.g., /img/cities/ahmedabad_city.jpg
        trips: cityDoc.trips,
      };
    });
  
    return departureCities;
  }
  
  const placeItems = await getStateWiseTrips();
  const categoryItems = await getCategoryWiseTrips();
  const departureCities = await getDepartureCityTrips(); 

  const bannerImages = [
    { url: "/img/Banner & other/banner1.jpg", caption: "" },
    { url: "/img/Banner & other/banner2.jpg", caption: "" },
    { url: "/img/Banner & other/banner3.jpg", caption: "" },
    { url: "/img/Banner & other/banner4.jpg", caption: "" },
    { url: "/img/Banner & other/banner5.jpg", caption: "" },
    { url: "/img/Banner & other/banner6.jpg", caption: "" },
    { url: "/img/Banner & other/banner7.jpg", caption: "" },
    { url: "/img/Banner & other/banner8.jpg", caption: "" },
    { url: "/img/Banner & other/banner9.jpg", caption: "" },
    { url: "/img/Banner & other/banner10.jpg", caption: "" },
    { url: "/img/Banner & other/banner11.jpg", caption: "" },
    { url: "/img/Banner & other/banner12.jpg", caption: "" },
    { url: "/img/Banner & other/banner13.jpg", caption: "" },
    { url: "/img/Banner & other/banner14.jpg", caption: "" },
  ];

  res.render("pages/index", {
    tourPackages: response.tours,
    test: tests,
    user: req.user,
    placeItems,
    bannerImages,
    categoryItems,
    departureCities
  });
};

exports.postAddTours = async (req, res, next) => {
  const name = req.body.name;
  const ifexist = await Tours.find({ name: name });
  if (ifexist.length > 0) {
    fileHelper.deleteFile("images/" + req.file.filename);
    res.render("pages/Addtours", { message: "Trip must be unique" });
  } else {
    const state = req.body.state;
    const image = req.file;
    const imageurl = image.filename;
    const bannerimage = image.filename;
    const destinations = req.body.destinations;
    const route = req.body.route;
    const days = req.body.days;
    const tag = req.body.tag;
    const price = req.body.price;
    const about = req.body.about;
    const placestovisit = req.body.placestovisit;
    const activities = req.body.activities;
    const itinerary = req.body.itinerary;
    const things_to_carry = req.body.things_to_carry;
    const includenexclude = req.body.includenexclude;
    const package_cost = req.body.package_cost;
    const infonfaq = req.body.infonfaq;
    const Bookncancel = req.body.Bookncancel;
    const guidelines = req.body.guidelines;

    const tours = new Tours({
      name: name,
      state: state,
      imageurl: imageurl,
      bannerimage: bannerimage,
      destinations: destinations,
      route: route,
      days: days,
      tag: tag,
      price: price,
      about: about,
      placestovisit: placestovisit,
      activities: activities,
      itinerary: itinerary,
      things_to_carry: things_to_carry,
      includenexclude: includenexclude,
      package_cost: package_cost,
      infonfaq: infonfaq,
      Bookncancel: Bookncancel,
      guidelines: guidelines,
    });
    tours.save();
    res.redirect("/");
  }
};

exports.postNewsletter = async (req, res, next) => {
  const mail = req.body.emailid;

  const emailsearch = await Newsletter.find({ emailid: mail });
  console.log(emailsearch);
  if (emailsearch.length == 0) {
    const newsletter = new Newsletter({
      emailid: mail,
    });

    newsletter.save();
    res.redirect("/");
  } else {
    res.redirect("/");
  }
};

exports.getContact = async (req, res, next) => {
  const tests = await Tours.find().distinct("name");
  res.render("pages/contact", { test: tests });
};

exports.postContact = async (req, res, next) => {
  const addmessage = req.body.message;
  const addname = req.body.name;
  const addemail = req.body.email;
  const addsubject = req.body.subject;

  const contactsearch = await Contact.find({ emailid: addemail });

  if (contactsearch.length == 0) {
    const addcontact = new Contact({
      name: addname,
      emailid: addemail,
      message: addmessage,
      subject: addsubject,
    });

    addcontact.save();
    res.redirect("/");
  } else {
    res.redirect("/");
  }
};

exports.getAbout = async (req, res, next) => {
  const tests = await Tours.find().distinct("name");
  res.render("pages/about", { test: tests });
};

exports.getBookTrip = async (req, res, next) => {
  const tests = await Tours.find().distinct("name");
  res.render("pages/booktrip", {
    tripname: req.body.tripname,
    triprate: req.body.triprate,
    username: req.user?.name || null,
    useremail: req.user?.email || null,
    phonenumber: req.verifiedPhoneNumber ? "+" + req.verifiedPhoneNumber : null,
    tripdate: null,
    test: tests,
  });
};

exports.postBookTrip = (req, res, next) => {
  const mailid = req.body.email;
  const username = req.body.name;
  const usergender = req.body.gender;
  const userbirth = req.body.birthday;
  const usercontact = req.body.contact;
  const userdestination = req.body.destination;
  const usertripdate = req.body.tripdate;
  const notravellers = req.body.travellers;
  //const userproofobject = req.file;
  //const userproof = userproofobject.filename;

  const addbookings = new bookings({
    emailid: mailid,
    name: username,
    gender: usergender,
    birthdate: userbirth,
    contact: usercontact,
    destination: userdestination,
    tripdate: usertripdate,
    travellers: notravellers,
    //idproof: userproof,
  });

  addbookings.save().then((result) => {
    console.log("saved2");
    res.render("pages/booktrip", {
      msg: "yes",
      tripname: userdestination,
      tripdate: null,
      test: null,
    });
    let regbody =
      " emailid: " +
      mailid +
      " username: " +
      username +
      " usergender: " +
      usergender +
      " userbirth: " +
      userbirth +
      " usercontact: " +
      usercontact +
      " userdestination: " +
      userdestination +
      "co-travellers: " +
      notravellers +
      " usertripdate: " +
      usertripdate;
    var mailOptions = {
      from: process.env.GMAIL_USER,
      to: `${process.env.GMAIL_USER},${mailid}`,
      subject: `Trip Registration for ${userdestination} on ${usertripdate}`,
      attachments: {
        filename: "TripDetails.png",
        path: "images/pdfheader.png",
        cid: "testunique@tim.ec",
      },
      html:
        "<!DOCTYPE html>" +
        "<html><head><title>Appointment</title>" +
        "</head><body><div>" +
        '<img src="cid:testunique@tim.ec" alt="" width="700" height="200">' +
        "<br><br>" +
        `<b>Hi ${username},</b>` +
        "<p>Thank you for Registering your Trip with Dejavu, we will make your trip a memorable one</p>" +
        "<p>Please find your Registration Details:</p>" +
        `<p>Email: ${mailid}</p>` +
        `<p>Name: ${username}</p>` +
        `<p>Gender: ${usergender}</p>` +
        `<p>Contact: ${usercontact}</p>` +
        `<p>DOB: ${userbirth}</p>` +
        `<p>Destination: ${userdestination}</p>` +
        `<p>Co-travellers: ${notravellers}</p>` +
        `<p>Trip Date: ${usertripdate}</p>` +
        "<br>" +
        "<b>Regards,</b><br>" +
        "<b>Dejavu</b>" +
        "</div></body></html>",
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log("Email sent: " + info.response);
      }
    });
  });
};

exports.postEdit = async (req, res, next) => {
  try {
    const tripid = req.body.tripid;
    const tripdetails = await Tours.find({ _id: tripid });
    const alltitles = await Tours.find().distinct("name");
    const index = alltitles.indexOf(tripdetails[0].name);
    console.log(alltitles);
    console.log(index);
    if (index > -1) {
      alltitles.splice(index, 1);
    }
    var config = require("../json/statecities.json");
    let state_arr = [config];
    let states_arr = "";
    for (var key of state_arr) {
      states_arr = Object.keys(key);
    }
    res.render("pages/edittrip", {
      trips: tripdetails[0],
      alltrips: alltitles,
      states_arr: states_arr,
    });
  } catch (err) {
    console.log(err);
  }
};

exports.postDelete = (req, res, next) => {
  const tripid = req.body.tripid;
  Tours.findById(tripid)
    .then((tour) => {
      const imgpath = tour.imageurl;
      const allimage = tour.imageUrlAll;
      allimage.forEach((item) => {
        fileHelper.deleteFile("images/" + item);
      });
      fileHelper.deleteFile("images/" + imgpath);
      if (tour.bannerimage !== null) {
        fileHelper.deleteFile("images/" + tour.bannerimage);
      }
    })
    .catch((err) => {
      return console.log(err);
    });

  Tours.findByIdAndRemove(tripid, (err) => {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/");
    }
  });
};

exports.postAddeditedtours = (req, res, next) => {
  const tripid = req.body.tripid;
  const name = req.body.name;
  const state = req.body.state;
  const image = req.file;
  //const imageurl = image.filename;
  const destinations = req.body.destinations;
  const route = req.body.route;
  const days = req.body.days;
  const tag = req.body.tag;
  const price = req.body.price;
  const about = req.body.about;
  const placestovisit = req.body.placestovisit;
  const activities = req.body.activities;
  const itinerary = req.body.itinerary;
  const things_to_carry = req.body.things_to_carry;
  const includenexclude = req.body.includenexclude;
  const package_cost = req.body.package_cost;
  const infonfaq = req.body.infonfaq;
  const Bookncancel = req.body.Bookncancel;
  const guidelines = req.body.guidelines;

  // const ifduplicate = await Tours.find({_id: {$ne: tripid}, name: name });
  // if(ifduplicate){
  //   if (image) {
  //     fileHelper.deleteFile("images/" + image.filename);
  //   }
  //   return res.render('Pages/edit');
  // }

  Tours.findById(tripid)
    .then((trip) => {
      trip.name = name;
      trip.state = state;
      //trip.imageurl = imageurl;
      trip.destinations = destinations;
      trip.route = route;
      trip.days = days;
      trip.tag = tag;
      trip.price = price;
      trip.about = about;
      trip.placestovisit = placestovisit;
      trip.activities = activities;
      trip.itinerary = itinerary;
      trip.things_to_carry = things_to_carry;
      trip.includenexclude = includenexclude;
      trip.package_cost = package_cost;
      trip.infonfaq = infonfaq;
      trip.Bookncancel = Bookncancel;
      trip.guidelines = guidelines;

      if (image) {
        fileHelper.deleteFile("images/" + trip.imageurl);
        trip.imageurl = image.filename;
      }
      return trip.save().then((result) => {
        //console.log('UPDATED TRIP!');
        res.redirect("/");
      });
    })
    .catch((err) => {
      console.log(err);
    });
};

exports.postAddUpcoming = (req, res, next) => {
  const trip_date = req.body.tripdate;
  const tripid = req.body.tripid;

  Tours.findById(tripid)
    .then((trip) => {
      trip.upcomingtrip.push(trip_date);
      return trip.save().then((result) => {
        res.redirect("/");
      });
    })
    .catch((err) => {
      console.log(err);
    });
};

exports.getUpcomingTrips = async (req, res, next) => {
  const nexttrips = await Tours.find({
    upcomingtrip: { $exists: true, $not: { $size: 0 } },
  });
  const tests = await Tours.find().distinct("name");
  res.render("pages/upcoming", {
    upcomingtrips: nexttrips,
    test: tests,
  });
};

exports.getAccomodation = async (req, res, next) => {
  const allaccomodations = await Accomodations.find().sort({ updatedAt: -1 });
  const tests = await Tours.find().distinct("name");

  res.render("pages/accomodation", {
    accomodations: allaccomodations,
    test: tests,
  });
};

exports.getAddAccomodation = (req, res, next) => {
  res.render("pages/Addaccomodation", { message: null });
};

exports.postAddAccomodation = async (req, res, next) => {
  const name = req.body.name;
  const ifexist = await Accomodations.find({ name: name });
  if (ifexist.length > 0) {
    fileHelper.deleteFile("images/" + req.file.filename);
    res.render("pages/Addaccomodation", { message: "Accomodation Exist" });
  } else {
    const state = req.body.state;
    const image = req.file;
    const imageurl = image.filename;
    const destinations = req.body.destinations;
    const days = req.body.days;
    const tag = req.body.tag;
    const price = req.body.price;
    const about = req.body.about;
    const nearbyPlaces = req.body.nearbyPlaces;
    const Activities = req.body.Activities;
    const Amenities = req.body.Amenities;
    const Package = req.body.Package;
    const bookncancel = req.body.bookncancel;
    const guidelines = req.body.guidelines;

    const accomodations = new Accomodations({
      name: name,
      state: state,
      imageurl: imageurl,
      destinations: destinations,
      days: days,
      tag: tag,
      price: price,
      about: about,
      nearbyPlaces: nearbyPlaces,
      Activities: Activities,
      Amenities: Amenities,
      Package: Package,
      bookncancel: bookncancel,
      guidelines: guidelines,
      bannerimage: null,
    });

    accomodations.save();

    res.redirect("/");
  }
};

exports.postDeleteAccomodations = (req, res, next) => {
  const accodid = req.body.accodid;
  Accomodations.findById(accodid)
    .then((accod) => {
      const imgpath = accod.imageurl;
      const allimage = accod.imageUrlAll;
      allimage.forEach((item) => {
        fileHelper.deleteFile("images/" + item);
      });
      fileHelper.deleteFile("images/" + imgpath);
      if (accod.bannerimage !== null) {
        fileHelper.deleteFile("images/" + accod.bannerimage);
      }
    })
    .catch((err) => {
      return console.log(err);
    });

  Accomodations.findByIdAndRemove(accodid, (err) => {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/");
    }
  });
};

exports.postEditAccomodations = async (req, res, next) => {
  try {
    const accodid = req.body.accodid;
    const accoddetails = await Accomodations.find({ _id: accodid });
    res.render("pages/editaccomodation", { accod: accoddetails[0] });
  } catch (err) {
    console.log(err);
  }
};

exports.postAddEditAccomodations = (req, res, next) => {
  const accodid = req.body.accodid;
  const name = req.body.name;
  const state = req.body.state;
  const image = req.file;
  //const imageurl = image.filename;
  const destinations = req.body.destinations;
  const days = req.body.days;
  const tag = req.body.tag;
  const price = req.body.price;
  const about = req.body.about;
  const nearbyPlaces = req.body.nearbyPlaces;
  const Activities = req.body.Activities;
  const Amenities = req.body.Amenities;
  const Package = req.body.Package;
  const bookncancel = req.body.bookncancel;
  const guidelines = req.body.guidelines;

  Accomodations.findById(accodid)
    .then((trip) => {
      trip.name = name;
      trip.state = state;
      //trip.imageurl = imageurl;
      trip.destinations = destinations;
      trip.days = days;
      trip.tag = tag;
      trip.price = price;
      trip.about = about;
      trip.nearbyPlaces = nearbyPlaces;
      trip.Activities = Activities;
      trip.Amenities = Amenities;
      trip.Package = Package;
      trip.bookncancel = bookncancel;
      trip.guidelines = guidelines;

      if (image) {
        fileHelper.deleteFile("images/" + trip.imageurl);
        trip.imageurl = image.filename;
      }
      return trip.save().then((result) => {
        //console.log('UPDATED TRIP!');
        res.redirect("/");
      });
    })
    .catch((err) => {
      console.log(err);
    });
};

exports.getAccomodationsDetails = async (req, res, next) => {
  try {
    const token = req.params.token;
    const accoddetails = await Accomodations.find({ name: token });
    const tests = await Tours.find().distinct("name");
    res.render("pages/AccomodationsDetails", {
      accod: accoddetails[0],
      test: tests,
    });
  } catch (err) {
    console.log(err);
  }
};

exports.getStateFilters = async (req, res, next) => {
  try {
    const filter = {
      States: req.params.token,
    };
    req.query.filterValue = JSON.stringify(filter);

    const response = await this.getFiltertourAPIUseOnly(req, res, false);
    res.render("pages/StateFilter", {
      Tours: response.tours,
      tourPackages: response.tours,
    });
  } catch (err) {
    console.log(err);
  }
};

exports.getToursAddimage = async (req, res, next) => {
  const tripid = req.body.tripid;
  const tripfilter = await Tours.findById({ _id: tripid });
  const tests = await Tours.find().distinct("name");
  res.render("pages/addimages", { trip: tripfilter, test: tests });
};

exports.postImageAdded = async (req, res, next) => {
  const filter = req.body.filter;
  if (filter == "youtube") {
    const link = req.body.youtubeurl;
    const tripid = req.body.tripid;
    Tours.findById({ _id: tripid })
      .then((trip) => {
        trip.youtubeUrl[0] = link;
        //console.log(trip);
        trip.markModified("youtubeUrl");
        return trip.save().then((result) => {
          res.redirect("/");
        });
      })
      .catch((err) => {
        console.log(err);
      });
  } else {
    const image = req.file;
    const imageurl = image.filename;
    const tripid = req.body.tripid;
    Tours.findById({ _id: tripid }).then((trip) => {
      trip.imageUrlAll.push(imageurl);
      trip.markModified("imageUrlAll");
      trip.save();
    });
    res.redirect("/");
  }
};

exports.postBannerImageAdded = async (req, res, next) => {
  const image = req.file;
  const imageurl = image.filename;
  const tripid = req.body.tripid;
  Tours.findById({ _id: tripid }).then((trip) => {
    if (trip.bannerimage) {
      fileHelper.deleteFile("images/" + trip.bannerimage);
      trip.bannerimage = imageurl;
      trip.markModified("bannerimage");
      trip.save();
    } else {
      trip.bannerimage = imageurl;
      trip.markModified("bannerimage");
      trip.save();
    }
  });
  res.redirect("/");
};

exports.postDeleteimage = async (req, res, next) => {
  const tripid = req.body.tripid;
  const imageindex = parseInt(req.body.imageindex);
  const tripfilter = await Tours.findById({ _id: tripid });
  const name = tripfilter.imageUrlAll[imageindex];
  tripfilter.imageUrlAll.splice(imageindex, 1);
  tripfilter.markModified("imageUrlAll");
  tripfilter
    .save()
    .then((result) => {
      fileHelper.deleteFile("images/" + name);
      res.redirect("/");
    })
    .catch((err) => {
      console.log(err);
    });
};

exports.getAdminLogin = (req, res, next) => {
  res.render("pages/AdminPanel");
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
          res.redirect("/admin/login");
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
    // res.redirect('/admin/login');
  });
};

exports.postAccodQuery = (req, res, next) => {
  const name = req.body.name;
  const phone = req.body.phone;
  const message = req.body.message;
  const query = new AccomodationsQuery({
    name: name,
    phone: phone,
    message: message,
  });
  query
    .save()
    .then((err, data) => {
      res.redirect("/");
      let accodbody =
        "name: " + name + " Phone: " + phone + " message: " + message;
      var mailOptions = {
        from: process.env.GMAIL_USER,
        to: process.env.GMAIL_USER,
        subject: "Accomodation Query",
        html: accodbody,
      };

      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.log(error);
        } else {
          console.log("Email sent: " + info.response);
        }
      });
    })
    .catch((err) => {
      console.log(err);
    });
};

exports.getAccodDetails = async (req, res, next) => {
  try {
    const accods = await AccomodationsQuery.find({});
    res.render("pages/accomodationquery", {
      accomodations: accods.reverse(),
    });
  } catch (err) {
    console.log(err);
  }
};

exports.getViewRegistration = (req, res, next) => {
  bookings
    .find({})
    .then((result) => {
      res.render("pages/regquery", {
        bookings: result,
      });
    })
    .catch((err) => {
      console.log(err);
    });
};

exports.getViewEmails = (req, res, next) => {
  Newsletter.find({})
    .then((result) => {
      res.render("pages/viewmail", {
        mails: result,
      });
    })
    .catch((err) => {
      console.log(err);
    });
};

exports.postDeleteAccod = (req, res, next) => {
  const accodid = req.body.accodid;
  AccomodationsQuery.findOneAndDelete({ _id: accodid })
    .then((result) => {
      res.redirect("/admin/login");
    })
    .catch((err) => {
      console.log(err);
    });
};

exports.getDownloadPDF = (req, res, next) => {
  const regid = req.params.regid;

  bookings
    .findById({ _id: regid })
    .then((data) => {
      const pdfDoc = new PDFDocument();
      const fname = data.name + ".pdf";
      //const imgpath = 'images/proofs/' + data.idproof;
      //console.log(imgpath);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", 'inline; filename="' + fname + '"');
      pdfDoc.pipe(res);
      pdfDoc.image("images/pdfheader.png", 0, 0, { width: 620 });
      pdfDoc.moveDown();
      pdfDoc.moveDown();
      pdfDoc.moveDown();
      pdfDoc.moveDown();
      pdfDoc.moveDown();
      pdfDoc.moveDown();
      pdfDoc.moveDown();
      pdfDoc.moveDown();
      pdfDoc.moveDown();
      pdfDoc.moveDown();
      pdfDoc
        .fontSize(25)
        .font("Times-Roman")
        .fillColor("black")
        .text("Trekker Details", { align: "center" });
      pdfDoc
        .fontSize(15)
        .text("-------------------------------------------------------", {
          align: "center",
        });
      pdfDoc.moveDown();
      pdfDoc
        .fontSize(12)
        .fillColor("black")
        .text("name :             " + data.name, { align: "left" });
      pdfDoc.moveDown();
      pdfDoc
        .fontSize(12)
        .fillColor("black")
        .text("email :            " + data.emailid, { align: "left" });
      pdfDoc.moveDown();
      pdfDoc
        .fontSize(12)
        .fillColor("black")
        .text("contact :          " + data.contact, { align: "left" });
      pdfDoc.moveDown();
      pdfDoc
        .fontSize(12)
        .fillColor("black")
        .text("gender :           " + data.gender, { align: "left" });
      pdfDoc.moveDown();
      pdfDoc
        .fontSize(12)
        .fillColor("black")
        .text("destination :      " + data.destination, { align: "left" });
      pdfDoc.moveDown();
      pdfDoc
        .fontSize(12)
        .fillColor("black")
        .text("trip date :        " + data.tripdate, { align: "left" });
      pdfDoc.moveDown();
      pdfDoc
        .fontSize(12)
        .fillColor("black")
        .text("birth date :       " + data.birthdate, { align: "left" });
      pdfDoc.image("images/pdffooter.png", 0, 700, { width: 620 });
      // if(fs.existsSync(imgpath)){
      //   pdfDoc.moveDown();
      //   pdfDoc.fontSize(15).fillColor('green').text('-------------------------------------------------------', { align : 'center'});
      //   pdfDoc.fontSize(15).fillColor('green').text('ID PROOF', { align : 'center'});
      //   pdfDoc.moveDown();
      //   pdfDoc.image(imgpath, 150, 300, {width: 300});
      // };
      pdfDoc.end();
    })
    .catch((err) => {
      console.log(err);
    });
};

exports.getAdminCode = (req, res, next) => {
  res.render("pages/code");
};

exports.getAccodAddImage = async (req, res, next) => {
  const tests = await Tours.find().distinct("name");
  const accodid = req.body.accodid;
  const accodfilter = await Accomodations.findById({ _id: accodid });
  res.render("pages/accodaddimages", { accod: accodfilter, test: tests });
};

exports.postAccodImageAdded = async (req, res, next) => {
  const filter = req.body.filter;
  if (filter == "youtube") {
    const link = req.body.youtubeurl;
    const accodid = req.body.accodid;
    Accomodations.findById({ _id: accodid })
      .then((accod) => {
        //console.log(accod);
        accod.youtubeUrl[0] = link;
        //console.log(trip);
        accod.markModified("youtubeUrl");
        return accod.save().then((result) => {
          res.redirect("/");
        });
      })
      .catch((err) => {
        console.log(err);
      });
  } else {
    const image = req.file;
    const imageurl = image.filename;
    const accodid = req.body.accodid;
    Accomodations.findById({ _id: accodid }).then((accod) => {
      accod.imageUrlAll.push(imageurl);
      accod.markModified("imageUrlAll");
      accod.save();
    });
    res.redirect("/");
  }
};

exports.postDeleteAccodImage = async (req, res, next) => {
  const accodid = req.body.accodid;
  const imageindex = parseInt(req.body.imageindex);
  const accodfilter = await Accomodations.findById({ _id: accodid });
  const name = accodfilter.imageUrlAll[imageindex];
  accodfilter.imageUrlAll.splice(imageindex, 1);
  accodfilter.markModified("imageUrlAll");
  accodfilter
    .save()
    .then((result) => {
      fileHelper.deleteFile("images/" + name);
      res.redirect("/");
    })
    .catch((err) => {
      console.log(err);
    });
};

exports.postAccodBannerImageAdded = (req, res, next) => {
  const image = req.file;
  const imageurl = image.filename;
  const accodid = req.body.accodid;
  Accomodations.findById({ _id: accodid }).then((accod) => {
    if (accod.bannerimage) {
      fileHelper.deleteFile("images/" + accod.bannerimage);
      accod.bannerimage = imageurl;
      accod.markModified("bannerimage");
      accod.save();
    } else {
      accod.bannerimage = imageurl;
      accod.markModified("bannerimage");
      accod.save();
    }
  });
  res.redirect("/");
};

exports.postDeleteUpcomingDate = async (req, res, next) => {
  const tripid = req.body.tripid;
  const dateindex = parseInt(req.body.tripdateindex);
  const tripfilter = await Tours.findById({ _id: tripid });
  const name = tripfilter.upcomingtrip[dateindex];
  tripfilter.upcomingtrip.splice(dateindex, 1);
  tripfilter.markModified("upcomingtrip");
  tripfilter
    .save()
    .then((result) => {
      res.redirect("/");
    })
    .catch((err) => {
      console.log(err);
    });
};

exports.postBookDate = async (req, res, next) => {
  const tests = await Tours.find().distinct("name");
  res.render("pages/booktrip", {
    tripname: req.body.tripname,
    triprate: req.body.triprate,
    username: req.user?.name || null,
    useremail: req.user?.email || null,
    phonenumber: req.verifiedPhoneNumber ? "+" + req.verifiedPhoneNumber : null,
    tripdate: req.body.tripdate ? req.body.tripdate : null,
    test: tests,
  });
};

exports.postDeleteRegistration = (req, res, next) => {
  const regid = req.body.regid;
  bookings
    .findByIdAndDelete(regid)
    .then(() => {
      //fileHelper.deleteFile("images/proofs/" + req.body.idproof);
      //DeleteFileProofs(req.body.idproof);
      //console.log("deletedd");
      res.redirect("/admin/login");
    })
    .catch((err) => {
      console.log(err);
    });
};

exports.getBlog = async (req, res, next) => {
  const allblogs = await Blogs.find().sort({ updatedAt: -1 });
  const distinctTags = await Blogs.find().distinct("tag");
  const tests = await Tours.find().distinct("name");
  res.render("pages/blog", {
    blogs: allblogs,
    tags: distinctTags,
    test: tests,
  });
};

exports.getSingleBlog = async (req, res, next) => {
  const mdbid = req.params.id;
  const singleblog = await Blogs.findById({ _id: mdbid });
  const recentblog = await Blogs.find().sort({ updatedAt: -1 }).limit(3);
  const distinctTags = await Blogs.find().distinct("tag");
  const tests = await Tours.find().distinct("name");
  res.render("pages/singleblog", {
    blog: singleblog,
    blogs: recentblog,
    tags: distinctTags,
    test: tests,
  });
};

exports.getAddBlog = (req, res, next) => {
  res.render("pages/addblog", { message: null });
};

exports.postAddBlog = async (req, res, next) => {
  console.log(req.body);
  const title = req.body.title;
  const tag = req.body.tag;
  const tripdate = req.body.tripdate;
  const content = req.body.content;
  const imagename = req.file.filename;
  const headerlines = req.body.headerline;
  const insta = req.body.insta;
  const facebk = req.body.facebk;
  const name = req.body.bloggername;

  const blog = new Blogs({
    tripdate: tripdate,
    title: title,
    tag: tag,
    content: content,
    imageurl: imagename,
    headerline: headerlines,
    instagram: insta,
    facebook: facebk,
    blogger: name,
  });
  blog.save();
  res.redirect("/");
};

exports.getTagFilter = async (req, res, next) => {
  const tagid = req.params.id;
  const allblogs = await Blogs.find({ tag: tagid });
  const distinctTags = await Blogs.find().distinct("tag");
  const recentblog = await Blogs.find().sort({ updatedAt: -1 }).limit(3);
  const tests = await Tours.find().distinct("name");
  res.render("pages/blogfilter", {
    blogs: allblogs,
    tags: distinctTags,
    recent: recentblog,
    test: tests,
  });
};

exports.getSearchTrip = async (req, res, next) => {
  const searchtext = req.body.SearchTrip;
  const searchresult = await Tours.find({ name: searchtext });
  const tests = await Tours.find().distinct("name");
  res.render("pages/search", {
    Tours: searchresult,
    test: tests,
  });
};

exports.getSearchBlog = async (req, res, next) => {
  const searchtext = req.body.searchblog;
  const searchresult = await Blogs.find({
    title: { $regex: searchtext, $options: "imxs" },
  });
  const distinctTags = await Blogs.find().distinct("tag");
  const tests = await Tours.find().distinct("name");
  res.render("pages/blog", {
    blogs: searchresult,
    tags: distinctTags,
    test: tests,
  });
};

exports.postDeleteBlog = (req, res, next) => {
  const dbid = req.body._id;

  Blogs.findById(dbid)
    .then((blog) => {
      fileHelper.deleteFile("images/blog/" + blog.imageurl);
    })
    .catch((err) => {
      return console.log(err);
    });

  Blogs.findByIdAndRemove(dbid, (err) => {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/");
    }
  });
};

exports.getEditBlog = async (req, res, next) => {
  const dbid = req.body._id;
  const singleblog = await Blogs.findById(dbid);
  res.render("pages/editblog", {
    blog: singleblog,
    message: null,
  });
};

exports.postEditblog = (req, res, next) => {
  Blogs.findById(req.body.blogid)
    .then((blog) => {
      blog.tripdate = req.body.tripdate;
      blog.headerline = req.body.headerline;
      blog.title = req.body.title;
      blog.tag = req.body.tag;
      blog.blogger = req.body.bloggername;
      blog.content = req.body.content;
      blog.instagram = req.body.insta;
      blog.facebook = req.body.facebk;

      if (req.file) {
        fileHelper.deleteFile("images/blog/" + blog.imageurl);
        blog.imageurl = req.file.filename;
      }

      return blog.save().then((result) => {
        //console.log('UPDATED TRIP!');
        res.redirect("/");
      });
    })
    .catch((err) => {
      console.log(err);
    });
};

exports.getcalculateCosting = async (req, res, next) => {
  const result = await Staycost.find(); //.distinct('stay_name');
  //console.log(result.length);return false;
  res.render("pages/costingcal", { stays: result, message: "" });
};

exports.getStayCost = async (req, res, next) => {
  const result = await Staycost.find();
  res.render("pages/staycostadd", { stays: result, message: null });
};

exports.postStayCost = async (req, res, next) => {
  const destination = req.body.destination;
  const stayname = req.body.stayname;
  const category = req.body.category;
  const staycost = req.body.staycost;
  if (req.body.submit == "edit") {
    const staycostsearch = await Staycost.findById(req.body.stay_id);
    staycostsearch.category = category;
    staycostsearch.destination = destination;
    staycostsearch.stay_cost = staycost;
    staycostsearch.stay_name = stayname;
    staycostsearch.save();
  } else {
    const addcosting = new Staycost({
      category: category,
      destination: destination,
      stay_cost: staycost,
      stay_name: stayname,
    });
    addcosting.save();
  }
  res.redirect("/admin/getStayCost");
};

exports.deleteStay = async (req, res, next) => {
  const stayid = req.body.stayid;
  Staycost.findByIdAndDelete(stayid)
    .then(() => {
      res.redirect("/admin/getStayCost");
    })
    .catch((err) => {
      console.log(err);
    });
};

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

// Get the Add/Edit Tours detail page
// - If no trip ID is provided, return the Add Tours page with required details
// - If a trip ID is provided, fetch and return trip details for editing
exports.getAddTours = async (req, res, next) => {
  try {
    // Extract states from configuration file
    const states_arr = Object.keys(config);

    // Check if request body contains a trip ID (for editing an existing tour)
    const tripid = req.query.tripid;
    if (tripid) {
      // Validate if tripid is a valid MongoDB ObjectId
      if (!tripid.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ error: "Invalid Trip ID format" });
      }

      try {
        // Fetch trip details from the database
        const tripdetails = await NewTours.findOne({ _id: tripid }).populate(
          "CityId"
        );

        if (!tripdetails) {
          return res.status(404).json({ error: "Trip not found" });
        }

        // Render Update Tours page with fetched trip details
        return res.render("pages/Addtours", {
          message: null,
          trips: tripdetails,
          states_arr,
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
      states_arr,
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
      if(filters["Tour category"]!=="All") {
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

    // Filter by States
    if (filters["States"]) {
      const statesFilter = filters["States"].split(",");
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
          {travelerType:regex},
          {tripCategories:regex}
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
    //res.json(tours);
    res.render("pages/tourlist", {
      tourPackages: response.tours,
      filterChips: Object.values(response.filters).flat(),
      Searchvalue: req.query.searchValue,
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
    const existingTour = await NewTours.findOne({ name });
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
      return res
        .status(400)
        .json({
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
          const imagePath = `/images/tours/${file.filename}`;
          if (!imageurl) {
            imageurl = imagePath; // First image is main image
          } else {
            bannerimages.push(imagePath); // Additional images are banner images
          }
        }
      });
    }

    if (!imageurl && !tripId) {
      return res
        .status(400)
        .json({
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
      return res
        .status(200)
        .json({
          success: true,
          message: "Trip updated successfully",
          trip: updatedTrip,
        });
    } else {
      // Create new trip
      const newTour = new NewTours(tourData);
      const savedTour = await newTour.save();
      return res
        .status(201)
        .json({
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

//Old trip detial by trip id ::DM after complete development remove this api and manage it's logic
exports.getTourDetails = async (req, res, next) => {

  try {
    // Rename the param so it's compatible with the new method
    req.params.name = req.params.token;

    // Optional: Log this redirection for debugging during development
    console.warn(
      "Deprecated API 'getTourDetails' called. Redirecting to 'getTripDetialbyName'."
    );

    // Forward the request to the new method
    return await exports.getTripDetialbyName(req, res, next);
  } catch (error) {
    console.error(
      "Error in fallback from getTourDetails to getTripDetialbyName:",
      error
    );
    res
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
    res.render("pages/TripDetail", {
      trips: {
        ...tripdetails._doc,
        deptcities: deptCitiesWithImages,
        documentUrl,
        loggedGmailUser,
      },
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
      return res
        .status(400)
        .json({
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
      return res
        .status(404)
        .json({
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

    res.render("pages/bookingTour", {
      tourDetails: existingTrip,
      userData,
      csrfToken: req.csrfToken(),
    });
  } catch (error) {
    console.error("Error in renderBookingTourPage:", error);
    res.status(500).json({ success: false, message: "Server error", error });
  }
};

exports.submitBookingTourPage = async (req, res) => {
  try {
    if (req && req.body) {
      const tourDate = req.body.travelDate.split("to");
      const newBookingDetail = {};
      newBookingDetail.userId = req.user.id;
      newBookingDetail.tripName = req.body.tourDetails.name;
      newBookingDetail.totalPerson = {
        adult: parseInt(req.body.totalPerson.adult),
        child: parseInt(req.body.totalPerson.child),
      };
      newBookingDetail.personDetails = req.body.personDetails;
      newBookingDetail.joiningFrom = req.body.joiningFrom;
      newBookingDetail.bookingStatus = req.body.bookingStatus;
      newBookingDetail.totalTripCost = parseInt(req.body.totalTripCost);
      newBookingDetail.paidAmount = parseInt(req.body.paidAmount);
      newBookingDetail.paymentStatus = req.body.paymentStatus;
      newBookingDetail.tripStartDate = tourDate[0].trim();
      newBookingDetail.tripEndDate = tourDate[1].trim();
      const newTripBookingDetail = new TripBookingDetail(newBookingDetail);
      const savednewTripBookingDetail = await newTripBookingDetail.save();
      return res
        .status(200)
        .json({
          success: true,
          message: "You have successfully booked your trip.",
        });
    }
  } catch (error) {
    console.error("Error in booking:", error);
    res.status(500).json({ success: false, message: "Server error", error });
  }
  console.log(req.body);
};
