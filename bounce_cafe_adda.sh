#!/bin/bash
# Combined PM2 + MySQL restart script
# Runs at low traffic hours (e.g. 2 AM IST)

LOG="/home/ubuntu/bounce_cafe_adda.log"
APP_NAME="cafe-adda-node-vers"

echo "===================================" >> "$LOG"
echo "Bounce started at $(date)" >> "$LOG"

# Stop app first
echo "Stopping PM2 app..." >> "$LOG"
pm2 stop "$APP_NAME" >> "$LOG" 2>&1

sleep 5

# Restart MySQL
echo "Restarting MySQL..." >> "$LOG"
sudo systemctl restart mysql >> "$LOG" 2>&1

sleep 10

# Start app
echo "Starting PM2 app..." >> "$LOG"
pm2 start npm --name "$APP_NAME" -- start >> "$LOG" 2>&1

pm2 save >> "$LOG" 2>&1

echo "Bounce completed at $(date)" >> "$LOG"

