
from twilio.rest import Client

import traceback
import threading
import requests
import datetime
import psutil   
import uptime
import json
import time
import csv
import os

class getRpiStats():
    def __init__(self, interval):
        self.interval = interval
        self.cpuTemp = None
        self.cpuUsage =  None
        self.netowrkUsage = None
        self.cpuUsage = None
        self.memoryUsage = None
        self.uptime = None
        self.powerUsage = None

    def getCpuTemp(self):

        cpuTempList = []
        for i in range(self.interval):
            try:
                with open("/sys/class/thermal/thermal_zone0/temp", "r") as temp_file:
                    cpu_temp = int(temp_file.read()) / 1000.0
                    cpuTempList.append(cpu_temp)
            except FileNotFoundError:
                print("CPU temperature file not found")
            time.sleep(1)

        self.cpuTemp = round(sum(cpuTempList)/len(cpuTempList), 1)

    def getCpuUsage(self):
        cpuUsage = psutil.cpu_percent(interval=self.interval)
        self.cpuUsage = cpuUsage

    def getNetworkUsage(self):
  
        # Get bytes sent and received
        net1 = psutil.net_io_counters()
        bytes_sent1 = net1.bytes_sent
        bytes_recv1 = net1.bytes_recv

        # Wait for the interval (5 seconds)
        time.sleep(self.interval)

        # Get bytes sent and received again
        net2 = psutil.net_io_counters()
        bytes_sent2 = net2.bytes_sent
        bytes_recv2 = net2.bytes_recv

        # Calculate bytes sent and received during the interval
        bytes_sent = bytes_sent2 - bytes_sent1
        bytes_recv = bytes_recv2 - bytes_recv1

        # Convert bytes to megabytes
        mb_sent = bytes_sent / (1024 * 1024)
        mb_recv = bytes_recv / (1024 * 1024)


        self.netowrkUsage = (mb_sent + mb_recv) /2

    def getMemoryUsage(self):
        
        memUsageList = []
        for i in range(0, self.interval):
            memory = psutil.virtual_memory()
            memoryMB = memory.used / (1024 * 1024)
            memUsageList.append(memoryMB)
            time.sleep(1)
        
        self.memoryUsage = round(sum(memUsageList)/len(memUsageList), 1)

    def getPowerUsage(self):
        self.powerUsage = None

    def getUptime(self):
        uptime_seconds = uptime.uptime()

        # Convert seconds to a more readable format (days, hours, minutes)
        days, remainder = divmod(uptime_seconds, 86400)
        hours, remainder = divmod(remainder, 3600)
        minutes, seconds = divmod(remainder, 60)

        formatted_uptime = f"{days} days, {hours}:{minutes}:{int(seconds)}"
        self.uptime = formatted_uptime

    def tick(self):
        threading.Thread(target=self.getCpuTemp).start()
        threading.Thread(target=self.getCpuUsage).start()
        threading.Thread(target=self.getNetworkUsage).start()
        threading.Thread(target=self.getMemoryUsage).start()
        threading.Thread(target=self.getPowerUsage).start()
        threading.Thread(target=self.getUptime).start()


        time.sleep(self.interval + 1)

    def getData(self):
        return {"cpuTemp": self.cpuTemp, "cpuUsage": self.cpuUsage, "networkUsage": self.netowrkUsage, "cpuUsage": self.cpuUsage, "memoryUsage": self.memoryUsage, "uptime": self.uptime, "powerUsage": self.powerUsage}


def sendText(SID, AUTH_TOKEN, toNums, fromNum, msg):
    client = Client(SID, AUTH_TOKEN)
    for num in toNums:
        message = client.messages \
                        .create(
                             body=msg,
                             from_=fromNum,
                             to=num
                         )


parentFolder = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(parentFolder, 'config.json')) as f:
  streamSettings = json.load(f)

firstRun = True
stats = getRpiStats(streamSettings["sendDataIntervalSecond"])
statsFields = ["cpuUsage", "cpuTemp", "memoryUsage", "netowrkUsage", "powerUsage", "uptime"]
csvFileNameStats = str(datetime.datetime.now().strftime("%Y-%m-%d_%H:%M:%S")) + "_stats.csv"
csvFileNameSensData = str(datetime.datetime.now().strftime("%Y-%m-%d_%H:%M:%S")) + "_sens.csv"

sentData = 0
error = False
while True:


    try: 
        stats.tick() # READS DATA
        rpiStats = stats.getData() # GETS DATA

        # 'rpiStats' =  [cpuUsage (float), cpuTemp (float), memoryUsage (float), networkUsage (float), powerUsage (float), uptime (str)],
        # 'sensData': {exampleSensor1 (str): exmapleValue2 (str), Exmaplesensor2 (str): examplevalue2 (str)} 

        data = {
            'key': streamSettings["apiKey"],
            'rpiStats': [rpiStats["cpuUsage"], rpiStats["cpuTemp"], rpiStats["memoryUsage"], rpiStats["networkUsage"], rpiStats["powerUsage"], rpiStats["uptime"]] # THE ORDER MATTERS
            #'sensData': {"temperatur": "15", "luftfuktighet": "getMoistStr()"}
        }


        if streamSettings["saveLogs"] == True: 

            if "rpiStats" in data:
                statsPath = os.path.join(parentFolder, "logs/" + csvFileNameStats)
                with open(statsPath, 'a') as f:
                    writer = csv.writer(f)
                    if firstRun == True:
                        writer.writerow(statsFields)
                    writer.writerow(data["rpiStats"])

            if "sensData" in data:
                sensPath = os.path.join(parentFolder, "logs/" + csvFileNameSensData)
                with open(sensPath, 'a') as f:
                    writer = csv.writer(f)
                    if firstRun == True:
                        writer.writerow(list(data["sensData"].keys()))
                    writer.writerow(list(data["sensData"].values()))

        try:
            response = requests.post(streamSettings["apiUrl"] + "/api/rpidata", json=data)
            error = False
        except requests.exceptions.ConnectionError as e:
            print("sendData.py:     Failed to establish api connection, retrying.")
            

            
            if "sendText" in streamSettings and "msgAuth" in streamSettings and "toNumbers" in streamSettings and "fromNumber" in streamSettings:
                if streamSettings["sendText"] == True and error == False:
                    msg = "Raspberry pi fishflix specs lost connection to server"
                    sendText(streamSettings["msgAuth"][0], streamSettings["msgAuth"][1], streamSettings["toNumbers"], streamSettings["fromNumber"], msg)


            error = True



        if error == False:
            if response.status_code == 200:
                if streamSettings["silent"] == False:
                    sentData += 1
                    print(f"#{sentData} Sucsessfully sent data to api")
            elif response.status_code == 401:
                print("sendData.py:     There was an authentication error!")
            elif response.status_code == 500:
                print("sendData.py:     Internal sevrer error response from api!")
            else: 
                print(f"sendData.py:     Got an unknown status code in return: {response.status_code}")

        firstRun = False
    
    except Exception as e:

        currentTime = str(datetime.datetime.now().strftime("%Y-%m-%d_%H:%M:%S"))
        errorType = str(type(e).__name__)

        errorPath = os.path.join(parentFolder, "logs/" + errorType + "_" + currentTime + ".txt")

        if streamSettings["logErrors"] == True:
            if not os.path.exists(errorPath): 
                with open(errorPath, 'w') as f:
                    f.write(errorType + traceback.format_exc())
            else: 
                print(f"Error file already exists!")
        print(f"There was a critical error with sending data! \n {e}")





