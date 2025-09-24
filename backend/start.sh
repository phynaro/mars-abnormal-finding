#!/bin/sh

# Start the backend server in background
echo "Starting backend server..."
npm start &

# Wait a moment for the server to start
sleep 5

# Start ngrok tunnel
echo "Starting ngrok tunnel..."
ngrok http 3001 --log=stdout
