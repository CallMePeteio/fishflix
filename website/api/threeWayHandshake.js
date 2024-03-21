
const sqlite3 = require("sqlite3");
const fsPromise = require("fs").promises;
const fs = require("fs");

const constant = require("../../constant");
const func = require("../../func");
const { app } = require('./server'); 


let livestreamCache = {};

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




async function updateDb(id, wanIp, localIp){

  sql = "UPDATE camera_credentials SET has_retrived_conf = ?, last_known_local_ip=?, last_known_wan_ip=? WHERE id = ?";
  db.run(sql, [1, localIp, wanIp, id], 
      (err) => {if (err) return console.error(err.message)
  });

  updateCache();
  return true;
}

async function getJsonData(path) {
  if (fs.existsSync(path)) {
    try {
      const json = await fsPromise.readFile(path);
      const jsonObj = JSON.parse(json.toString());
      return jsonObj; // Properly return the parsed JSON object
    } catch (error) {
      console.error('Error reading or parsing the file:', error);
      return null; // Return null or throw the error depending on your error handling strategy
    }
  } else {
    console.error("There was a trouble to find the json file requested! (threeWayHandshake)");
    return null;
  }
}


app.post('/api/threewayhandshake/wakeup', async (req, res) => {
  try {

      let returnConf = false;
      let configName = "";
      const key = req.body["key"]
      const mac = req.body["mac"];
      const wanIp = req.body["wanIp"];
      const localIp = req.body["localIp"];

      for (cameraInit of livestreamCache){
        // CHECKS IF THE REQUEST FORFILLS THE REQUIREMENTS, THEN UPDATES THE DB 
        try{
          if (cameraInit["last_known_wan_ip"] != "null"){
            if (cameraInit["conf_key"] == key && cameraInit["mac_addr"] == mac && cameraInit["last_known_wan_ip"] == wanIp){
              returnConf = await updateDb(cameraInit["id"], wanIp, localIp);
              configName = cameraInit["config_file_name"];
            } 
          
          }else {
            if (cameraInit["conf_key"] == key && cameraInit["mac_addr"] == mac){
              returnConf = await updateDb(cameraInit["id"], wanIp, localIp);
              configName = cameraInit["config_file_name"];
            }
          }
        } catch (error){
          res.status(401).send("Atuhentication Error!");
        }
      }


      if (returnConf == true && configName != ""){

        const relativeConfigPath = constant.HOST["configPath"] + "/" +configName;
        configJson = await getJsonData(relativeConfigPath); 
        
        if (configJson != null){
          res.status(200).json(configJson);
                  
        }else {
          res.status(500).send("Internal server error!");
        }
  

      } else {
        res.status(401).send("Atuhentication Error!");
      }

  } catch (error) {
    console.error("There was an internal server error during three way handshake: ", error);
    res.status(500).send("Internal server error!");
  }
});