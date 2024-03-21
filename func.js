const jwt = require("jsonwebtoken");
const constant = require("./constant")

// ___________________ AUTH __________________
// Middleware for verifying the JWT token
const authenticateToken = (req, res, next) => {
    // Retrieve the token from the request header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN_STRING and COCKIE :()

    const isApiRequest = req.headers['accept'] !== 'text/html' || req.headers['x-api-request'] === 'true';

    if (token == null) {
      if (!isApiRequest) {
        console.log("TOKEN NULL");
        return res.redirect('/login');
      } else {
         res.sendStatus(401);
         return;
      }
    }
  
    jwt.verify(token, constant.JWT_SECRET, (err, user) => {
      if (err) {

        // CHECKS IF IT IS A USER REQUEST (REDIRECT)
        if (!isApiRequest) {
          console.log("Reidirected to /login");
          return res.redirect('/login');
        } else {
          res.sendStatus(403); // Use 403 for invalid tokens
          return;
        }
  }
  
      req.user = user; // Add the decoded user payload to the request object
      next(); // Proceed to the next middleware or request handler
    });
  }


const findCameraFromCache = (table, parameter, value) => {
  for (const camera of table){
    if (camera[parameter] == value){
      return camera;
    }
  }
  return null;
}


module.exports = {authenticateToken, findCameraFromCache};