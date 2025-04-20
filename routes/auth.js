var express = require('express');
var passport = require('passport');
var GoogleStrategy = require('passport-google-oidc');
const gmailuser = require("../models/gmailuser");
const jwt = require('jsonwebtoken');
// var db = require('../db');


// Configure the Google strategy for use by Passport.
//
// OAuth 2.0-based strategies require a `verify` function which receives the
// credential (`accessToken`) for accessing the Facebook API on the user's
// behalf, along with the user's profile.  The function must invoke `cb`
// with a user object, which will be set at `req.user` in route handlers after
// authentication.
passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: process.env.CALL_BACK_URL,
  scope: [ 'profile', 'email' ]
}, async function verify(issuer, profile, cb) {
  var user = {
    id: profile.id,
    name: profile.displayName,
    email: profile.emails[0].value,
  };
  const filter = { email: user.email };

const doc = await gmailuser.findOneAndUpdate(filter, user, {
  new: true,
  upsert: true // Make this update into an upsert
});
  return cb(null, user);
}));
  
// Configure Passport authenticated session persistence.
//
// In order to restore authentication state across HTTP requests, Passport needs
// to serialize users into and deserialize users out of the session.  In a
// production-quality application, this would typically be as simple as
// supplying the user ID when serializing, and querying the user record by ID
// from the database when deserializing.  However, due to the fact that this
// example does not have a database, the complete Facebook profile is serialized
// and deserialized.
passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    console.log(user);
    cb(null, { id: user.id, name: user.name, email: user.email });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});


var router = express.Router();

/* GET /login
 *
 * This route prompts the user to log in.
 *
 * The 'login' view renders an HTML page, which contain a button prompting the
 * user to sign in with Google.  When the user clicks this button, a request
 * will be sent to the `GET /login/federated/accounts.google.com` route.
 */
// router.get('/login', function(req, res, next) {
//   res.render('login');
// });

/* GET /login/federated/accounts.google.com
 *
 * This route redirects the user to Google, where they will authenticate.
 *
 * Signing in with Google is implemented using OAuth 2.0.  This route initiates
 * an OAuth 2.0 flow by redirecting the user to Google's identity server at
 * 'https://accounts.google.com'.  Once there, Google will authenticate the user
 * and obtain their consent to release identity information to this app.
 *
 * Once Google has completed their interaction with the user, the user will be
 * redirected back to the app at `GET /oauth2/redirect/accounts.google.com`.
 */
router.get('/login/federated/google', passport.authenticate('google'));

/*
    This route completes the authentication sequence when Google redirects the
    user back to the application.  When a new user signs in, a user account is
    automatically created and their Google account is linked.  When an existing
    user returns, they are signed in to their linked account.
*/
router.get('/oauth2/redirect/google', passport.authenticate('google', {
  successReturnToOrRedirect: '/',
  failureRedirect: '/'
}));

/* POST /logout
 *
 * This route logs the user out.
 */
// Logout route
router.post("/logout", (req, res) => {
  try {
      // Clear Express session (for Google login)
      if (req.session) {
          req.session.destroy((err) => {
              if (err) {
                  console.error("Session destruction error:", err);
                  return res.status(500).json({ error: "Failed to log out" });
              }
          });
      }

      // Clear accessToken cookie
      res.clearCookie("accessToken", {
          path: "/",
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production"
      });

      // Clear session cookie (e.g., connect.sid)
      res.clearCookie("connect.sid", {
          path: "/",
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production"
      });

      // Optionally: Invalidate JWT by storing in a blacklist (if needed)
      // Example: Add to a Redis or database blacklist
      // const token = req.cookies.accessToken;
      // if (token) {
      //     blacklistToken(token); // Implement as needed
      // }

      res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ error: "Server error during logout" });
  }
})

// router.get("/check-auth", (req, res) => {
//   try {
//     // Check JWT-based authentication (mobile login)
//     const accessToken = req.cookies.accessToken;
//     if (accessToken) {
//       jwt.verify(accessToken, process.env.JWT_TOKEN, (err, verifiedPhoneNumber) => {
//         if (!err) {
//           return res.status(200).json({ authenticated: true, type: 'mobile' });
//         }
//         // If token is invalid, clear the cookie
//         res.clearCookie("accessToken", {
//           path: "/",
//           sameSite: "lax",
//           secure: process.env.NODE_ENV === "production"
//         });
//       });
//     }

//     // Check session-based authentication (Google login)
//     if (req.user) {
//       return res.status(200).json({ authenticated: true, type: 'google' });
//     }

//     // Not authenticated
//     res.status(401).json({ authenticated: false });
//   } catch (error) {
//     console.error("Error in check-auth:", error);
//     res.status(500).json({ authenticated: false, error: "Server error" });
//   }
// });

module.exports = router;
