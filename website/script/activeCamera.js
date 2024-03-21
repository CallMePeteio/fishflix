
import { postDataJWT } from "./func.js";
import { getDataJSW } from "./func.js";


const URL = "https://ip.duerfyringsvakt.com:8443";
const ROW_BOX = document.getElementById("table-rows");
const ERROR_BOX = document.getElementById("error-text");
let cameraCache = {};

/* _________________ TABLE _________________ */

// -- MAKES THE TABLE
function makeTableHtmlStr(id, username, key, mac, wanIp, localIp, isLive){

    let liveStr;
    if (isLive == 1){
        liveStr = "<span class='dot green' title='Camera is live'></span>";
    }else {
        liveStr = "<span class='dot red' title='Camera is not live'></span>";
    }


    const htmlTableStr = ` 
    <tr>
        <td>${id}</td>
        <td>${username}</td>
        <td>${mac}</td>
        <td>${wanIp}</td>
        <td>${localIp}</td>
        <td>${liveStr}</td>
        <td><button class="delete-btn" data-id="${id}">Delete</button></td>
    </tr>
    `
    return htmlTableStr
}
async function getCameras(){
    const token = localStorage.getItem("token");
    const cameras = await getDataJSW(URL + "/api/getRpi", token);

    if (cameras.length != cameraCache.length){
        let allHtmlContents = "";
        for (const camera of cameras){
            if (camera["has_retrived_conf"] == 1){
                allHtmlContents += makeTableHtmlStr(camera["id"], camera["username"], "null", camera["mac_addr"],  camera["last_known_wan_ip"], camera["last_known_local_ip"], camera["is_connected"]);
            }
        }
        ROW_BOX.innerHTML = allHtmlContents; 
        cameraCache = cameras
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
    const data = {"id": id, "tableIndex": 1};
    await postDataJWT(URL + "/api/getRpi", data, token);
    getCameras(); 
} catch (error) {
    console.log("There was an error deleting RPI");
}
}