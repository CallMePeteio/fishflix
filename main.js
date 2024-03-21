


const sqlite3 = require("sqlite3").verbose();
const { spawn } = require('child_process');




// ----- RESETS DB
const db = new sqlite3.Database("./instance/auth.db", sqlite3.OPEN_READWRITE, // CONNECTS TO THE DB
    (err) => {if (err) return console.error(err.message)} 
);

sql = "UPDATE camera_credentials SET is_connected = ?";
db.run(sql, [0], 
    (err) => {if (err) return console.error(err.message)
});

db.close((err) => {
    if (err) return console.error(err.message);
    console.log('Closed the init db connection');
});


// ------ START SCRIPTS: 

function runScript(scriptPath) {
    const child = spawn('node', [scriptPath]);

    child.stdout.on('data', (data) => {
        console.log(`${scriptPath}:     ${data}`);
    });

    child.stderr.on('data', (data) => {
        console.error(`${scriptPath}:    ${data}`);
    });

    child.on('close', (code) => {
        console.log(`${scriptPath} Closed with code: ${code}`);
    });
}

runScript('./website/api/server.js'); // RUNS THE USER API'S
runScript('./website/host.js'); // RUNS THE USER API'S


