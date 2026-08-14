# 💖 Love-Verse Frontend 🌌

<div align="center">

![Love-Verse Banner](https://img.shields.io/badge/Love--Verse-Couple%20Workspace-ff4081?style=for-the-badge&logo=heart)

**The Ultimate Real-Time Digital Sanctuary & Interactive Workspace for Couples**

[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7.3-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4.2-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Capacitor](https://img.shields.io/badge/Capacitor-v8.3-119EFF?style=flat-square&logo=capacitor)](https://capacitorjs.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-v4.8-010101?style=flat-square&logo=socketdotio)](https://socket.io/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[Live Demo](https://love-verse-frontend.vercel.app) • [Backend Repo](https://github.com/Singhkunall/love-verse-backend) • [Report Issue](https://github.com/Singhkunall/love-verse-frontend/issues)

</div>

---

## 🌟 Overview

**Love-Verse Frontend** is a feature-rich, beautiful, and highly interactive client web & mobile app crafted specifically for long-distance and co-located couples. Built with **React 19**, **Vite**, **Tailwind CSS v4**, and **Capacitor**, it enables seamless real-time communication, synchronized media playback, multiplayer games, memory pinning, shared daily routines, live location tracking, and joint wishlist management.

---

| Category | Features Included |
| :--- | :--- |
| 🤖 **LoveVerse AI Assistant** | AI Date Night Generator, AI Love Letter & Poem Writer, and Deep Connection Icebreaker Prompts. |
| ❓ **Couple Quiz Arcade** | 1v1 multiplayer trivia battle ("How Well Do You Know Me?") with secret reveals & live score sync. |
| 🌌 **Ambient Date Room** | Web audio soundscapes (Cozy Rain 🌧️, Campfire 🔥, Ocean Waves 🌊, Cafe ☕) + romantic quote generator. |
| 💬 **Real-time Chat & Nudges** | Instant messaging, image previews, typing indicators, floating heart animations, and instant love nudges/hugs. |
| 📞 **Voice & Video Calling** | HD 1-on-1 audio & video calls powered by **PeerJS WebRTC** & **Agora RTC SDK**. |
| 🎮 **Couple Arcade** | Real-time interactive games: ♟️ **Chess**, 🎲 **Ludo**, 🧠 **Memory Pairs**, ⚡ **Fastest Finger**, ⌨️ **Typing Race**, 🎡 **Love Roulette**, and ❓ **Couple Quiz**. |
| 📺 **Watch Together** | Synchronized YouTube player with live play, pause, seek, and URL synchronization across partner screens. |
| 🌍 **Universe Memory Map** | Interactive world map powered by **Leaflet** to pin special memories, date spots, and romantic landmarks. |
| 🎁 **Shared Wishlist & Search** | Amazon product scraper, custom wishlist manager, priority tags, and integrated **Razorpay** checkout. |
| 🎙️ **Voice Notes** | Studio-style voice message recorder with waveform preview, playback, and reaction emojis. |
| 📅 **Calendar & Routines** | Synchronized couple calendar for anniversaries and dates + daily habits and task checklist sync. |
| 📍 **Live Location Sharing** | Real-time map location updates for staying connected across distances. |
| 📱 **Mobile Native Ready** | Android app support built-in via **Capacitor 8**. |

---

## 🛠️ Tech Stack & Dependencies

- **Core Framework**: [React 19](https://react.dev/) + [Vite 7](https://vitejs.dev/)
- **Styling & Animations**: [Tailwind CSS v4](https://tailwindcss.com/), [Framer Motion 12](https://www.framer.com/motion/), [Lucide Icons](https://lucide.dev/), [React Confetti](https://github.com/uicardcode/react-confetti)
- **Real-Time Communication**: `socket.io-client`, `peerjs`, `agora-rtc-sdk-ng`
- **Maps & Location**: `leaflet`, `react-leaflet`
- **Interactive Media & Games**: `chess.js`, `react-chessboard`, `react-player`, `emoji-picker-react`, `three`
- **Auth & API**: `@react-oauth/google`, `axios`, `react-router-dom v7`
- **Mobile Runtime**: `@capacitor/core`, `@capacitor/android`, `@capacitor/browser`

---

## 📁 Repository Structure

```text
frontend/
├── android/                   # Native Android project configuration (Capacitor)
├── public/                    # Static public assets
├── src/
│   ├── assets/                # App graphics, icons, and SVG illustrations
│   ├── components/            # Reusable UI components & Game modules
│   │   ├── Calendar.jsx       # Synchronized couple calendar
│   │   ├── ChessGame.jsx      # Real-time multiplayer chess
│   │   ├── FastFinger.jsx     # Reaction time mini-game
│   │   ├── FloatingHearts.jsx # Interactive heart animation overlay
│   │   ├── LocationMap.jsx    # Live location tracker map
│   │   ├── LoveRoulette.jsx   # Date activity spinner wheel
│   │   ├── Ludo.jsx           # Synchronized 2-player Ludo board
│   │   ├── MemoryPairs.jsx    # Memory card flip game
│   │   ├── Routine.jsx        # Shared daily habit & task tracker
│   │   ├── Sidebar.jsx        # Navigation sidebar & status panel
│   │   ├── TypingRace.jsx     # Real-time typing speed match
│   │   ├── UniverseMap.jsx    # Interactive memory map pins
│   │   ├── VoiceNotes.jsx     # Voice note player & recorder
│   │   ├── WatchTogether.jsx  # Sync YouTube video player
│   │   └── Wishlist.jsx       # Couple wishlist & shopping search
│   ├── pages/                 # Full-page views
│   │   ├── AuthCallback.jsx   # OAuth redirect handler
│   │   ├── Dashboard.jsx      # Main application hub
│   │   ├── Login.jsx          # User login screen
│   │   └── Register.jsx       # Account registration & pairing
│   ├── App.jsx                # Main application routes & Toast provider
│   ├── main.jsx               # React DOM entrypoint
│   └── index.css              # Global design system & Tailwind styling
├── capacitor.config.json      # Capacitor native configuration
├── vite.config.js             # Vite build settings
└── package.json               # Frontend dependencies & scripts
```

---

## ⚡ Getting Started

### Prerequisites
- **Node.js**: `v18.x` or higher
- **npm**: `v9.x` or higher
- Running instance of the **Love-Verse Backend**

### 1. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/Singhkunall/love-verse-frontend.git
cd love-verse-frontend
npm install
```

### 2. Environment Setup

Create a `.env` file in the `frontend` root directory:

```env
VITE_BACKEND_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
```

### 3. Running Development Server

Start the local dev server:

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 📱 Mobile App Build (Android via Capacitor)

To build the native Android application:

1. Build the production web bundle:
   ```bash
   npm run build
   ```

2. Copy the web assets to the native Android directory:
   ```bash
   npx cap copy android
   ```

3. Open Android Studio:
   ```bash
   npx cap open android
   ```

4. Build the APK inside Android Studio.

---

## 🔗 Related Repositories

- ⚙️ **Backend**: [love-verse-backend](https://github.com/Singhkunall/love-verse-backend)

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

<div align="center">

Made with ❤️ by [Kunal Singh](https://github.com/Singhkunall)

</div>
