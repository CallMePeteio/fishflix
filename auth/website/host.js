
const sqlite3 = require("sqlite3").verbose();
const jwt = require("jsonwebtoken");
const express = require("express");
const bcrypt = require("bcrypt");
const https = require("https");
const fs = require("fs");

const constant = require("../constant");
const app = express();


app.use(express.static("website"));
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
    res.sendFile(__dirname + constant.HOST.HTML_PARENT_FOLDER + '/live.html');
});


app.get('/login', (req, res) => {
    res.sendFile(__dirname + constant.HOST.HTML_PARENT_FOLDER + '/login.html');
});


app.post("/users/login", async (req, res) =>{
    const password = req.body.password;
    const username = req.body.username;

    for (let user of users) {
        try {
            if (await bcrypt.compare(password, user["password"]) && username === user["username"]) {
                const userPayload = { username: user["id"] };
                console.log(constant.JWT_SECRET);
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




const options = {
    key: fs.readFileSync(constant.SERTIFICATES_PATH.key),
    cert: fs.readFileSync(constant.SERTIFICATES_PATH.cert)
};
  
const server = https.createServer(options, app);
server.listen(constant.HOST.port, () => {
  console.log('Https listening on port', constant.HOST.port);
});
  


