
import subprocess
import netifaces
import requests
import datetime
import socket
import signal
import time
import json
import os


class Startup():
    def __init__(self, waitTime, startupLogPath):
        self.mainPath = os.path.dirname(os.path.abspath(__file__))
        self.startupLogPath = os.path.join(self.mainPath, startupLogPath)
        self.waitTime = waitTime

        self.localIp = None
        self.wanIp = None
        self.mac = None

    def countDown(self):
        for i in range(self.waitTime, 0, -1):
            print(f"startup.py:     {i}")
            time.sleep(1)

    def checkInternet(self, url='http://google.com', timeout=5):
        while True:
            try:
            # Ping Google's public DNS server or another reliable endpoint
                subprocess.check_output(['ping', '-c', '1', '-W', '5', '8.8.8.8'], stderr=subprocess.STDOUT)
            except subprocess.CalledProcessError:
                # If ping fails, assume the network is down and wait before retrying
                print("startup.py:     Network is down, waiting before retrying...")
                writeStartupError(self.startupLogPath, "\nstartup.py:     Network is down, waiting before retrying...")
                self.countDown()
                continue  # Proceed to the next iteration of the loop



            try:
                # Attempt to make a request to the specified URL
                response = requests.get(url, timeout=timeout)
                # Check if the HTTP request was successful
                if response.status_code == 200:
                    return True
            except requests.ConnectionError:
                print("startup.py:     Failed to establish an internett connection! Retrying.")
                writeStartupError(self.startupLogPath, f"\nstartup.py:     Failed to establish an internett connection! Retrying.")

                self.countDown()

    def getLocalIp(self):
        while True:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            try:
                # doesn't even have to be reachable
                s.connect(('10.255.255.255', 1))
                IP = s.getsockname()[0]
                break
            except Exception:
                print("startup.py:     Failed to establish get local ip address! Retrying.")
                writeStartupError(self.startupLogPath, f"\nstartup.py:     Failed to establish get local ip address! Retrying.")

                self.countDown()
            finally:
                s.close()
        return IP

    def getWanIp(self):
            
        while True:
            response = requests.get('https://api.ipify.org')
            if response.status_code == 200:
                return response.text 
            else:
                print(f"startup.py:     Failed to establish get WAN ip address! ({response.status_code}) Retrying.")
                writeStartupError(self.startupLogPath, f"\nstartup.py:     Failed to establish get WAN ip address! ({response.status_code}) Retrying.")
                
                self.countDown()

    def getMacAddr(self,interface='eth0'):
        while True:
            try:
                addrs = netifaces.ifaddresses(interface)
                return addrs[netifaces.AF_LINK][0]['addr']
            except Exception as e:
                print(f"startup.py:     Failed to get mac address! ({e}) Retrying.")
                writeStartupError(self.startupLogPath, f"\nstartup.py:     Failed to get mac address! ({e}) Retrying.")
                self.countDown()
  
    def run(self):

        self.checkInternet()
        self.localIp = self.getLocalIp()
        self.wanIp = self.getWanIp()
        self.mac = self.getMacAddr()

    def checkCamera(self): 

