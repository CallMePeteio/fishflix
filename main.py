








# RUNS THE STARTUP SCRIPTS:
import startup
localIp = startup.main()

# RUNS THE SCRIPT THAT SENDS THE VIDEO:
import sendStream
sendStream.main(localIp)

# RUNS THE SCRIPT THAT MAINTAINS THE RPI. FOREXAMPLE UPDATES WAN IP WHEN UPDATED
import maintain
maintain.main("", "")

# RUNS THE SCRIPT THAT SENDS THE DATA (BLOCKING)
import sendData 
