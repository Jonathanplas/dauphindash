# 💻 MacBook Dashboard Display Setup

This guide will help you set up your old MacBook Pro to automatically wake at a scheduled time, display your DauphinDash in fullscreen, and then go back to sleep.

---

## 📋 **What You Need**

- MacBook Pro (2017 or newer)
- macOS installed
- Internet connection (for GitHub Pages version)
- Display/projector connected via HDMI

---

## 🚀 **Setup Steps**

### **1. Create the Startup Script**

Open Terminal and create the script:

```bash
nano ~/dauphin-dash-start.sh
```

Add this content:

```bash
#!/bin/bash
# DauphinDash Auto-Start Script for MacBook

# Wait for system to fully wake
sleep 5

# Prevent display sleep while dashboard is showing
caffeinate -d &
CAFFEINE_PID=$!

# Open dashboard in fullscreen (kiosk mode)
open -a "Google Chrome" --args --kiosk --app="https://jonathanplas.github.io/dauphindash/"

# Keep awake for 4 hours (14400 seconds)
# Adjust this duration as needed
sleep 14400

# Allow sleep again
kill $CAFFEINE_PID

# Close Chrome and sleep
osascript -e 'quit app "Google Chrome"'
pmset sleepnow
```

Make it executable:

```bash
chmod +x ~/dauphin-dash-start.sh
```

---

### **2. Schedule Automatic Wake Time**

Set your Mac to wake at 8:20 AM every day:

```bash
sudo pmset repeat wake MTWRFSU 08:20:00
```

**Note:** You'll need to enter your admin password.

**To verify the schedule:**

```bash
sudo pmset -g sched
```

**To cancel the wake schedule:**

```bash
sudo pmset repeat cancel
```

---

### **3. Create Launch Agent to Run Script on Wake**

Create the LaunchAgent directory if it doesn't exist:

```bash
mkdir -p ~/Library/LaunchAgents
```

Create the plist file:

```bash
nano ~/Library/LaunchAgents/com.dauphindash.wake.plist
```

Add this content (replace `jonathanplas` with your actual username if different):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.dauphindash.wake</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/jonathanplas/dauphin-dash-start.sh</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
```

Load the Launch Agent:

```bash
launchctl load ~/Library/LaunchAgents/com.dauphindash.wake.plist
```

---

## ⚙️ **System Preferences Setup**

### **Enable Power Nap (Optional)**

Go to **System Preferences → Battery → Power Adapter**:
- Enable "Wake for network access" (helps ensure reliable wake)

### **Prevent Auto-Sleep During Display**

The `caffeinate` command in the script handles this, but you can also:
- Go to **System Preferences → Battery**
- Set "Turn display off after" to a longer duration

---

## 🧪 **Testing**

### **Test the script manually:**

```bash
~/dauphin-dash-start.sh
```

The dashboard should open in fullscreen Chrome.

### **Test the wake schedule:**

1. Put your Mac to sleep
2. Wait for the scheduled wake time (8:20 AM)
3. Mac should wake and display the dashboard automatically

---

## 🔧 **Customization**

### **Change Wake Time**

To wake at a different time (e.g., 7:00 AM):

```bash
sudo pmset repeat wake MTWRFSU 07:00:00
```

### **Change Display Duration**

In `~/dauphin-dash-start.sh`, change the sleep duration:

```bash
# 2 hours = 7200 seconds
sleep 7200

# 6 hours = 21600 seconds
sleep 21600
```

### **Wake Only on Specific Days**

Examples:

```bash
# Weekdays only (M T W R F)
sudo pmset repeat wake MTWRF 08:20:00

# Weekends only (S U)
sudo pmset repeat wake SU 08:20:00

# Specific days (e.g., Monday, Wednesday, Friday)
sudo pmset repeat wake MWF 08:20:00
```

### **Use Safari Instead of Chrome**

Replace the Chrome line in the script with:

```bash
open -a "Safari" "https://jonathanplas.github.io/dauphindash/"
```

Then add fullscreen mode with AppleScript:

```bash
osascript -e 'tell application "Safari" to activate'
osascript -e 'tell application "System Events" to keystroke "f" using {control down, command down}'
```

---

## 🛑 **Stopping/Disabling**

### **Unload the Launch Agent:**

```bash
launchctl unload ~/Library/LaunchAgents/com.dauphindash.wake.plist
```

### **Cancel the wake schedule:**

```bash
sudo pmset repeat cancel
```

### **Remove the Launch Agent (permanently):**

```bash
launchctl unload ~/Library/LaunchAgents/com.dauphindash.wake.plist
rm ~/Library/LaunchAgents/com.dauphindash.wake.plist
```

---

## 🐛 **Troubleshooting**

### **Mac doesn't wake at scheduled time:**

- Check if the schedule is set: `sudo pmset -g sched`
- Ensure "Wake for network access" is enabled in Battery settings
- Make sure the lid is closed or external display is connected
- Try disabling and re-enabling the schedule

### **Script doesn't run on wake:**

- Check if Launch Agent is loaded: `launchctl list | grep dauphindash`
- Verify the path in the plist file matches your username
- Check Console.app for errors (search for "dauphindash")

### **Chrome doesn't open in fullscreen:**

- Test the script manually to see the error
- Make sure Chrome is installed (or change to Safari)
- Try using the full path: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`

### **Mac goes to sleep too quickly:**

- Increase the sleep duration in the script
- Check Battery settings for auto-sleep timers

---

## 📝 **Notes**

- The MacBook will remain awake for 4 hours (default), then automatically sleep
- You can manually wake the Mac anytime to use it normally
- The script only runs when the Mac wakes from the scheduled wake time
- Chrome will run in kiosk mode with no toolbars or address bar

---

## 🎯 **Quick Reference**

**Wake at 8:20 AM every day:**
```bash
sudo pmset repeat wake MTWRFSU 08:20:00
```

**Test the script:**
```bash
~/dauphin-dash-start.sh
```

**Check wake schedule:**
```bash
sudo pmset -g sched
```

**View Launch Agent status:**
```bash
launchctl list | grep dauphindash
```