#       Runs these commands, and checks for correct output.
#       libcamera-hello --list-cameras
#       rpicam-hello
#       rpicam-jpeg -o test.jpg
        
    
        try: 
            result = subprocess.run(["libcamera-hello", "--list-cameras"], capture_output=True, text=True)
            if result.returncode != 0: 
                print(f"startup.py:     There was a problem running libcamera-hello (lists avalible cameras): \n {result.stderr}")
                writeStartupError(self.startupLogPath, f"\nstartup.py:     There was a problem running libcamera-hello (lists avalible cameras): \n {result.stderr}")
                return False


            tryTimes = 3 
            for i in range(tryTimes):
                result = subprocess.run(["rpicam-hello"], capture_output=True, text=True, timeout=20)

                if result.returncode != 0: 
                    print(f"startup.py:     There was a problem with rpicam-hello () \n {result.stderr}")
                    writeStartupError(self.startupLogPath, f"\nstartup.py:     There was a problem with rpicam-hello () \n {result.stderr}")


                    for _ in range(10):
                        killId = subprocess.run(["fuser", "-v", f"/dev/video{i}"], capture_output=True, text=True).stdout.strip() # CHECKS IF SOMEONE IS ALREADY USING THE CAMERA
                        if killId != "": # IF SOMETHING IS USING THE CAMERAS
                            result = subprocess.run(["kill", killId], capture_output=True, text=True) # KILLS THE PROCESS

                            if result.returncode != 0:
                                print(f"startup.py:     There was an error killing process with id: {killId}, return code: {result.returncode}")
                                writeStartupError(self.startupLogPath, f"\nstartup.py:     There was an error killing process with id: {killId}, reutrntext: {result.returncode}")
                                break

                            else:
                                print(f"startup.py:     Sucsessfully killed process with id: {killId}")
                                writeStartupError(self.startupLogPath, f"\nstartup.py:     Sucsessfully killed process with id: {killId}")
                                break


                    if i == tryTimes:
                        return False
                else:
                    break

            #testImgPath = "logs/temp.jpg"
            #result = subprocess.run(["rpicam-jpeg", "-o", testImgPath], capture_output=True, text=True)
            #if result.returncode != 0: 
            #    print(f"startup.py:     Failed to capture image! \n {result.stderr}")
            #    writeStartupError(self.startupLogPath, f"\nstartup.py:     Failed to capture image! \n {result.stderr}")
            #    return False
            #
            #if os.path.exists(testImgPath):
            #    os.remove(testImgPath)

        except Exception as error:
            print(f"startup.py:     There was a critical error cheking the camera status \n {error}")
            writeStartupError(self.startupLogPath, f"\nstartup.py:     There was a critical error cheking the camera status \n {error}")
            return False


        return True

    def requestConfig(self, apiKey):
        print(f"startup.py:     Requesting new config file from server!")
        writeStartupError(self.startupLogPath, f"\nstartup.py:     Requesting new config file from server!")

        headers = {
        'Accept': 'application/json',  # NEED TO TELL THE API WE WANT JSON BACK, OTHERWISE WE WILL BE RIDIRECTED TO /login
        }
           
        while True:
            try:
                payload = {"key": apiKey, "mac": self.mac, "wanIp": self.wanIp, "localIp": self.localIp}
                response = requests.post('https://ip.duerfyringsvakt.com:8443/api/threewayhandshake/wakeup', json=payload, headers=headers)
                
                if response.status_code == 200:
                    print(f"startup.py:     Sucsessfully got config file!")
                    writeStartupError(self.startupLogPath, f"\nstartup.py:     Sucsessfully got config file!")
                    return response.json()

                elif response.status_code == 401:
                    print("startup.py:     There was an api authentication error!")
                    writeStartupError(self.startupLogPath, f"\nstartup.py:     There was an api authentication error!")

                elif response.status_code == 500:
                    print("startup.py:     Internal sevrer error response from api!")
                    writeStartupError(self.startupLogPath, f"\nstartup.py:     Internal sevrer error response from api!")

                else: 
                    print(f"startup.py:     Got an unknown status code in return: {response.status_code}")
                    writeStartupError(self.startupLogPath, f"\nstartup.py:     Got an unknown status code in return: {response.status_code}")


            except Exception as e: 
                print(f"There was an error making a request to the server: {e}")
                writeStartupError(self.startupLogPath, f"\nstartup.py:     There was an error making a request to the server: {e}")
            
            self.countDown()

    def verifyConfig(self, name):

        verifiedConf = False
        refConfig = readJsonData(self.mainPath + "/ref/refConfig.json")
        if refConfig != False:
            configJsonPath = self.mainPath + "/" + name
            currentConfig = readJsonData(configJsonPath)

            if currentConfig != False: 
                # CHECKS THE INTEGRETY OF THE CURRENT CONFIG COMPARED TO THE REF CONFIG
                for key, val in refConfig.items():
                    if key in currentConfig: 
                        if type(refConfig[key]) == type(currentConfig[key]):
                            verifiedConf = True
                        else:

                            print(f"startup.py:     Integrety check for config failed, value types wrong: {currentConfig[key]} shuld be {type(refConfig[key])}")
                            writeStartupError(self.startupLogPath, f"\nstartup.py:     Integrety check for config failed, value types wrong: {currentConfig[key]} shuld be {type(refConfig[key])}")
                            verifiedConf = False
                            break
                    else:
                        print(f"startup.py:     Integrety check for config failed, key value not found in config.json: {key}")
                        writeStartupError(self.startupLogPath, f"\nstartup.py:     Integrety check for config failed, key value not found in config.json: {key}")
                        verifiedConf = False
                        break

            return verifiedConf
        else: 
            return False


