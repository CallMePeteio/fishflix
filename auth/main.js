

const { spawn } = require('child_process');
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

runScript('./api/server.js'); // RUNS SOME LOCAL API'S
runScript('./api/api.js'); // RUNS THE USER API'S
runScript('./website/host.js'); // RUNS THE USER API'S


