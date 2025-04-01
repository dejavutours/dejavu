const path = require('path');
const dotenv = require('dotenv');

// Determine the environment
const envFile =
  process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
// Load the appropriate .env file
dotenv.config({ path: path.resolve(__dirname, envFile) });
console.log(`Loaded environment variables from ${envFile}`);

// if(process.env.NODE_ENV !== 'production'){
// 	require('dotenv').config()// }
const express = require('express');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');
const helmet = require('helmet');
const compression = require('compression');
const fs = require('fs');
const { uploadFile } = require('./s3');
const { uploadFileProof } = require('./s3');

const PORT = process.env.PORT || 5000;

const Tours = require('./models/tours');
const User = require('./models/user');
const isProduction = process.env.NODE_ENV === 'production';

const MONGODB_URI = isProduction
  ? `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.ogxnm.mongodb.net/${process.env.MONGO_DB}?retryWrites=true&w=majority`
  : `mongodb://${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_DB}`;

const app = express();
const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: 'sessions',
});
const csrfProtection = csrf();

// Updated Multer Storage Configuration
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (req.url === '/booktrip') {
      cb(null, 'images/proofs');
    } else if (req.url === '/admin/addblog' || req.url === '/admin/addEditedblog') {
      cb(null, 'images/blog');
    } else if (
      req.url === '/admin/postNewAddTours' ||
      req.url === '/admin/updateImageUrl' ||
      req.url === '/admin/updateBannerImages'
    ) {
      cb(null, 'images/tours');
    } else if (req.url === '/cities') {
      // Store all city images in a common folder
      const uploadPath = path.join('images', 'cities');
      // Create the cities folder if it doesn't exist
      fs.mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } else {
      cb(null, 'images'); // Default folder for other routes
    }
  },
  filename: (req, file, cb) => {
    if (
      req.url === '/booktrip' ||
      req.url === '/admin/addblog' ||
      req.url === '/admin/addEditedblog'
    ) {
      // Keep existing behavior for these routes
      cb(
        null,
        new Date().toISOString().replace(/:/g, '-') + '-' + file.originalname
      );
    } else if (
      req.url === '/admin/postNewAddTours' ||
      req.url === '/admin/updateImageUrl' ||
      req.url === '/admin/updateBannerImages' ||
      req.url === '/cities' // Use DateTime for city images
    ) {
      // Add timestamp for tour-related routes
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      cb(null, `${timestamp}-${file.originalname}`);
    } else {
      // Keep original filename for other routes
      cb(null, file.originalname);
    }
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

app.set('view engine', 'ejs');
app.set('views', 'views');

const tourRoutes = require('./routes/tours');
const profileRoutes = require('./routes/profileRoutes');
const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payments');
const cityRoutes = require('./routes/cityRoutes');

app.use(compression());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// Use multer with the updated storage configuration
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).array('image', 12)
);

app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images'))); // Serves images/cities as well

app.use(
  session({
    secret: 'my secret',
    resave: false,
    saveUninitialized: false,
    store: store,
  })
);
app.use(csrfProtection);
app.use(passport.authenticate('session'));
app.use((req, res, next) => {
  var msgs = req.session.messages || [];
  res.locals.messages = msgs;
  res.locals.hasMessages = !!msgs.length;
  req.session.messages = [];
  next();
});

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  res.locals.accessToken = req.cookies.accessToken || null;
  res.locals.profile = req.user || null;
  if (req.files !== undefined) {
    req.file = req.files[0];
  }
  next();
});

app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then((user) => {
      if (!user) {
        return next();
      }
      req.user = user;
      next();
    })
    .catch((err) => {
      console.log(err);
    });
});

app.use(tourRoutes);
app.use(profileRoutes);
app.use(authRoutes);
app.use('/payment', paymentRoutes);
app.use(cityRoutes);

mongoose
  .connect(MONGODB_URI, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useFindAndModify: false,
  })
  .then((result) => {
    console.log('connected to DB at port 5000');
    app.listen(PORT);
  })
  .catch((err) => {
    console.log(err);
  });