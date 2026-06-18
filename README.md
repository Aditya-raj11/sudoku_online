# 🎮 Sudoku Online - Multiplayer & Video Call

A modern, real-time multiplayer Sudoku game featuring live WebRTC video and audio chat, collaborative grid-solving, real-time cursor tracking, text chat, and a competitive scoreboard.

---

## ✨ Features

- **Real-Time Multiplayer:** Create private lobbies and play Sudoku collaboratively with up to 5 players.
- **WebRTC Video & Audio Call:** Integrated audio and video chat. Connect automatically to your teammates' streams upon joining a lobby. 
- **Privacy-First Camera Controls:** Toggle camera hardware off instantly to stop your camera feed and turn off your device's physical camera light.
- **Real-Time Cursor Tracking:** See other players' selected cells and inputs on the grid with distinct player colors in real time.
- **Live Text Chat:** Communicate with your team in the integrated chat room.
- **Scoreboard:** Earn points for correct answers and track the scoreboard to see who contributed the most to solving the puzzle.
- **Responsive Premium UI:** A beautiful, responsive glassmorphic interface that matches the classic Sudoku style, with support for mobile and desktop screens.

---

## 📂 Codebase Architecture & Directory Structure

Here is a breakdown of the key files and directory structure in this project:

```text
├── server/                         # Node.js Backend Server
│   ├── index.ts                    # Main Express, Socket.io, & WebRTC signaling server
│   ├── sudoku-engine.ts            # Sudoku generation & validation engine
│   ├── package.json                # Backend dependencies
│   └── tsconfig.json               # Backend TypeScript settings
│
├── src/                            # Frontend React Client
│   ├── main.tsx                    # React application entrypoint
│   ├── App.tsx                     # Main Router (Solo & Multiplayer routing)
│   ├── index.css                   # Global styles & design system
│   │
│   ├── pages/                      # Application Pages
│   │   ├── LobbyPage.tsx           # Multiplayer lobby (Create/Join rooms)
│   │   └── MultiplayerGamePage.tsx # Collaborative game UI & keyboard controls
│   │
│   ├── contexts/                   # Global React Contexts
│   │   └── MultiplayerContext.tsx  # Shared socket instance and message handlers
│   │
│   ├── hooks/                      # Custom React Hooks
│   │   ├── useWebRTC.ts            # Peer connection logic & media hardware controls
│   │   ├── useMultiplayerSudoku.ts # Multiplayer game state manager (score, board inputs)
│   │   ├── useSudoku.ts            # Local solo Sudoku game logic
│   │   └── useSocket.ts            # Singleton socket connection helper
│   │
│   └── components/                 # Reusable React UI Components
│       ├── SudokuBoard.tsx         # Solo game board
│       ├── GameControls.tsx        # Solo game numeric controls & notes
│       ├── Header.tsx              # Top navigation bar
│       ├── RulesModal.tsx          # How-to-play instruction modal
│       ├── SettingsModal.tsx       # Local user configurations
│       └── multiplayer/            # Multiplayer-Specific Components
│           ├── VideoPanel.tsx      # Video grid & mic/camera toggle buttons
│           ├── ChatPanel.tsx       # Live room text chat
│           ├── PlayerList.tsx      # Player list and scores panel
│           └── RoomHeader.tsx      # Room code sharing & copy action
│
├── vite.config.ts                  # Vite config (incl. basicSsl & socket proxy)
├── vercel.json                     # Vercel SPA routing rules
└── DEPLOYMENT.md                   # Step-by-step production hosting guide
```

---

## 🛠️ Technology Stack

- **Frontend:** React, TypeScript, Vite, Vanilla CSS.
- **Backend:** Node.js, Express, Socket.io.
- **Signaling & P2P:** WebRTC (STUN servers) for direct peer-to-peer video/audio streaming.

---

## 🚀 Local Development Setup

To run the project locally, follow these steps:

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed.

### 1. Run the Backend Server
```bash
cd server
npm install
npm run dev
```
The server will start running on `http://localhost:3001`.

### 2. Run the Frontend Client
Open a new terminal window at the project root and run:
```bash
npm install
npm run dev
```
The client will start running on `https://localhost:5173`. 
*(Note: HTTPS is used to allow secure camera/microphone WebRTC access in the browser).*

---

## 📦 Deployment

This project is optimized for deployment:
* **Frontend:** Works perfectly on **Vercel** or **Firebase Hosting**.
* **Backend:** Works perfectly on **Railway** or **Koyeb** (stateful servers).

For step-by-step instructions on deploying the application, please refer to the [DEPLOYMENT.md](DEPLOYMENT.md) file.
