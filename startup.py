
from argon2 import PasswordHasher, exceptions
from cryptography.fernet import Fernet


import netifaces
import requests
import socket
import time
import json
import os


class Startup():
    def __init__(self, waitTime):
        self.mainPath = os.path.abspath(os.getcwd()) 
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
                # Attempt to make a request to the specified URL
                response = requests.get(url, timeout=timeout)
                # Check if the HTTP request was successful
                if response.status_code == 200:
                    return True
            except requests.ConnectionError:
                print("startup.py:     Failed to establish an internett connection! Retrying.")
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
                self.countDown()

    def getMacAddr(self,interface='eth0'):
        while True:
            try:
                addrs = netifaces.ifaddresses(interface)
                return addrs[netifaces.AF_LINK][0]['addr']
            except Exception as e:
                print(f"startup.py:     Failed to get mac address! ({e}) Retrying.")
                self.countDown()
  
    def run(self):

        self.checkInternet()
        self.localIp = self.getLocalIp()
        self.wanIp = self.getWanIp()
        self.mac = self.getMacAddr()

    def requestConfig(self, apiKey):
        print(f"startup.py:     Requesting new config file from server!")
        headers = {
        'Accept': 'application/json',  # NEED TO TELL THE API WE WANT JSON BACK, OTHERWISE WE WILL BE RIDIRECTED TO /login
        }
           
        while True:
            try:
                payload = {"key": apiKey, "mac": self.mac, "wanIp": self.wanIp, "localIp": self.localIp}
                response = requests.post('https://ip.duerfyringsvakt.com:8443/api/threewayhandshake/wakeup', json=payload, headers=headers)
                
                if response.status_code == 200:
                    print(f"startup.py:     Sucsessfully got config file!")
                    return response.json()

                elif response.status_code == 401:
                    print("startup.py:     There was an api authentication error!")
                elif response.status_code == 500:
                    print("startup.py:     Internal sevrer error response from api!")
                else: 
                    print(f"sendData.py:     Got an unknown status code in return: {response.status_code}")

            except Exception as e: 
                print(f"There was an error making a request to the server: {e}")
            
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
                            verifiedConf = False
                            break
                    else:
                        print(f"startup.py:     Integrety check for config failed, key value not found in config.json: {key}")
                        verifiedConf = False
                        break

            return verifiedConf
        else: 
            return False

 
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

def generateApiKeyHash(macAddr):

    # FIRST READS THE ENCRYPTED API KEY
    key = os.getenv('SECRET_KEY')
    if key is None:
        raise ValueError("No SECRET_KEY environment variable set")

    if os.path.exists("./ref/apiKey.txt"):
        cipher_suite = Fernet(key)

        with open("./ref/apiKey.txt", 'r') as file:
            encrypted_api_key_str = file.read()

        apiKey = cipher_suite.decrypt(encrypted_api_key_str.encode()).decode()
    else:
        print("startup.py:   There was an error finding the apiKey.txt file!")



    
    print(apiKey)    
    
    totalString = macAddr + "_" + apiKey

    ph = PasswordHasher()
    hashed = ph.hash(totalString)

    return hashed




def generateWakeupKey(constantKey, mac):

    # MAKE EPIC ENCRYPTION ALGORYTHM

    return constantKey + "_" + mac


def main():
    
    start = Startup(10)
    start.run()

    verifiedConf = start.verifyConfig("config.json")
    while verifiedConf == False:
        confData = start.requestConfig(generateWakeupKey(constantKey, start.mac))
        writeJsonData(start.mainPath + "/" + "config.json", confData)
        verifiedConf = start.verifyConfig("config.json")
    else: 
        print(f"startup.py:     Verified config file, continuing bootup \n")
    


