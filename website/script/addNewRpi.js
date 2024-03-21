



import { postDataJWT } from "./func.js";
import { getDataJSW } from "./func.js";


const URL = "https://ip.duerfyringsvakt.com:8443";
const ROW_BOX = document.getElementById("table-rows");
const ERROR_BOX = document.getElementById("error-text");
const FILE_INPUT_BOX = document.getElementById('configFile');

const MIN_KEY_LEN = 10;

let amountRecConf = 0;

function isHex(h) {
    // This regex matches MAC addresses in the format XX:XX:XX:XX:XX:XX or XX-XX-XX-XX-XX-XX,
    // where X is a hexadecimal character. The 'i' flag makes the check case-insensitive.
    return /^([0-9a-f]{2}[:-]){5}([0-9a-f]{2})$/i.test(h);
}
function checkValidKey(key){
    if (!(key.length <= MIN_KEY_LEN)){
        return true;
    } else {
        ERROR_BOX.innerText = "Minimum apiKey length is 10 charachters! (found in config.json)";
    }
    return false;
}

function readJsonFile(file){
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = function(fileLoadEvent){
            const fileContent = fileLoadEvent.target.result; // SAVES THE FILE CONTENT
            resolve(fileContent); // Resolve the promise with the file content
        };
        reader.onerror = function(event) {
            console.error("File could not be read: " + event.target.error.code);
            ERROR_BOX.innerText = "There was an error processing the json file, ensure correct structure and extension";
            reject(new Error("File could not be read: " + event.target.error.code)); // Reject the promise on error
        };
        reader.readAsText(file); // READS THE FILE CONTENTS
    });
}

document.getElementById('raspberryPiForm').addEventListener('submit', async function(e) {
    ERROR_BOX.innerText = "";
    e.preventDefault();

    //const formData = {
    //    key: document.getElementById('key').value,
    //    username: document.getElementById('username').value,
    //    mac: document.getElementById('macAddress').value,
    //    wanIp: document.getElementById('wanIp').value,
    //};

    const formData = {
        mac: document.getElementById('macAddress').value,
        wanIp: document.getElementById('wanIp').value,
    };

    // FILE INPUT, READING JSON FILE CONTENTS 
    let fileContent = null;
    if (FILE_INPUT_BOX.files.length == 1) {
        console.log("Reading file...");
        const file = FILE_INPUT_BOX.files[0];

        try {
            const fileContentStr = await readJsonFile(file); 
            fileContent = JSON.parse(fileContentStr);

            formData["config"] = fileContent; // ADDS THE CONFIG TO THE FORM DATA
            const keyUsername = fileContent["apiKey"];

            if (keyUsername.includes("?key=")){
                const [username, key] = keyUsername.split("?key=");

                formData.username = username;
                formData.key = key

            }else {
                ERROR_BOX.innerText = "There was a problem with apiKey variable in config file. Make sure it contains: ?key= between username and key";
                return;   
            }


        } catch (error) {
            console.error("Ther was an error proccesing the inputted json file: ", error);
            ERROR_BOX.innerText = "There was an error processing the json file, ensure correct structure and extension";
            return;
        }
    
    } else {
        ERROR_BOX.innerText = "You need to input one config file!";
        return;
    }
    


    if (!(isHex(formData.mac))){
        ERROR_BOX.innerText = "Mac address is not valid!";
        return;
    }

    if (checkValidKey(formData.key) == false){
        return;
    }

    if (formData.wanIp == ""){
        formData.wanIp = "null";
    }

    // Retrieve the token from localStorage
    const token = localStorage.getItem('token');
    if (!token) {
        alert("You are not logged in.");
        return; // Exit the function if there's no token
    }

    fetch('/newRpi', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // Include the token in the Authorization header
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.text();
    })

    .then(data => alert(data))
    .catch((error) => {
        console.error('Error:', error);
        alert("Failed to make the request. Make sure you are logged in.");
    });
});


/* _________________ TABLE _________________ */

// -- MAKES THE TABLE
function makeTableHtmlStr(id, username, key, mac, wanIp, localIp, isLive){
    const htmlTableStr = ` 
    <tr>
        <td>${id}</td>
        <td>${username}</td>
        <td>${mac}</td>
        <td>${wanIp}</td>
        <td><button class="delete-btn" data-id="${id}">Delete</button></td>
    </tr>
    `
    return htmlTableStr
}

function countRecivedConf(table){
    let recivedConf = 0
    for (const camera of table){
        if (camera["has_retrived_conf"] == 0){
            recivedConf += 1;
        }
    }

    return recivedConf;
}
async function getCameras(){
    const token = localStorage.getItem("token");
    const cameras = await getDataJSW(URL + "/api/getRpi", token);
    
    if (amountRecConf != countRecivedConf(cameras)){
        let allHtmlContents = "";
        for (const camera of cameras){
            if (camera["has_retrived_conf"] == 0){
                allHtmlContents += makeTableHtmlStr(camera["id"], camera["username"], "null", camera["mac_addr"],  camera["last_known_wan_ip"], camera["last_known_local_ip"], camera["is_connected"]);
            }
        }
        ROW_BOX.innerHTML = allHtmlContents; 
        amountRecConf = countRecivedConf(cameras);
    }
}
getCameras();
setInterval(getCameras, 100);

// -- DELETS RPI'S
document.addEventListener("DOMContentLoaded", function (){
    ROW_BOX.addEventListener("click", function(e){
        if(e.target.classList.contains("delete-btn")){// IF USER IS HOVERING OVER BUTTON
            const camId = e.target.dataset.id;
            deleteRpi(camId);

        }
    })
})

async function deleteRpi(id){
try {
    console.log(`Deleting rpi ${id}`);
    const token = localStorage.getItem("token");
    const data = {"id": id, "tableIndex": 0};
    await postDataJWT(URL + "/api/getRpi", data, token);
    getCameras(); 
} catch (error) {
    console.log("There was an error deleting RPI");
}
}