def writeStartupError(path, text): 
    try:
        with open(path, "a") as f:
            f.write(text)
    except Exception as error:
        print(f"startup.py:     There was an error writing startuplog: {error}")

def readJsonData(path):
    try:
        if os.path.exists(path):
            with open(path) as f:
                data = json.load(f)
            return data
        else:
            print(f"startup.py:     Cant read json file, it dosent exist! {path}")
            return False
    except Exception as err:
        print(f"startup.py     There was an error reading the json file {err}")
        return False

def writeJsonData(path, data):
    try:
        with open(path, 'w') as outfile:
            json.dump(data, outfile, indent=4)
    except Exception as err:
        print(f"startup.py:     There was an error writing the new config file! {err}")

def makeStartSshConfig(path, uniquePort, serverUser, serverUrl):

    script = f"""
#!/bin/bash
UNIQUE_PORT={uniquePort} # Example for one Pi, use different ports for each
SERVER_USER={serverUser}
SERVER_HOST={serverUrl}
autossh -f -N -R $UNIQUE_PORT:localhost:22 $SERVER_USER@$SERVER_HOST -o "ServerAliveInterval 30" -o "ServerAliveCountMax 3"
    """

    # Step 2: Write this script to a .sh file
    with open(path, "w") as file:
        file.write(script)

    # Step 3: Make the shell script executable
    os.chmod(path, 0o755)


#makeStartSshConfig("startSSH.sh", 2222, "server", "ip.duerfyringsvakt.com")

def generateWakeupKey(constantKey, mac):

    # MAKE EPIC ENCRYPTION ALGORYTHM

    return constantKey + "_" + mac









def main():
    time.sleep(5) # WAITS A BIT, SO NETWORK DIRVES HAVE TIME TO INTI
# ---------- STARTS BACKUP SSH ACCESS
    #reverseSSHBackup = subprocess.Popen(["bash", "./ref/backupRevserseSSH.sh"])




# ---------- RUNS THE STARTUP LOGIC
    constantKey = "THREE_WAY_HANDSHAKE_KEY"
    startupErrorName = str(datetime.datetime.now().strftime("%Y-%m-%d_%H:%M:%S")) + "_startupLog.txt"
    start = Startup(10, "logs/" + startupErrorName)
    start.run()



# ---------- VERIFIES CONFIG.JSON
    verifiedConf = start.verifyConfig("config.json")
    while verifiedConf == False:
        confData = start.requestConfig(generateWakeupKey(constantKey, start.mac))

        print(start.mainPath)
        writeJsonData(start.mainPath + "/" + "config.json", confData)
        verifiedConf = start.verifyConfig("config.json")
    else: 
        print(f"startup.py:     Verified config file, continuing bootup \n")
        writeStartupError(start.startupLogPath, f"\nstartup.py:     Verified config file, continuing bootup \n")



# ---------- KILLS BACKUP REV SSH AND STARTS NEW
#    with open('./config.json') as f:
#        streamSettings = json.load(f)
#    makeStartSshConfig("startSSH.sh", streamSettings["revSshUniquePort"], streamSettings["revSshServerUser"], streamSettings["revSshServerUrl"])
#
#    reverseSSHBackup.send_signal(signal.SIGTERM)
#    try: 
#        reverseSSHBackup.wait(5)
#    except:
#        reverseSSHBackup.kill()

    
    


# ---------- VERIFIES CAMERA IS WORKING
    checkCamera = start.checkCamera()
    while checkCamera == False:
        checkCamera = start.checkCamera()
        start.countDown()
    else:
        print(f"startup.py:     Verified camera, continuing startup \n")
        writeStartupError(start.startupLogPath, f"\nstartup.py:     Verified camera, continuing startup \n")

    

    return start.localIp



if __name__ == "__main__":
    main()
