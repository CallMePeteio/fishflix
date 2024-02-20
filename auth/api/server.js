const sqlite3 = require("sqlite3").verbose();
const express = require("express");
const app = express();

const constant = require("../constant");


// APP CONFIG
app.use(express.urlencoded({extended: true }));

// DB
const db = new sqlite3.Database("./instance/auth.db", sqlite3.OPEN_READWRITE, // CONNECTS TO THE DB
    (err) => {if (err) return console.error(err.message)} 
);
db.run("PRAGMA foreign_keys = ON");

let sql;



// ____________________AUTHENTICATING

app.post("/auth", function (req, res){ // IF A POST
    const streamkey = req.body.key; // GETS THE STREAM KEY
    const username = req.body.name;

    sql = "SELECT * FROM camera_connections WHERE username = ? AND key = ?";

    db.all(sql, [username, streamkey], (err, rows) => {if (err) return console.error(err.message)
        
        if (rows.length == 0){
            res.status(403).send(); // RETURNS 403 (auth unsucsessful)
            return; // STOPS THE SCRIPT
        } else if (rows.length == 1){
            res.status(200).send(); // RETURNS 200 (auth is sucsessful)
        } else {
            res.status(200).send(); // RETURNS 200 (auth is sucsessful)
            console.error("There was an error authenticating users, multible users with same name and keys!")
        }

        sql = "UPDATE camera_connections SET is_connected = ? WHERE username = ? AND key = ?";
        db.run(sql, [1, username, streamkey], 
            (err) => {if (err) return console.error(err.message)
        });
    });
})



// ____________________AUTHENTICATING

app.post("/auth_done", function (req, res){ // IF A POST
    
    try {
        const streamkey = req.body.key; // GETS THE STREAM KEY
        const username = req.body.name;

        sql = "UPDATE camera_connections SET is_connected = ? WHERE username = ? AND key = ?";
        db.run(sql, [0, username, streamkey], (err) => {
            if (err) {
                res.status(500).json({ message: 'Error updating internal value' });
                console.error(err.message); 
                return; 
            } else {
                res.status(200).json({ message: 'Stream status updated successfully' });
            }

        });
    
    } catch (error) {
        console.error('Failed to update stream status', error);
        res.status(500).json({ message: 'Internal server error' });
    }

})

app.listen(constant.SERVER.port, function (){ // STARTS THE SERVER
    console.log("Local Auth Server Listening to port", constant.SERVER.port);
})