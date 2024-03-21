
const sqlite3 = require("sqlite3").verbose();
const jwt = require("jsonwebtoken");
const express = require("express");
const bcrypt = require("bcrypt");
const https = require("https");
const path = require("path");
const ejs = require('ejs');
const fs = require("fs");

const constant = require("../constant");
const func = require("../func");
const { json } = require("body-parser");
const app = express();

app.use('/css', express.static(path.join(__dirname, 'website/css')));
app.use('/script', express.static(path.join(__dirname, 'website/script')));


app.set('views', path.join(__dirname, 'html'));
app.use(express.static("website"));
app.set('view engine', 'ejs');
app.use(express.json());



// DB
const db = new sqlite3.Database("./instance/auth.db", sqlite3.OPEN_READWRITE, // CONNECTS TO THE DB
    (err) => {if (err) return console.error(err.message)} 
);


// _________________ CACHING _________________

// NOTE CAN ADD TO THIS, SO IT UPDATES THE CACHE WHEN A NEW USER IS MADE.
let users = [];
const updateUserCache = () => {
    sql = "SELECT * FROM users"; 
    db.all(sql, [], 
        (err, rows) => {if (err) return console.error(err.message)
        users = rows;
    });
}
updateUserCache();
setInterval(updateUserCache, constant.HOST.userUpdateCacheTimer);


// __________________ PATHS __________________

app.get('/live', (req, res) => {
    res.render('live'); 
});

app.get('/home', (req, res) => {
    res.render('home'); 
});

app.get('/activeCamera', (req, res) => {
    res.render('activeCamera'); 
});


// _______________ ADD NEW RPI ______________
app.get('/newRpi', (req, res) => {
    res.render('addNewRpi');
});

function saveJsonFile(config, name, path){
    
    if (typeof config === "string"){
        const config = JSON.parse(configStr);
    }

    fs.mkdirSync(path, { recursive: true });
    const configFilePath = path + "/" + name;

    fs.writeFile(configFilePath, JSON.stringify(config, null, 2), (err) => {
        if (err){
            console.error("There was an error saving the json file", err);
            return false;
        }

        console.error("Configuration file sucsessfully saved!");
    })
}

function generateWakeupKey(constantKey, mac){


    // MAKE EPIC DEENCRYPTION ALGORYTHM

    const key = constantKey + "_" + mac;

    return key

}

app.post("/newRpi", func.authenticateToken, (req, res) => {
    try {
        const {key, username, mac, wanIp, config} = req.body;
        const configFileName = username + "_" + mac + ".json";

        const err = saveJsonFile(config, configFileName, constant.HOST["configPath"]);
        if (err){
            res.status(500).send("Internal Server Error!");
        }
 
        wakeupKey = generateWakeupKey(constant.API["threeWayHandshakeKey"], mac);
        const query = "INSERT INTO camera_credentials (key, username, mac_addr, last_known_local_ip, last_known_wan_ip, conf_key, is_connected, has_retrived_conf, config_file_name) VALUES (?,?,?,?,?,?,?,?,?)";

        //console.log(key, username, mac, wanIp)
        db.run(query, [key, username, mac, "null", wanIp, wakeupKey, 0, 0, configFileName],  // INSERTS DATA INTO THE DB
            (err) => {if (err) return console.error(err.message);}
        );

        res.sendStatus(200);

    } catch (error) {
        console.error("There was an internal server error adding new raspberry pi's", error);
        res.status(500).send("Internal Server Error!");
    }
}); 

// ___________________________ LOGIN HTML AND POST ___________________________
app.get('/login', (req, res) => {
    res.render('login'); // Renders website/html/login.ejs
});

app.post("/users/login", async (req, res) =>{
    const password = req.body.password;
    const username = req.body.username;

    for (let user of users) {
        try {
            if (await bcrypt.compare(password, user["password"]) && username === user["username"]) {
                const userPayload = { username: user["id"] };
                //console.log(constant.JWT_SECRET);
                const token = jwt.sign(userPayload, constant.JWT_SECRET, { expiresIn: constant.HOST.timeoutTime });
                res.status(200).json({ message: "Login successful", token: token });
                found = true; // Set flag to true
                break; // Break out of the loop
            }
        } catch (error) {
            console.error(error); // Log the error
            res.status(500).json({ message: "Internal Server Error" });
            return;
        }
    }

    if (!found) {
        res.status(401).json({ message: "Login Unsuccessful" });
    }
})






// _____________________________ STARTING SERVER _____________________________
const options = {
    key: fs.readFileSync(constant.SERTIFICATES_PATH.key),
    cert: fs.readFileSync(constant.SERTIFICATES_PATH.cert)
};
  
const server = https.createServer(options, app);
server.listen(constant.HOST.port, () => {
  console.log('Https listening on port', constant.HOST.port);
});
  

