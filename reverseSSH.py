import subprocess
import time
import os


"""
THIS SCRIPT IS RUN AS A CRONTAB INSIDE THE RASPBERRY PI
"""

parentFoler = os.path.dirname(os.path.abspath(__file__))
ERROR_PATH = os.path.join(parentFoler + "logs/reversSSH.txt")
PORT = 20001


# WORK IN PROGRESS
def generateKeyAndSendIt(username, server_address, key_path='~/.ssh/id_rsa'):
    # Generate an SSH key pair
    key_path = os.path.expanduser(key_path)
    ssh_dir = os.path.dirname(key_path)
    if not os.path.exists(ssh_dir):
        print(f"Creating directory {ssh_dir}")
        os.makedirs(ssh_dir, exist_ok=True)

    try:
        subprocess.run(['ssh-keygen', '-t', 'rsa', '-b', '4096', '-f', key_path, '-N', ''], check=True)
        print(f"SSH key pair generated at {key_path} and {key_path}.pub")
    except subprocess.CalledProcessError as e:
        print("Failed to generate SSH key pair:", e)
        return

    # Copy the public key to the server
    try:
        subprocess.run(['ssh-copy-id', f"{username}@{server_address}"], check=True)
        print("SSH public key successfully copied to server.")
    except subprocess.CalledProcessError as e:
        print("Failed to copy SSH public key to server:", e)
        return

    # Test SSH key authentication
    try:
        result = subprocess.run(['ssh', '-i', key_path, f"{username}@{server_address}", 'echo', 'SSH key authentication successful'], check=True, capture_output=True)
        print(result.stdout.decode())
    except subprocess.CalledProcessError as e:
        print("SSH key authentication test failed:", e)





def writeError(path, text):
    try:
        if os.path.isdir("./logs"):
            with open(path, 'a') as f:
                f.write(text)
        else:
            print("reverseSSH:   Logs folder dosent exist!")
    except Exception as error:
        print(f"reverseSSH:   There was a critical error while writing error log file!: {error}")

def createTunnel():
    command = ["ssh","-N", "-R", f"{PORT}:localhost:22", "-o", "ServerAliveInterval=15", "troll@ip.duerfyringsvakt.com"]
    return subprocess.Popen(command)


def checkTunnel(tunnel):
    """Check if tunnel process is still running."""
    if tunnel.poll() is None:
        return True  # Tunnel is up
    else:
        return False  # Tunnel is down

def main():
    try:
        tunnel = createTunnel()
        while True:
            if not checkTunnel(tunnel):
                print("reverseSSH:   Tunnel dropped. Reconnecting...")
                writeError(ERROR_PATH, f"\n Tunnel dropped, Reconnecting \n")

                tunnel = createTunnel()
            time.sleep(5) 

    except Exception as error:
        print(f"reverseSSH:   There was a critical error inside setting up revser ssh: {error}")
        writeError(ERROR_PATH, f"\n There was a critical error inside setting up revser ssh: {error} \n")



if __name__ == "__main__":
    #generateKeyAndSendIt("troll", "ip.duerfyringsvakt.com")
    main()
