const jwt = require('jsonwebtoken');

module.exports = (accessToken) => {
  // Get the token from the Authorization header
  // const token = res.locals.accessToken;
//   const authHeader = req.headers['authorization'];
//   const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (accessToken == null) return res.sendStatus(401); // If there's no token, respond with 401

  jwt.verify(accessToken, process.env.JWT_TOKEN, (err, verifiedPhoneNumber) => {
    console.log(err, req.verifiedPhoneNumber);
    if (err) return res.sendStatus(403); // If token is invalid, respond with 403
    req.verifiedPhoneNumber = verifiedPhoneNumber; // Add the user to the request object
    next(); // Proceed to the next middleware or route handler
  });
    next();
}

