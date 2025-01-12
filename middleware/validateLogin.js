const jwt = require('jsonwebtoken');
const { ensureLoggedIn } = require('connect-ensure-login');

// FYI: same function available at tours controller also.
// Middleware to validate JWT token or fallback to session-based authentication
const ensureMultipleLogin = (req, res, next) => {
  const { accessToken } = res.locals;

  if (accessToken) {
    jwt.verify(accessToken, process.env.JWT_TOKEN, (err, decodedToken) => {
      if (err) {
        console.error('JWT verification failed:', err.message);
        return res.status(403).json({ message: 'Invalid or expired token' });
      }

      // Attach decoded phone number or other details to the request object
      req.verifiedPhoneNumber = decodedToken;
      return next(); // Proceed to the next middleware or route handler
    });
  } else {
    // Fallback to session-based authentication if no accessToken is provided
    ensureLoggedIn()(req, res, next);
  }
};

module.exports = ensureMultipleLogin;
