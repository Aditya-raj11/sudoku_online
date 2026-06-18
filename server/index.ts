import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { generatePuzzle, type Difficulty } from './sudoku-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// ========== Types ==========

interface Player {
  id: string;
  name: string;
  color: string;
  score: number;
  cursor: { row: number; col: number } | null;
  isHost: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
}

interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  playerColor: string;
  text: string;
  timestamp: number;
  isSystem: boolean;
}

interface Room {
  code: string;
  difficulty: Difficulty;
  puzzle: number[][];
  solution: number[][];
  board: number[][]; // current state (values placed by players)
  players: Map<string, Player>;
  chat: ChatMessage[];
  timer: number;
  timerInterval: ReturnType<typeof setInterval> | null;
  isComplete: boolean;
  createdAt: number;
}

// ========== State ==========

const rooms = new Map<string, Room>();
const PLAYER_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6'];
const MAX_PLAYERS = 5;

// ========== Helpers ==========

function generateRoomCode(): string {
  let code: string;
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
  } while (rooms.has(code));
  return code;
}

function getNextColor(room: Room): string {
  const usedColors = new Set([...room.players.values()].map(p => p.color));
  return PLAYER_COLORS.find(c => !usedColors.has(c)) || PLAYER_COLORS[0];
}

function broadcastPlayerList(room: Room) {
  const playerList = [...room.players.values()].map(p => ({
    id: p.id,
    name: p.name,
    color: p.color,
    score: p.score,
    cursor: p.cursor,
    isHost: p.isHost,
    isMuted: p.isMuted,
    isVideoOff: p.isVideoOff,
  }));
  io.to(room.code).emit('players-updated', playerList);
}

function startTimer(room: Room) {
  if (room.timerInterval) return;
  room.timerInterval = setInterval(() => {
    room.timer++;
    io.to(room.code).emit('timer-tick', room.timer);
  }, 1000);
}

function stopTimer(room: Room) {
  if (room.timerInterval) {
    clearInterval(room.timerInterval);
    room.timerInterval = null;
  }
}

function checkComplete(room: Room): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (room.board[r][c] !== room.solution[r][c]) return false;
    }
  }
  return true;
}

function addSystemMessage(room: Room, text: string) {
  const msg: ChatMessage = {
    id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    playerId: 'system',
    playerName: 'System',
    playerColor: '#94a3b3',
    text,
    timestamp: Date.now(),
    isSystem: true,
  };
  room.chat.push(msg);
  io.to(room.code).emit('chat-broadcast', msg);
}

// Clean up empty rooms periodically
setInterval(() => {
  for (const [code, room] of rooms) {
    if (room.players.size === 0 && Date.now() - room.createdAt > 60000) {
      stopTimer(room);
      rooms.delete(code);
      console.log(`[Cleanup] Deleted empty room ${code}`);
    }
  }
}, 30000);

// ========== Socket.IO ==========

