
from twilio.rest import Client


import subprocess
import threading
import json
import time
import os

parentFolder = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(parentFolder, 'config.json')) as f:
    streamSettings = json.load(f)



if isinstance(streamSettings["kiloBitsPrSecond"], int) != True: 
    raise Exception("Invalid input bitrate, must be integer value! (in config.json)")



def start_TCP(url, res, fps, bitsPerSecond, printFrame):
    videoCommand = f'rpicam-vid -t 0 -b {bitsPerSecond} --libav-format mpegts --width {res[0]} --height {res[1]} --framerate {fps} --listen -o "{url}?listen=1"'
    process = subprocess.Popen(videoCommand, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)

    frame_count = 0
    try:
        while True:
            line = process.stdout.readline()
            if not line:
                break
            frame_count += 1
            if frame_count % printFrame == 0:  # Adjust this number to change the frequency of logging
                print(line.strip())

    except Exception as e:
        print(f"Error processing output: {e}")
    finally:
        process.terminate()
        process.wait()

def sendText(SID, AUTH_TOKEN, toNums, fromNum, msg):
    client = Client(SID, AUTH_TOKEN)
    for num in toNums:
        message = client.messages \
                        .create(
                             body=msg,
                             from_=fromNum,
                             to=num
                         )

def tcp_to_rtmp(tcp_url, rtmp_url, rtmp_key, log, bitrate, fps=30):
        

    startTcpStream = False
    while True: # FOR ERROR RETRYING

        """
        Converts a TCP stream to an RTMP stream using FFmpeg.

        Parameters:
        tcp_url (str): The source TCP stream URL.
        rtmp_url (str): The destination RTMP server URL.
        rtmp_key (str): The stream key for the RTMP server.
        log (bool): Whether to generate a log file.
        fps (int): Frames per second for the output video.
        bitrate (str): Optional. Specify the video bitrate (e.g., '1000k' for 1000 kbits/s).
        """

        if startTcpStream == True:
            threading.Thread(target=start_TCP, args=(tcp_url, streamSettings["res"], streamSettings["fps"], bitrate, streamSettings["printFrame"])).start() # RUNS THE TCP STREAM IN A SEPERATE THREAD
            time.sleep(3)
            startTcpStream = False            

        full_rtmp_url = f"{rtmp_url}/{rtmp_key}"

        # FFmpeg command to capture the TCP stream and push it to an RTMP endpoint
        command = [
            'ffmpeg',
            '-i', tcp_url,  # Input from the TCP stream
            '-r', str(fps),  # Specify the frame rate for the output video
            '-c', 'copy',   # Copy the stream without re-encoding
            '-f', 'flv',    # Format for the RTMP stream
        ]

        if bitrate != None:
            command.extend(['-b:v', str(bitrate)])

        if log == True:
            command.append("-report") # FFMPEG WIL GENNERATE A LOG FILE UPON START, BETTER FOR DEBUGGING

        command.append(full_rtmp_url)  # Output RTMP URL
        try:
            err = subprocess.run(command, stderr=subprocess.PIPE, text=True, check=True)  # Execute the FFmpeg command
            print(err)
        except subprocess.CalledProcessError as e:
            # Handle the error
            print(f"FFmpeg command failed with return code {e.returncode}")
            print(f"Error message: {e.stderr}")
            print(f"Retrying running ffmpeg stream...")
            for i in reversed(range(10)):
                print(i+1)
                time.sleep(1)


            if "sendText" in streamSettings and "msgAuth" in streamSettings and "toNumbers" in streamSettings and "fromNumber" in streamSettings:
                if streamSettings["sendText"] == True and startTcpStream == False:
                    msg = "Raspberry pi fishflix video lost connection to server"
                    sendText(streamSettings["msgAuth"][0], streamSettings["msgAuth"][1], streamSettings["toNumbers"], streamSettings["fromNumber"], msg)

            startTcpStream = True



def main(localIp):


    bitsPerSecond = streamSettings["kiloBitsPrSecond"] * 1000
    tcpStreamUrl = "tcp://" + str(localIp) + ":" + str(streamSettings["tcpPort"])

    threading.Thread(target=start_TCP, args=(tcpStreamUrl, streamSettings["res"], streamSettings["fps"], bitsPerSecond, streamSettings["printFrame"])).start() # RUNS THE TCP STREAM IN A SEPERATE THREAD
    time.sleep(3) # WAITS FOR THE TCP STREAM TO START
    threading.Thread(target=tcp_to_rtmp, args=(tcpStreamUrl, streamSettings["rtmpUrl"], streamSettings["rtmpKey"], streamSettings["log-ffmpeg"], bitsPerSecond, streamSettings["fps"])).start()


if __name__ == "__main__":
    main("192.168.10.19")
