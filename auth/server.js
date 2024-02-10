const express = require("express");
const app = express();

app.use(express.urlencoded({extended: true }));

app.post("/auth", function (req, res){ // IF A POST
    const streamkey = req.body.key; // GETS THE STREAM KEY
    
    if (streamkey === "supersecret"){ // IF THE STREAMKEY IS THE KEY STORED ON THE BACKEND
        res.status(200).send(); // RETURNS 200 (auth is sucsessful)
        return;
    }
    res.status(403).send(); // RETURNS 403 (auth unsucsessful)

})

app.listen(8000, function (){ // STARTS THE SERVER
    console.log("Listening to port 8000!");
})