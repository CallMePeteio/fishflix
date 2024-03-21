


const express = require('express');
const https = require('https');
const cors = require('cors');
const fs = require("fs");


const app = express();
app.use(express.json());
app.use(cors());

const constant = require("../../constant");




const options = {
    key: fs.readFileSync(constant.SERTIFICATES_PATH.key),
    cert: fs.readFileSync(constant.SERTIFICATES_PATH.cert)
  };
  
  const server = https.createServer(options, app);
  server.listen(constant.API.port, () => {
    console.log('Api listening on port', constant.API.port);
  });








// EXPORTS THE APP, AND CALLS CONSTRUCTOR FILES
module.exports = { app };
require("./api.js");
require("./threeWayHandshake.js");
  