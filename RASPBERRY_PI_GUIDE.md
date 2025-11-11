# 🎥 Raspberry Pi Dashboard Display Setup

This guide will help you set up your Raspberry Pi to automatically display your DauphinDash on a projector every morning.

---

## 📋 **What You Need**

- Raspberry Pi (3, 4, or 5)
- Projector connected via HDMI
- Raspberry Pi OS installed
- Internet connection (for GitHub Pages version)

---

## 🚀 **Quick Setup**

### **1. Install Required Software**

```bash
# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Chromium browser (if not installed)
sudo apt-get install chromium-browser -y

# Install HDMI-CEC tools (to control projector)
sudo apt-get install cec-utils -y

# Install unclutter (hides mouse cursor)
sudo apt-get install unclutter -y
```

---

### **2. Copy the Startup Script**

On your Raspberry Pi:

```bash
# Create the script
nano ~/dauphin-dash-start.sh
```

Copy the contents from `raspberry-pi-setup.sh` in this repo, then:

```bash
# Make it executable
chmod +x ~/dauphin-dash-start.sh
```

---

### **3. Test the Script**

```bash
# Run it manually to test
~/dauphin-dash-start.sh
```

Your projector should turn on and display the dashboard in fullscreen!

---

### **4. Auto-Start on Boot (Option A: Desktop Autostart)**

If using Raspberry Pi Desktop:

```bash
# Create autostart directory
mkdir -p ~/.config/autostart

# Create autostart entry
nano ~/.config/autostart/dauphin-dashboard.desktop
```

Add this content:

```ini
[Desktop Entry]
Type=Application
Name=DauphinDash
Exec=/home/pi/dauphin-dash-start.sh
X-GNOME-Autostart-enabled=true
```

---

### **5. Auto-Start on Boot (Option B: Cron @reboot)**

```bash
# Edit crontab
crontab -e
```

Add this line:

```bash
@reboot sleep 30 && DISPLAY=:0 /home/pi/dauphin-dash-start.sh
```

---

### **6. Schedule Morning Display (Optional)**

If you want it to turn on at a specific time every morning:

```bash
# Edit crontab
crontab -e
```

Add these lines:

```bash
# Turn on dashboard at 7:00 AM every day
0 7 * * * DISPLAY=:0 /home/pi/dauphin-dash-start.sh

# Turn off display at 11:00 PM every day
0 23 * * * DISPLAY=:0 xset dpms force off && echo 'standby 0' | cec-client -s -d 1
```

---

## 🎨 **Display Options**

### **A. GitHub Pages (Recommended)**

Your dashboard is already deployed at:
```
https://jonathanplas.github.io/dauphindash/
```

**Pros:**
- Always up-to-date
- No local file management
- Syncs with Supabase

**Cons:**
- Requires internet connection

### **B. Local Files**

Clone the repo on your Pi:

```bash
cd ~
git clone https://github.com/Jonathanplas/dauphindash.git
```

Update the script to use:
```bash
chromium-browser --kiosk "file:///home/pi/dauphindash/index.html"
```

**Pros:**
- Works offline
- Faster load time

**Cons:**
- Need to manually update with `git pull`

---

## 🔧 **Projector Control Options**

### **Option 1: HDMI-CEC (Easiest)**

Test if your projector supports CEC:

```bash
echo 'scan' | cec-client -s -d 1
```

Turn on/off:
```bash
# Turn on
echo 'on 0' | cec-client -s -d 1

# Turn off (standby)
echo 'standby 0' | cec-client -s -d 1
```

### **Option 2: Smart Plug**

Use a Wi-Fi smart plug (TP-Link Kasa, Wemo, etc.)

Example with Kasa:
```bash
# Install kasa-cli
pip3 install python-kasa

# Turn on
kasa --host 192.168.1.XXX on

# Turn off
kasa --host 192.168.1.XXX off
```

### **Option 3: IR Remote (Advanced)**

Requires USB IR transmitter and LIRC setup.

---

## 🎯 **Advanced Features**

### **Auto-Refresh Every Hour**

Ensure data stays fresh:

```bash
# Add to crontab
0 * * * * DISPLAY=:0 xdotool key F5
```

(Requires: `sudo apt-get install xdotool`)

### **Hide Mouse Cursor**

Already installed unclutter above. Add to startup script:

```bash
unclutter -idle 0 &
```

### **Disable Power Management**

Prevent screen from sleeping:

```bash
# Add to /etc/xdg/lxsession/LXDE-pi/autostart
@xset s off
@xset -dpms
@xset s noblank
```

### **Rotate Display** (if projector is mounted sideways)

```bash
# Add to startup script
xrandr --output HDMI-1 --rotate left
```

---

## 📱 **Remote Control (Bonus)**

### **Via SSH**

```bash
# Refresh the dashboard
ssh pi@raspberrypi.local "DISPLAY=:0 xdotool key F5"

# Turn off display
ssh pi@raspberrypi.local "DISPLAY=:0 xset dpms force off"
```

### **Via Web Interface**

Install a simple web server to control the Pi:

```bash
sudo apt-get install nginx
```

Create control endpoints for on/off commands.

---

## 🔍 **Troubleshooting**

### **Dashboard doesn't load**
```bash
# Check if Chromium is running
ps aux | grep chromium

# Check internet connection
ping google.com
```

### **Projector doesn't turn on**
```bash
# Check CEC connection
echo 'scan' | cec-client -s -d 1

# Check HDMI cable
tvservice -s
```

### **Display sleeps**
```bash
# Verify power management is disabled
xset q
```

### **Cron job not running**
```bash
# Check cron logs
grep CRON /var/log/syslog

# Make sure DISPLAY is set
echo $DISPLAY
```

---

## 📅 **Example Daily Schedule**

```bash
# Edit crontab: crontab -e

# 7:00 AM - Turn on and show dashboard
0 7 * * * DISPLAY=:0 /home/pi/dauphin-dash-start.sh

# Every hour - Refresh page
0 * * * * DISPLAY=:0 xdotool key F5

# 11:00 PM - Turn off display
0 23 * * * DISPLAY=:0 xset dpms force off && echo 'standby 0' | cec-client -s -d 1

# 11:05 PM - Kill Chromium to save resources
5 23 * * * killall chromium-browser
```

---

## ✅ **Final Checklist**

- [ ] Raspberry Pi connected to projector via HDMI
- [ ] Internet connection (if using GitHub Pages)
- [ ] Script copied and made executable
- [ ] Tested manually
- [ ] Autostart configured (desktop or cron)
- [ ] Morning schedule set up (optional)
- [ ] Projector control method chosen and tested

---

## 🎉 **You're Done!**

Now every morning at 7 AM, your projector will turn on and display your progress dashboard automatically!

**Pro tip:** Sign in to your dashboard once on the Pi so your session persists, and your data will automatically sync from Supabase.
