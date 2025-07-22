const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const MongoDBStore = require('connect-mongodb-session')(session);
const passport = require('passport');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const helmet = require('helmet');
const csrf = require('csurf');
const multer = require('multer');
const dotenv = require('dotenv');

// Determine and load correct .env
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.resolve(__dirname, envFile) });
console.log(`✅ Loaded environment variables from ${envFile}`);

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV !== 'production';

const User = require('./models/user');

// MongoDB connection URI
const MONGODB_URI = isProduction
  ? `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.ogxnm.mongodb.net/${process.env.MONGO_DB}?retryWrites=true&w=majority`
  : `mongodb://${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_DB}`;

// Session store
const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: 'sessions',
});

const csrfProtection = csrf();

// File upload config
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['image/png', 'image/jpg', 'image/jpeg', 'application/pdf'];

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'images';

    if (req.url === '/booktrip') {
      uploadPath = 'images/proofs';
    } else if (['/admin/addblog', '/admin/addEditedblog'].includes(req.url)) {
      uploadPath = 'images/blog';
    } else if (
      ['/admin/postNewAddTours', '/admin/updateImageUrl', '/admin/updateBannerImages'].includes(req.url)
    ) {
      if (file.mimetype === 'application/pdf') {
        uploadPath = 'documents/tours';
      } else {
        uploadPath = 'images/tours';
      }
    } else if (req.url === '/cities') {
      uploadPath = 'images/cities';
    } else if (req.url === '/states') {
      uploadPath = 'images/states';
    } else if (req.url === '/categories') {
      uploadPath = 'images/categories';
    } else if (req.url === '/banner') {
      uploadPath = 'images/banners';
    }

    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    cb(null, `${timestamp}-${file.originalname}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('❌ Invalid file type. Only PNG, JPG, JPEG, and PDF are allowed.'), false);
  }
};

app.use(
  multer({
    storage: fileStorage,
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE },
  }).array('image', 12)
);

// View engine setup
app.set('view engine', 'ejs');
app.set('views', 'views');

// Core middleware
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// app.use(helmet());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/documents', express.static(path.join(__dirname, 'documents')));

// Session and CSRF
app.use(
  session({
    secret: 'my secret', // Change this to a secure .env-based secret
    resave: false,
    saveUninitialized: false,
    store,
  })
);

app.use(csrfProtection);
app.use(passport.authenticate('session'));

// Custom locals for views
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  res.locals.accessToken = req.cookies.accessToken || null;
  res.locals.profile = req.user || null;
  res.locals.isAuthenticated = req.session.isLoggedIn || false;

  const msgs = req.session.messages || [];
  res.locals.messages = msgs;
  res.locals.hasMessages = !!msgs.length;
  req.session.messages = [];

  if (req.files !== undefined) {
    req.file = req.files[0]; // backward compatibility
  }

  next();
});

// Load logged-in user
app.use(async (req, res, next) => {
  if (!req.session.user) return next();

  try {
    const user = await User.findById(req.session.user._id);
    if (user) req.user = user;
  } catch (err) {
    console.error(err);
  }

  next();
});

// Routes
app.use(require('./routes/tours'));
app.use(require('./routes/profileRoutes'));
app.use(require('./routes/auth'));
app.use('/payment', require('./routes/payments'));
app.use(require('./routes/cityRoutes'));
app.use('/admin', require('./routes/admin'));
app.use(require('./routes/stateRoutes'));
app.use(require('./routes/categoryRoutes'));
app.use(require('./routes/bannerRoutes'));
app.use(require('./routes/customTripRoutes'));
app.use(require('./routes/tripRoutes'));
app.use(require('./routes/quickCallRoutes'));

// DB Connection
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log(`✅ Connected to MongoDB`);
    app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('❌ Failed to connect to MongoDB:', err);
  });
