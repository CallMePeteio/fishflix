


from startup import Startup
import threading
import requests
import json
import time
import random
import os



PARENT_FOLDER = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(PARENT_FOLDER, 'config.json')) as f:
  streamSettings = json.load(f)

UPDATE_WAN_IP_ENDPOINT = streamSettings["apiUrl"] + "/api/updateIp"

API_HEADERS = {
'Accept': 'application/json',  # NEED TO TELL THE API WE WANT JSON BACK, OTHERWISE WE WILL BE RIDIRECTED TO /login
"authorization": streamSettings["apiKey"]
}



start = Startup(10, os.path.join(PARENT_FOLDER, "logs/dontMakeERR.txt"))



def sendNewIp(wanIp, localIp):
            
            data = {
                   "wanIp": wanIp, 
                   "localIp": localIp
            }

            response = requests.post(UPDATE_WAN_IP_ENDPOINT, json=data, headers=API_HEADERS)
            print(f"maintain.py:     Updated ip to: {wanIp}, {localIp}")

def main(currentWanIp, currentLocalIp):
    def run(currentWanIp, currentLocalIp):
        while True:
            wanIp = start.getWanIp()
            localIp = start.getLocalIp()
            if currentWanIp != wanIp or localIp != currentLocalIp: 
                sendNewIp(wanIp, localIp)
                currentWanIp = wanIp
                currentLocalIp = localIp

            time.sleep(10)

    threading.Thread(target=run, args=(currentWanIp, currentLocalIp)).start()

currentWanIp, currentLocalIp = "", ""
if __name__ == "__main__":    
    main(currentWanIp, currentLocalIp)













