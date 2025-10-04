#!/bin/bash

# kill_port_3001.sh
# Find and kill the process using port 3001

PORT=3001

PID=$(sudo lsof -t -iTCP:$PORT -sTCP:LISTEN)

if [ -z "$PID" ]; then
  echo "✅ No process found running on port $PORT"
  exit 0
fi

echo "⚠️  Found process $PID running on port $PORT"
ps -p $PID -o pid,user,comm,args

# Try graceful kill first
sudo kill $PID

# Wait briefly
sleep 2

# If still alive, force kill
if ps -p $PID > /dev/null; then
  echo "Process still running. Forcing kill..."
  sudo kill -9 $PID
else
  echo "✅ Process terminated."
fi