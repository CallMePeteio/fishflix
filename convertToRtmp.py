
import subprocess
import threading
import json
import time


def start_TCP(url, res, fps):
    videoCommand = f'rpicam-vid -t 0 --libav-format mpegts --width {res[0]} --height {res[1]} --framerate {fps} --listen -o "{url}?listen=1"'
    process = subprocess.run(videoCommand, shell=True, check=True) # RUNS THE COMMAND

def tcp_to_rtmp(tcp_url, rtmp_url, rtmp_key):
    """
    Converts a TCP stream to an RTMP stream using FFmpeg.

    Parameters:
    tcp_url (str): The source TCP stream URL.
    rtmp_url (str): The destination RTMP server URL.
    rtmp_key (str): The stream key for the RTMP server.
    """
    full_rtmp_url = f"{rtmp_url}/{rtmp_key}"

    # FFmpeg command to capture the TCP stream and push it to an RTMP endpoint
    command = [
        'ffmpeg',
        '-i', tcp_url,  # Input from the TCP stream
        '-c', 'copy',   # Copy the stream without re-encoding
        '-f', 'flv',    # Format for the RTMP stream
        full_rtmp_url   # Output RTMP URL
    ]

    err = subprocess.run(command, stderr=subprocess.PIPE, text=True)  # Execute the FFmpeg command

    if err.returncode != 0: # IF IT WAS UNSUCSESSFULL
        print("\n \n Returnd an error")
        print(f"{err.stderr} \n \n")
        raise Exception("Error converting TCP to RTMP. Check rtmpUrl and keys and that the tcp stream is running")


with open('./config.json') as f:
  streamSettings = json.load(f)

threading.Thread(target=start_TCP, args=(streamSettings["tcpUrl"], streamSettings["res"], streamSettings["fps"])).start() # RUNS THE TCP STREAM IN A SEPERATE THREAD
time.sleep(3) # WAITS FOR THE TCP STREAM TO START
tcp_to_rtmp(streamSettings["tcpUrl"], streamSettings["rtmpUrl"], streamSettings["rtmpKey"]) # STARTS STREAMING TO THE SERVER


