const jwt = require('jsonwebtoken');
const { ensureLoggedIn } = require('connect-ensure-login');

module.exports = (req, res, next) => {
  const accessToken = res.locals.accessToken || req.cookies.accessToken;

  // Try mobile login (JWT-based)
  if (accessToken) {
    return new Promise((resolve, reject) => {
      jwt.verify(accessToken, process.env.JWT_TOKEN, (err, verifiedPhoneNumber) => {
        if (err) {
          console.error('JWT verification failed:', err.message);
          return reject(err);
        }
        req.verifiedPhoneNumber = verifiedPhoneNumber;
        resolve();
      });
    })
      .then(() => next())
      .catch(() => res.redirect('/login'));
  }

  // Try Google login (session-based)
  return ensureLoggedIn()(req, res, () => {
    if (req.user) {
      return next();
    }
    // Neither authenticated
    return res.redirect('/login');
  });
};