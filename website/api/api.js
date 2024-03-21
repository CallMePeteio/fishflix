const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");

const constant = require("../../constant");
const func = require("../../func");
const { app } = require('./server'); 

let livestreamCacheInit = {};
let livestreamCache = {}; // CACHES THE OUTPUT OF THE WHO IS LIVE API
let dataToBeSent = [];


// DB
const db = new sqlite3.Database("./instance/auth.db", sqlite3.OPEN_READWRITE, // CONNECTS TO THE DB
    (err) => {if (err) return console.error(err.message)} 
);
db.run("PRAGMA foreign_keys = ON");




//_________________ API CACHE _________________

const updateCache = async () => {
  sql = "SELECT * FROM camera_credentials"; 
  db.all(sql, [], 
      (err, rows) => {if (err) return console.error(err.message)
      livestreamCache = rows;
  });

}

updateCache();
setInterval(updateCache, constant.API.cacheTimer);


//___________________ APIS ____________________


// --- Rpi Sending data
const checkCreds = (username, key, camera_credentials) => {
  for (let row of camera_credentials){
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
        data["rpiStats"].unshift(id) // ADDS THE FORGIEN KEY TO camera_credentials TO THE START OF THE DATA
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

const updateHasRecivedConf = (livestreamCache, id) => {
  const camera = func.findCameraFromCache(livestreamCache, "id", id);
  
  if (camera["has_retrived_conf"] == 0){
    sql = "UPDATE camera_credentials SET has_retrived_conf = ? WHERE id = ?";
    db.run(sql, [1, id], 
        (err) => {if (err){ console.error(err.message)}
    });
  }
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
      updateHasRecivedConf(livestreamCache, data[0]);
  

      return res.sendStatus(200);
    } else {
      return res.sendStatus(401);
    }
  } catch (error) {
    console.error("There was a critical error reciving rpi data:", error);
    res.sendStatus(500);
  }
})







// --- GET ALL CAMERAS
app.get("/api/getRpi", func.authenticateToken, (req, res) => {
  try{
    // REMOVES THE KEY FROM THE RESPONSE
    liveStreamsWithOutKey = [];
    for (const livestreamDict of livestreamCache){
      let liveStreamDictTemp = {}
      for ([key, val] of Object.entries(livestreamDict)){
        if (key != "key" && key != "config_file_name" && key != "conf_key"){
          liveStreamDictTemp[key] = val;
        }
      }
      liveStreamsWithOutKey.push(liveStreamDictTemp);
    } 
    res.status(200).json(liveStreamsWithOutKey);
  }catch (error){
    res.status(500).send("Internal Server Error")
  }
});




// --- DELETE CAMERA BY ID
app.post("/api/getRpi", func.authenticateToken, (req, res) => {
  try{

    deleteId = req.body.id;

    // REMOVES CONFIG FILE
    let configName;
    sql = `SELECT * FROM camera_credentials WHERE id=?`; 
    db.all(sql, [deleteId], 
        (err, rows) => {if (err) return console.error(err.message)
        if (rows[0] != undefined){
          configName = rows[0]["config_file_name"];

          const removeFilePath = constant.HOST["configPath"] + "/" + configName;
          if (fs.existsSync(removeFilePath)){
            fs.unlinkSync(removeFilePath, (error) => {
              if (error) console.error("There was an error deleting the file", error);
            });
          }
        } else {
          res.status(500).send("Internal Server Error");
        }
    });
 

    const sqlCommands = [`DELETE FROM rpi_stats WHERE rpi_con_id=?`,`DELETE FROM sensors WHERE rpi_con_id=?`, `DELETE FROM camera_credentials WHERE id=?`];
    for (const sql of sqlCommands){
      db.run(sql, [deleteId], 
          (err) => {if (err) {
            console.error("There was an error deleting camera", err) 
            res.status(501).send("Internal Server Error");
            return;
          }
      });
    }

    updateCache();
    res.status(200);
  }catch (error){
    console.error("There was an internal server error while deleting rpi ", error);
    res.status(500).send("Internal Server Error");
  }
});





