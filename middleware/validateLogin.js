const jwt = require('jsonwebtoken');
const { promisify } = require('util');

const verifyAsync = promisify(jwt.verify);

module.exports = async (req, res, next) => {
  try {
    // Log request details for debugging
    console.log('validateLogin: Session:', req.session);
    console.log('validateLogin: Cookies:', req.cookies);

    // Check session-based authentication (Google login)
    if (req.user) {
      console.log('Authenticated via session (Google login)', req.user);
      return next();
    } else {
      console.log('No session user found');
    }

    // Validate JWT_TOKEN environment variable
    if (!process.env.JWT_TOKEN) {
      console.error('JWT_TOKEN environment variable is not set');
      return res.redirect('/login');
    }

    // Check JWT-based authentication (mobile login)
    const accessToken = req.cookies.accessToken;
    if (accessToken) {
      console.log('Verifying JWT:', accessToken);
      try {
        const verifiedPhoneNumber = await verifyAsync(accessToken, process.env.JWT_TOKEN);
        req.verifiedPhoneNumber = verifiedPhoneNumber;
        console.log('Authenticated via JWT (mobile login)', verifiedPhoneNumber);
        return next();
      } catch (err) {
        console.error('JWT verification failed:', err.message);
        res.clearCookie('accessToken', {
          path: '/',
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
        });
      }
    } else {
      console.log('No accessToken cookie found');
    }

    // Redirect to login if not authenticated
    console.log('No valid authentication found, redirecting to /login');
    return res.redirect('/login');
  } catch (error) {
    console.error('Unexpected error in validateLogin:', error.message);
    return res.redirect('/login');
  }
};