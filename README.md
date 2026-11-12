# FarmerConnect 🌾

A smart farm management mobile app built with **React Native (Expo)** + **Firebase**.  
Monitor live sensor data, control your water pump remotely, and view historical readings — all from your phone.

---

## 📋 Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (`npm install -g expo-cli`)
- A Firebase project (free Spark tier is fine)
- Expo Go app on your phone, or an Android/iOS emulator

---

## 🚀 Quick Start

### 1. Install dependencies

```bash
cd "tech for Good Hardware/APP"
npm install
```

### 2. Set up Firebase

#### a. Create a Firebase project
1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → give it a name → click through the wizard
3. In your project, click the **`</>`** (Web) icon to register a web app
4. Copy the `firebaseConfig` object shown

#### b. Enable Authentication
1. In Firebase Console → **Authentication** → **Sign-in method**
2. Enable **Email/Password**

#### c. Enable Realtime Database
1. In Firebase Console → **Realtime Database** → **Create database**
2. Choose a region, start in **test mode** initially (then apply the rules below)

### 3. Add your Firebase config

Open `src/firebase/config.ts` and replace the placeholder values:

```ts
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef",
};
```

### 4. Apply Firebase Security Rules

In Firebase Console → **Realtime Database** → **Rules**, paste:

```json
{
  "rules": {
    "sensors": {
      "latest": {
        ".read": "auth != null",
        ".write": false
      },
      "history": {
        ".read": "auth != null",
        ".write": false
      }
    },
    "pump": {
      "status": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    }
  }
}
```

> **Note:** The `sensors` paths are write-protected in the app — only your hardware device should write to them. If you need the app to test-write sensor data, temporarily change `".write": false` to `".write": "auth != null"`.

---

## 🗄️ Firebase Realtime Database Structure

Your hardware device (Arduino / Raspberry Pi / ESP32, etc.) must write data in this exact JSON structure:

```json
{
  "pump": {
    "status": {
      "isOn": false,
      "lastChanged": 1700000000000,
      "changedBy": "user@example.com"
    }
  },
  "sensors": {
    "latest": {
      "soilMoisture": 65.2,
      "temperature": 28.5,
      "humidity": 72.1,
      "waterFlow": 12.3,
      "timestamp": 1700000000000
    },
    "history": {
      "-NxABC123": {
        "soilMoisture": 65.2,
        "temperature": 28.5,
        "humidity": 72.1,
        "waterFlow": 12.3,
        "timestamp": 1700000000000
      },
      "-NxDEF456": {
        "soilMoisture": 60.0,
        "temperature": 29.1,
        "humidity": 70.5,
        "waterFlow": 11.8,
        "timestamp": 1700003600000
      }
    }
  },
  "users": {
    "USER_UID_HERE": {
      "displayName": "Ravi Kumar",
      "farmName": "Green Valley Farm",
      "email": "ravi@example.com"
    }
  }
}
```

### Hardware write example (Python + pyrebase / firebase-admin):

```python
import firebase_admin
from firebase_admin import credentials, db
import time

cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://YOUR_PROJECT-default-rtdb.firebaseio.com'
})

def push_sensor_reading(soil_moisture, temperature, humidity, water_flow):
    ts = int(time.time() * 1000)   # milliseconds
    data = {
        "soilMoisture": soil_moisture,
        "temperature":  temperature,
        "humidity":     humidity,
        "waterFlow":    water_flow,
        "timestamp":    ts,
    }
    # Update latest
    db.reference("sensors/latest").set(data)
    # Append to history
    db.reference("sensors/history").push(data)

def read_pump_status():
    return db.reference("pump/status").get()

# Example loop
while True:
    reading = read_sensor_hardware()   # your sensor reading function
    push_sensor_reading(*reading)
    pump = read_pump_status()
    control_pump(pump["isOn"])         # your hardware relay function
    time.sleep(30)
```

---

## ▶️ Running the App

```bash
# Start Expo development server
npx expo start

# Then:
#  - Press 'a' to open on Android emulator
#  - Press 'i' to open on iOS simulator
#  - Scan the QR code with Expo Go on your phone
```

---

## 📁 Project Structure

```
APP/
├── App.tsx                          # Root component
├── app.json                         # Expo config
├── babel.config.js
├── package.json
├── tsconfig.json
└── src/
    ├── firebase/
    │   └── config.ts                # 🔑 Firebase setup (edit this!)
    ├── context/
    │   └── AuthContext.tsx          # Auth state & actions
    ├── navigation/
    │   ├── AppNavigator.tsx         # Root navigator
    │   ├── AuthStack.tsx            # Login / Register stack
    │   └── MainTabs.tsx             # Bottom tab navigator
    ├── screens/
    │   ├── auth/
    │   │   ├── LoginScreen.tsx
    │   │   └── RegisterScreen.tsx
    │   ├── dashboard/
    │   │   └── DashboardScreen.tsx  # Live sensors + pump control
    │   ├── history/
    │   │   └── HistoryScreen.tsx    # Charts + reading list
    │   └── profile/
    │       └── ProfileScreen.tsx    # User info + sign out
    ├── types/
    │   └── index.ts                 # TypeScript interfaces
    └── utils/
        └── helpers.ts               # Format helpers
```

---

## 🎨 Color Scheme

| Color | Hex | Usage |
|-------|-----|-------|
| Dark Green | `#2E7D32` | Primary, headers |
| Medium Green | `#388E3C` | Secondary |
| Light Green | `#81C784` | Gradient end |
| Pale Green | `#C8E6C9` | Backgrounds |

---

## 🛠️ Tech Stack

| Library | Version | Purpose |
|---------|---------|---------|
| Expo | ~50.0.0 | Managed workflow |
| React Native | 0.73.2 | Mobile framework |
| Firebase JS SDK | ^10.7.0 | Auth + Realtime DB |
| React Navigation | ^6.x | Navigation |
| react-native-paper | ^5.11.6 | Material UI |
| expo-linear-gradient | ~12.7.0 | Gradient backgrounds |
| react-native-chart-kit | ^6.12.0 | Sensor charts |

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Firebase: Error (auth/invalid-api-key)" | Check `src/firebase/config.ts` values |
| Charts not rendering | Ensure `react-native-svg` is installed |
| Sensor data not showing | Verify DB path `sensors/latest` exists and rules allow read |
| Pump toggle not working | Verify DB path `pump/status` exists and rules allow write |
| App crashes on start | Run `npx expo start --clear` to clear cache |
