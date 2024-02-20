const rateLimit = require('express-rate-limit');
const sqlite3 = require("sqlite3").verbose();
const jwt = require("jsonwebtoken");
const express = require('express');
const helmet = require('helmet');
const https = require('https');
const cors = require('cors');
const fs = require('fs');

const constant = require("../constant");
const { PassThrough } = require('stream');


let livestreamCache = {}; // CACHES THE OUTPUT OF THE WHO IS LIVE API
let dataToBeSent = [];

const app = express();
app.use(express.json());
app.use(cors());


const limiter = rateLimit({
  windowMs: constant.API.LIMITER.windowMs, // FOR EATCH 2 MINUTES
  max: constant.API.LIMITER.max, // LIMIT EATCH IP TO 50 REQUESTS per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});


// DB
const db = new sqlite3.Database("./instance/auth.db", sqlite3.OPEN_READWRITE, // CONNECTS TO THE DB
    (err) => {if (err) return console.error(err.message)} 
);
db.run("PRAGMA foreign_keys = ON");



//_______________ AUTHENTICATION ______________
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  if (token == null) return res.sendStatus(401); // if there's no token

  jwt.verify(token, constant.JWT_SECRET, (err, user) => {
      if (err) return res.sendStatus(403); // if the token is invalid or expired
      req.user = user;
      next();
  });
};

//_________________ API CACHE _________________

const updateCache = () => {
  sql = "SELECT * FROM camera_connections"; 
  db.all(sql, [], 
      (err, rows) => {if (err) return console.error(err.message)
      livestreamCache = rows;
  });
}

updateCache();
setInterval(updateCache, constant.API.cacheTimer);


//___________________ APIS ____________________


// --- user api
app.get('/api/livestreams', limiter, (req, res) => {

  liveLivestreams = []

  // REMOVES KEYS AND LIVESTREAMS THAT ARE NOT LIVE
  for(let row of livestreamCache){
    if (row["is_connected"] == 1){
      if ("key" in row){
        delete row["key"];
      } else {
        console.error("\n ROW FROM AUTH.DB DIDNT HAVE KEY:", row)
      }
      liveLivestreams.push(row)
    }


  }
  //console.log(liveLivestreams);
  res.json(liveLivestreams); // Use res.json() to send the livestreamCache as a JSON response
});


// --- Rpi Sending data

const checkCreds = (username, key, camera_connections) => {
  for (let row of camera_connections){
    if (row["key"] == key && row["username"] == username){
      return [true, row["id"]];
    }
  }
  return false;
}

const sendData = () => {
  for (dataArr of dataToBeSent){
    const id = dataArr.shift(); // THE FIRST ITEM IN THE DATA ARRAY IS ALWAYS THE FORGIEN ID OF camera_connection
  

    for (let data of dataArr){ // LOOPS MAXIMUM 2 TIMES: rpiStats, sensData 
      const key = Object.keys(data); // GETS THE KEY
      
      
      if (key == "rpiStats"){
        data["rpiStats"].unshift(id) // ADDS THE FORGIEN KEY TO camera_connections TO THE START OF THE DATA
        sql = `INSERT INTO rpi_stats(
                rpi_con_id, 
                cpu_usage, 
                cpu_temp, 
                mem_usage, 
                network_usage, 
                psu_watts, 
                uptime,
                date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

        db.run(sql, data["rpiStats"],  // INSERTS DATA INTO THE DB
            (err) => {if (err) return console.error(err.message)}
        );



      } 
      
      
      if (key == "sensData"){

        for ([sensorName, sensorValue] of Object.entries(data["sensData"])){ 
          sql = "INSERT INTO sensors(rpi_con_id, sens_name, sens_value, date) VALUES (?, ?, ?, ?)";
          db.run(sql, [id, sensorName, sensorValue, getDate(1)], (err) => {
            if (err) {
                // Check if the error is a FOREIGN KEY constraint error
                if (err.message.includes('FOREIGN KEY constraint failed')) {
                    // Optionally log it as a debug message or ignore it
                    
                    //console.debug("Foreign key constraint failed for rpi_con_id:", id, "Error:", err.message);
                } else {
                    // Handle other errors normally
                    console.error(err.message);
                }
            }
        });
        }
      } 
    }
  }
}
setInterval(sendData, constant.API.sendDataTimer)

const getDate = (offsetHrs) => {
  const currentTime = new Date();
  
  // Padding function to ensure single digits are preceded by a 0
  const pad = (num) => num.toString().padStart(2, '0');
  
  const year = currentTime.getFullYear();
  // Adding 1 because getMonth() returns month from 0-11
  const month = pad(currentTime.getMonth() + 1);
  const date = pad(currentTime.getDate());
  const hour = pad(currentTime.getHours() +offsetHrs); // +1 TO GET NORWEGIAN TIME
  const minute = pad(currentTime.getMinutes());
  const second = pad(currentTime.getSeconds());
  
  // Constructing the format: year-month-date_hour:minute:second
  const formattedTime = `${year}-${month}-${date}_${hour}:${minute}:${second}`;
  
  return formattedTime;
}

app.post("/api/rpidata", (req, res) => {

  try {
    const keyVal = req.body["key"].split("?key=");
    username = keyVal[0];
    const key = keyVal[1];

    const auth = checkCreds(username, key, livestreamCache);
    if (auth != false){
      let data = [auth[1]] // auth[1] = camera_connection id

      if ("rpiStats" in req.body){
        req.body["rpiStats"].push(getDate(1)); // ADDS THE DATE TO THE DATA
        data.push({"rpiStats": req.body["rpiStats"]}); // ADDS THE RPI STATS TO THE DATA ARRAY
      }
      if ("sensData" in req.body){
        data.push({"sensData": req.body["sensData"]}); // ADDS THE SENS DATA TO THE DATA ARRAY
      }

      // DATA SHULD LOOK SOMETHING LIKE THIS = [camera_conId, {rpiStats: [arry of rpi stats]} (optional),  {sensData: {tempSens1: tempval1, sens2: sensval2}} (optional)]
      dataToBeSent.push(data); // ADDS THE DATA TO BE SENT ARRAY, REDY TO BE PUSHED TO DB

      //console.log(JSON.stringify(dataToBeSent, null, 2));
      return res.send(200);
    } else {
      return res.send(401);
    }
  } catch (error) {
    res.send(500);
  }
})





const options = {
  key: fs.readFileSync(constant.SERTIFICATES_PATH.key),
  cert: fs.readFileSync(constant.SERTIFICATES_PATH.cert)
};

const server = https.createServer(options, app);
server.listen(constant.API.port, () => {
  console.log('User Api listening on port', constant.API.port);
});


