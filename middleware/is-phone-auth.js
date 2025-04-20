const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const accessToken = res.locals.accessToken || req.cookies.accessToken;

  if (!accessToken) {
    return res.redirect('/login');
  }

  jwt.verify(accessToken, process.env.JWT_TOKEN, (err, verifiedPhoneNumber) => {
    if (err) {
      console.error('JWT verification failed:', err.message);
      return res.redirect('/login');
    }
    req.verifiedPhoneNumber = verifiedPhoneNumber;
    next();
  });
};

