const CustomTrip = require('../models/customTripSchema');
const Joi = require("joi");
const fs = require("fs");
const path = require("path");

const nodemailer = require("nodemailer");

exports.getCustomezedTripForm = async (req, res, next) => {
  res.render("pages/CustomToursReq", {
    csrfToken: req.csrfToken(),
  });
};

// Validation schema using Joi
const tripValidationSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  mobile: Joi.string()
    .regex(/^[0-9]{10}$/)
    .required()
    .messages({
      "string.pattern.base": "Mobile number must be a 10-digit number",
    }),
  email: Joi.string().email().required(),
  place: Joi.string().allow("").optional(),
  destination: Joi.string().min(2).required(),
  days: Joi.number().min(0).optional().allow(null),
  persons: Joi.number().min(0).optional().allow(null),
  details: Joi.string().allow("").optional(),
});

// Function to generate email HTML from template
const generateEmailHtml = (data) => {
  // Read the email template
  const templatePath = path.join(__dirname, "tripEmailTemplate.html");
  let html = fs.readFileSync(templatePath, "utf8");

  // Replace placeholders with data
  html = html.replace("{{name}}", data.name || "N/A");
  html = html.replace("{{mobile}}", data.mobile || "N/A");
  html = html.replace("{{email}}", data.email || "N/A");
  html = html.replace("{{destination}}", data.destination || "N/A");

  // Handle optional fields with conditional rendering
  const optionalFields = [
    "place",
    "days",
    "persons",
    "details",
  ];
  optionalFields.forEach((field) => {
    const regex = new RegExp(
      `{{#if ${field}}}[\\s\\S]*?{{${field}}}[\\s\\S]*?{{\\/if}}`,
      "g"
    );
    if (data[field]) {
      html = html.replace(
        regex,
        `<tr><td style="padding: 8px 0; font-weight: bold;">${
          field.charAt(0).toUpperCase() +
          field.slice(1).replace(/([A-Z])/g, " $1")
        }:</td><td style="padding: 8px 0;">${
          field === "budget" ? "₹" + data[field] : data[field]
        }</td></tr>`
      );
    } else {
      html = html.replace(regex, "");
    }
  });

  return html;
};

// Function to send email
const sendEmail = async (tripData) => {
  try {
    const mailOptions = {
      from: "travel@dejavutours.in",
      to:   "dejavuoutdoors@gmail.com", // Admin email (same as sender for now)
      subject: "New Customized Trip Submission",
      html: generateEmailHtml(tripData),
    };

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "travel@dejavutours.in",
        pass:  "pxii eznn bdxg ryas" // "vbkx zspn oodm mjkj",
      },
    });
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
    throw error; // Let the controller handle the error
  }
};

// Controller to handle form submission
exports.customTrip = async (req, res) => {
  try {
    // Validate request body
    const { error } = tripValidationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    // Create new trip document
    const tripData = {
      name: req.body.name,
      mobile: req.body.mobile,
      email: req.body.email,
      place: req.body.place || null,
      destination: req.body.destination,
      days: req.body.days || null,
      persons: req.body.persons || null,
      details: req.body.details || null,
    };

    const trip = new CustomTrip(tripData);
    await trip.save();

    // Send email to admin
    await sendEmail(tripData);

    res.status(201).json({
      success: true,
      message: "Trip details saved successfully",
      data: trip,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error while saving trip details",
      error: error.message,
    });
  }
};

// Get all custom trips
exports.getCustomTrips = async (req, res) => {
  try {
    const customTrips = await CustomTrip.find().sort({ createdAt: -1 }); // Sort by latest
    res.render('pages/admin/customTrip', {
      customTrips,
      csrfToken: req.csrfToken(),
    });
  } catch (error) {
    console.error('Error fetching custom trips:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete custom trip
exports.deleteCustomTrip = async (req, res) => {
  try {
    const { id } = req.params;
    await CustomTrip.findByIdAndDelete(id);
    res.json({ success: true, message: 'Custom trip deleted successfully' });
  } catch (error) {
    console.error('Error deleting custom trip:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Bulk delete custom trips
exports.bulkDeleteCustomTrips = async (req, res) => {
  try {
    const { ids } = req.body;
    await CustomTrip.deleteMany({ _id: { $in: ids } });
    res.json({ success: true, message: 'Selected custom trips deleted successfully' });
  } catch (error) {
    console.error('Error bulk deleting custom trips:', error);
    res.status(500).json({ error: 'Server error' });
  }
};