const express = require("express");
const cors = require('cors');



const JWT_SECRET =  "WFqcZcrygnsnA2xxYSkpDT9JbQPvkXKBPXSYkA9Tugh624dtzNBQu7GV273TVKjsoiZxfEUDYzsDYeJxREHhogDN4LRL8mcc7n5kN23K8WUr5R7NHzGKDYvFH7euFbJv"
const SERTIFICATES_PATH = {"key": "./sertificates/privkey.pem", "cert": "./sertificates/fullchain.pem"};


// _______________________ API _______________________

const API = {
    "port": 8443,
    "cacheTimer": 1 * 1000, // HOW OFTEN THE API WILL LOOK FOR NEW LIVESTREAMS
    "sendDataTimer": 1 * 1000, // HOW OFTEN THE DB WILL WRITE DATA GOTTEN TO THE DB

    LIMITER : {
    "windowMs": 2 * 60 * 1000, // FOR EATCH 2 MINUTES
    "max": 50 // LIMIT EATCH IP TO 50 REQUESTS per windowMs
    }


}

const SERVER = {
    "port": 3000
}





// _____________________ WEBSTIE _____________________

const MIN_USERNAME_LENGTH = 5;
const MIN_PASSWORD_LENGTH = 5;

const HOST = {
    "port": 443,
    "HTML_PARENT_FOLDER": "/html",
    "userUpdateCacheTimer": 1000,
    "timeoutTime": "1h", // WHEN THE USER WILL BE AUTOMATICALLY TIMED OUT

}




module.exports = {SERTIFICATES_PATH, API, SERVER, HOST, JWT_SECRET};