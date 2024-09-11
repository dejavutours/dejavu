const express = require("express");

const Tours = require("../models/tours");

const Staycost = require("../models/staycost");

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

const fileHelper = require("../util/file");

const PDFDocument = require("pdfkit");

const fs = require("fs");

const nodemailer = require("nodemailer");

const otpGenerator = require("otp-generator");

const AWS = require("aws-sdk");

const jwt = require("jsonwebtoken");

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

exports.getIndexPage = async (req, res, next) => {
  const alltours = await Tours.find().sort({ updatedAt: -1 });
  const allaccomodations = await Accomodations.find().sort({ updatedAt: -1 });
  const tests = await Tours.find().distinct("name");
  res.render("pages/index", {
    Tours: alltours,
    accomodations: allaccomodations,
    test: tests,
    user: req.user,
  });
};

exports.getAddTours = (req, res, next) => {
  var config = require("../json/statecities.json");
  let state_arr = [config];
  let states_arr = [];
  for (var key of state_arr) {
    states_arr = Object.keys(key);
  }
  res.render("pages/Addtours", { message: null, states_arr: states_arr });
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

exports.getTourDetails = async (req, res, next) => {
  try {
    const token = req.params.token;
    const tripdetails = await Tours.find({ name: token });
    const tests = await Tours.find().distinct("name");
    res.render("pages/TripDetails", { trips: tripdetails[0], test: tests });
  } catch (err) {
    console.log(err);
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

// exports.postDeleteUpcomingtrips = async(req, res, next) => {

//   const tripid = req.body.tripid;

//   upcomingtrips.findByIdAndRemove(tripid, (err) => {
//     if(err){
//         console.log(err);
//     } else {
//       res.redirect("/");
//     }
//  });

// };

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
    const token = req.params.token;
    const alltours = await Tours.find({ state: token });
    const tests = await Tours.find().distinct("name");
    res.render("pages/StateFilter", { Tours: alltours, test: tests });
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

exports.getmytrips = async (req, res, next) => {
  // console.log('1272', req.user);

  let mytrips;
  if (res.locals.accessToken) {
    mytrips = await PaymentDetail.find({
      contact: Number(
        req.verifiedPhoneNumber.length === 12
          ? req.verifiedPhoneNumber.toString().slice(2)
          : req.verifiedPhoneNumber
      ),
      status: "paid",
    });
  } else {
    mytrips = await PaymentDetail.find({
      email: req.user.email,
      status: "paid",
    });
  }

  // console.log(mytrips);
  // console.log(mytrips.length);
  const tests = await Tours.find().distinct("name");
  res.render("pages/mytrips", { test: tests, mytrips: mytrips });
  // console.log(tests);
};

exports.getprofile = async (req, res, next) => {
  // console.log('1272', req.user);
  // console.log(mytrips);
  // console.log(mytrips.length);
  const tests = await Tours.find().distinct("name");
  res.render("pages/profile", { test: tests });
  // console.log(tests);
};

exports.getotp = async (req, res, next) => {
  const otp = otpGenerator.generate(4, {
    upperCaseAlphabets: false,
    specialChars: false,
    lowerCaseAlphabets: false,
    digits: true,
  });
  console.log(otp);
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
    // console.log("OTP sent successfully:", data.MessageId);
    // res.render('verifyOTP', { phoneNumber: req.body.phone, otpSent: true });
    return res.send(true); // Return OTP in case you need to verify it later
  } catch (err) {
    console.error("Error sending OTP:", err);
    return res.send(false);
    throw err;
  }
};

exports.verifyotp = async (req, res, next) => {
  const { phone2, otp } = req.body;
  try {
    const user = await Mobileuser.findOne({ phoneNumber: "91" + phone2 });
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