io.on('connection', (socket) => {
  console.log(`[Connect] ${socket.id}`);
  let currentRoom: string | null = null;

  // ---------- Create Room ----------
  socket.on('create-room', (data: { playerName: string; difficulty: Difficulty }) => {
    const code = generateRoomCode();
    const { puzzle, solution } = generatePuzzle(data.difficulty);

    // Initial board = puzzle (given cells filled, rest 0)
    const board = puzzle.map(row => [...row]);

    const room: Room = {
      code,
      difficulty: data.difficulty,
      puzzle,
      solution,
      board,
      players: new Map(),
      chat: [],
      timer: 0,
      timerInterval: null,
      isComplete: false,
      createdAt: Date.now(),
    };

    const player: Player = {
      id: socket.id,
      name: data.playerName,
      color: PLAYER_COLORS[0],
      score: 0,
      cursor: null,
      isHost: true,
      isMuted: true,
      isVideoOff: true,
    };

    room.players.set(socket.id, player);
    rooms.set(code, room);
    currentRoom = code;

    socket.join(code);
    startTimer(room);

    socket.emit('room-created', {
      roomCode: code,
      puzzle,
      solution,
      board,
      difficulty: data.difficulty,
      playerId: socket.id,
      players: [{ id: player.id, name: player.name, color: player.color, score: 0, cursor: null, isHost: true, isMuted: false, isVideoOff: false }],
    });

    addSystemMessage(room, `${data.playerName} created the room`);
    console.log(`[Room] ${data.playerName} created room ${code} (${data.difficulty})`);
  });

  // ---------- Join Room ----------
  socket.on('join-room', (data: { roomCode: string; playerName: string }) => {
    const room = rooms.get(data.roomCode);
    if (!room) {
      socket.emit('join-error', { message: 'Room not found. Check the code and try again.' });
      return;
    }
    if (room.players.size >= MAX_PLAYERS) {
      socket.emit('join-error', { message: 'Room is full (max 5 players).' });
      return;
    }
    if (room.isComplete) {
      socket.emit('join-error', { message: 'This game has already been completed.' });
      return;
    }

    const player: Player = {
      id: socket.id,
      name: data.playerName,
      color: getNextColor(room),
      score: 0,
      cursor: null,
      isHost: false,
      isMuted: true,
      isVideoOff: true,
    };

    room.players.set(socket.id, player);
    currentRoom = data.roomCode;

    socket.join(data.roomCode);

    socket.emit('room-joined', {
      roomCode: data.roomCode,
      puzzle: room.puzzle,
      solution: room.solution,
      board: room.board,
      difficulty: room.difficulty,
      playerId: socket.id,
      timer: room.timer,
      players: [...room.players.values()].map(p => ({
        id: p.id, name: p.name, color: p.color, score: p.score, cursor: p.cursor, isHost: p.isHost, isMuted: p.isMuted, isVideoOff: p.isVideoOff,
      })),
      chat: room.chat,
    });

    broadcastPlayerList(room);
    addSystemMessage(room, `${data.playerName} joined the room`);

    // Notify existing players so they can initiate WebRTC
    socket.to(data.roomCode).emit('player-joined', {
      id: player.id,
      name: player.name,
      color: player.color,
    });

    console.log(`[Room] ${data.playerName} joined room ${data.roomCode} (${room.players.size}/${MAX_PLAYERS})`);
  });

  // ---------- Cell Update ----------
  socket.on('cell-update', (data: { row: number; col: number; value: number }) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room || room.isComplete) return;
    const player = room.players.get(socket.id);
    if (!player) return;

    const { row, col, value } = data;

    // Can't overwrite given cells
    if (room.puzzle[row][col] !== 0) return;

    const isCorrect = room.solution[row][col] === value;

    // Update board
    room.board[row][col] = value;

    if (isCorrect) {
      player.score += 10;
    }

    // Broadcast to all in room
    io.to(currentRoom).emit('board-updated', {
      row,
      col,
      value,
      playerId: socket.id,
      playerName: player.name,
      playerColor: player.color,
      isCorrect,
    });

    broadcastPlayerList(room);

    // Check if puzzle is complete
    if (isCorrect && checkComplete(room)) {
      room.isComplete = true;
      stopTimer(room);
      io.to(currentRoom).emit('game-won', {
        timer: room.timer,
        players: [...room.players.values()].map(p => ({
          id: p.id, name: p.name, color: p.color, score: p.score, isHost: p.isHost,
        })),
      });
      addSystemMessage(room, 'Puzzle completed! 🎉');
      console.log(`[Room] Room ${currentRoom} puzzle completed in ${room.timer}s`);
    }
  });

  // ---------- Cell Erase ----------
  socket.on('cell-erase', (data: { row: number; col: number }) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room || room.isComplete) return;

    const { row, col } = data;
    if (room.puzzle[row][col] !== 0) return; // can't erase given

    room.board[row][col] = 0;

    io.to(currentRoom).emit('cell-erased', {
      row,
      col,
      playerId: socket.id,
    });
  });

  // ---------- Cursor ----------
  socket.on('player-cursor', (data: { row: number; col: number } | null) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    const player = room.players.get(socket.id);
    if (!player) return;

    player.cursor = data;
    socket.to(currentRoom).emit('cursor-moved', {
      playerId: socket.id,
      cursor: data,
    });
  });

  // ---------- Chat ----------
  socket.on('chat-message', (data: { text: string }) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    const player = room.players.get(socket.id);
    if (!player) return;

    const msg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      playerId: socket.id,
      playerName: player.name,
      playerColor: player.color,
      text: data.text.slice(0, 500), // limit length
      timestamp: Date.now(),
      isSystem: false,
    };
    room.chat.push(msg);
    // Keep last 200 messages
    if (room.chat.length > 200) room.chat = room.chat.slice(-200);

    io.to(currentRoom).emit('chat-broadcast', msg);
  });

  // ---------- WebRTC Signaling ----------
  socket.on('join-call', () => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('player-joined-call', { playerId: socket.id });
  });

  socket.on('leave-call', () => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('player-left-call', { playerId: socket.id });
  });

  socket.on('update-media-state', (data: { isMuted: boolean; isVideoOff: boolean }) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    const player = room.players.get(socket.id);
    if (!player) return;

    player.isMuted = data.isMuted;
    player.isVideoOff = data.isVideoOff;

    broadcastPlayerList(room);
  });

  socket.on('webrtc-offer', (data: { targetId: string; offer: RTCSessionDescriptionInit }) => {
    io.to(data.targetId).emit('webrtc-offer', {
      senderId: socket.id,
      offer: data.offer,
    });
  });

  socket.on('webrtc-answer', (data: { targetId: string; answer: RTCSessionDescriptionInit }) => {
    io.to(data.targetId).emit('webrtc-answer', {
      senderId: socket.id,
      answer: data.answer,
    });
  });

  socket.on('webrtc-ice', (data: { targetId: string; candidate: RTCIceCandidateInit }) => {
    io.to(data.targetId).emit('webrtc-ice', {
      senderId: socket.id,
      candidate: data.candidate,
    });
  });

  // ---------- Leave Room ----------
  socket.on('leave-room', () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (room) {
      const player = room.players.get(socket.id);
      if (player) {
        const playerName = player.name;
        room.players.delete(socket.id);

        addSystemMessage(room, `${playerName} left the room`);

        // Notify others for WebRTC cleanup
        socket.to(currentRoom).emit('player-left', { playerId: socket.id });
        broadcastPlayerList(room);

        // If host left, assign new host
        if (player.isHost && room.players.size > 0) {
          const newHost = room.players.values().next().value;
          if (newHost) {
            newHost.isHost = true;
            broadcastPlayerList(room);
            addSystemMessage(room, `${newHost.name} is now the host`);
          }
        }

        // If room is empty, stop timer
        if (room.players.size === 0) {
          stopTimer(room);
        }

        console.log(`[Room] ${playerName} left room ${currentRoom} (${room.players.size}/${MAX_PLAYERS})`);
      }
      socket.leave(currentRoom);
    }
    currentRoom = null;
  });

  // ---------- Disconnect ----------
  socket.on('disconnect', () => {
    console.log(`[Disconnect] ${socket.id}`);
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    const player = room.players.get(socket.id);
    if (!player) return;

    const playerName = player.name;
    room.players.delete(socket.id);

    addSystemMessage(room, `${playerName} left the room`);

    // Notify others for WebRTC cleanup
    socket.to(currentRoom).emit('player-left', { playerId: socket.id });
    broadcastPlayerList(room);

    // If host left, assign new host
    if (player.isHost && room.players.size > 0) {
      const newHost = room.players.values().next().value;
      if (newHost) {
        newHost.isHost = true;
        broadcastPlayerList(room);
        addSystemMessage(room, `${newHost.name} is now the host`);
      }
    }

    // If room is empty, stop timer (cleanup will delete it later)
    if (room.players.size === 0) {
      stopTimer(room);
    }

    console.log(`[Room] ${playerName} left room ${currentRoom} (${room.players.size}/${MAX_PLAYERS})`);
  });
});

// ========== Health Check ==========
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', rooms: rooms.size });
});

// Serve static assets from client build in production
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Fallback all navigation requests to index.html for React Router SPA behavior
app.get('*', (req, res, next) => {
  if (req.path === '/health') return next();
  res.sendFile(path.join(distPath, 'index.html'));
});

// ========== Start ==========
const PORT = process.env.PORT || 3001;
httpServer.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`\n🎮 Sudoku Multiplayer Server running on http://localhost:${PORT}\n`);
});
