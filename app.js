const path = require("path");
if(process.env.NODE_ENV !== 'production'){
	require('dotenv').config()
}
const express = require("express");
const cookieParser = require('cookie-parser');
const passport = require('passport');
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const csrf = require("csurf");
const flash = require("connect-flash");
const multer = require("multer");
const helmet = require("helmet");
const compression = require("compression");
const { uploadFile } = require("./s3");
const { uploadFileProof } = require("./s3");
const PORT = process.env.PORT || 5000;

const Tours = require("./models/tours");
const User = require('./models/user');

const MONGODB_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.ogxnm.mongodb.net/${process.env.MONGO_DB}?retryWrites=true&w=majority`;
const app = express(); 
const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: 'sessions'
});
const csrfProtection = csrf();

  const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      if(req.url == "/booktrip"){
        cb(null, "images/proofs");
      }else if (req.url == "/admin/addblog") {
        cb(null, "images/blog");
      }
      else if (req.url == "/admin/addEditedblog") {
        cb(null, "images/blog");
      }
      else{
        cb(null, "images");
      }  
    },
    filename: (req, file, cb) => {
      if (req.url == "/booktrip"){
        cb(
          null,
          new Date().toISOString().replace(/:/g, "-") + '-' + file.originalname
        );
      }else if (req.url == "/admin/addblog") {
        cb(
          null,
          new Date().toISOString().replace(/:/g, "-") + '-' + file.originalname
        );
      }
      else if (req.url == "/admin/addEditedblog") {
        cb(
          null,
          new Date().toISOString().replace(/:/g, "-") + '-' + file.originalname
        );
      }  
      else{
        cb(
          null,
          file.originalname
        );
      }
    },
  });

  const fileFilter = (req, file, cb) => {
    if (
      file.mimetype === "image/png" ||
      file.mimetype === "image/jpg" ||
      file.mimetype === "image/jpeg"
    ) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  };

  app.set("view engine", "ejs");
  app.set("views", "views");

  const tourRoutes = require("./routes/tours");
  const authRoutes = require("./routes/auth");
  const paymentRoutes = require("./routes/payments");

  //app.use(helmet());
  app.use(compression());
  app.use(express.json());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(cookieParser());
  //app.use(bodyParser.json());

// app.use(multer({ storage: fileStorage, fileFilter: fileFilter }).single("image"));
  app.use(multer({ storage: fileStorage , fileFilter: fileFilter}).array("image",12));

  // app.use(async(req, res, next) => {
  //   if(!req.file){
  //     return next();
  //   }else{
  //     if(req.url != '/booktrip') {
  //       const result = await uploadFile(req.file);
  //       return next();
  //      }else{
  //       const result = await uploadFileProof(req.file);
  //       return next();
  //      }
  //   }
  
  // });

app.use(express.static(path.join(__dirname, "public")));
app.use("/images", express.static(path.join(__dirname, "images")));

app.use(
  session({
    secret: 'my secret',
    resave: false,
    saveUninitialized: false,
    store: store
  })
);
app.use(csrfProtection);
app.use(passport.authenticate('session'));
app.use((req, res, next) => {
  var msgs = req.session.messages || [];
  res.locals.messages = msgs;
  res.locals.hasMessages = !! msgs.length;
  req.session.messages = [];
  next();
});

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  res.locals.accessToken = req.cookies.accessToken || null;
  res.locals.profile = req.user || null;
  if(req.files !== undefined){
    req.file = req.files[0];
  }
  //console.log(res.locals.csrfToken);
  next();
});

app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then(user => {
      if (!user) {
        return next();
      }
      req.user = user;
      next();
    })
    .catch(err => {
      console.log(err);
    });
});

app.use(tourRoutes);
app.use(authRoutes);
app.use('/payment', paymentRoutes);

mongoose
  .connect(MONGODB_URI, { useUnifiedTopology: true, useNewUrlParser: true, useFindAndModify: false })
  .then((result) => {
    console.log("connected to DB at port 5000");
    app.listen(PORT);
  })
  .catch((err) => {
    console.log(err);
  });
