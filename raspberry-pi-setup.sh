#!/bin/bash
# DauphinDash Auto-Start Script for Raspberry Pi
# Place this at: ~/dauphin-dash-start.sh

# 1. Turn on projector (choose method below)

# Method A: HDMI-CEC
echo 'on 0' | cec-client -s -d 1

# Method B: Smart Plug (example with TP-Link Kasa)
# kasa --host 192.168.1.XXX on

# Method C: IR remote (if using LIRC)
# irsend SEND_ONCE projector KEY_POWER

# 2. Wait for projector to warm up
sleep 10

# 3. Set display to turn on
xset dpms force on

# 4. Disable screensaver
xset s off
xset -dpms
xset s noblank

# 5. Open dashboard in fullscreen Chromium (kiosk mode)
# Replace with your GitHub Pages URL
chromium-browser --kiosk --noerrdialogs --disable-infobars --incognito \
  --disable-session-crashed-bubble --disable-restore-session-state \
  "https://jonathanplas.github.io/dauphindash/" &

# Note: If running locally, use:
# chromium-browser --kiosk --noerrdialogs --disable-infobars \
#   "file:///home/pi/dauphindash/index.html" &
