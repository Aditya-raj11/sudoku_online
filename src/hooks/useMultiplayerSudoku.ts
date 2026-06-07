import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from './useSocket';
import type { Difficulty } from '../engine/types';

// ========== Multiplayer Types ==========

export interface MultiplayerPlayer {
  id: string;
  name: string;
  color: string;
  score: number;
  cursor: { row: number; col: number } | null;
  isHost: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  playerColor: string;
  text: string;
  timestamp: number;
  isSystem: boolean;
}

export interface MultiplayerCell {
  value: number;
  solution: number;
  isGiven: boolean;
  isError: boolean;
  lastPlayerId?: string;
  lastPlayerColor?: string;
}

export type MultiplayerBoard = MultiplayerCell[][];

export interface MultiplayerGameState {
  roomCode: string | null;
  playerId: string | null;
  board: MultiplayerBoard;
  players: MultiplayerPlayer[];
  chat: ChatMessage[];
  timer: number;
  difficulty: Difficulty;
  isComplete: boolean;
  isConnected: boolean;
  error: string | null;
}

// ========== Hook ==========

export function useMultiplayerSudoku() {
  const socket = useSocket();

  const [state, setState] = useState<MultiplayerGameState>({
    roomCode: null,
    playerId: null,
    board: [],
    players: [],
    chat: [],
    timer: 0,
    difficulty: 'easy',
    isComplete: false,
    isConnected: false,
    error: null,
  });

  const solutionRef = useRef<number[][]>([]);
  const puzzleRef = useRef<number[][]>([]);

  // Build board from puzzle, solution, and current values
  const buildBoard = useCallback((puzzle: number[][], solution: number[][], boardValues: number[][]): MultiplayerBoard => {
    return puzzle.map((row, r) =>
      row.map((val, c) => ({
        value: boardValues[r][c],
        solution: solution[r][c],
        isGiven: val !== 0,
        isError: boardValues[r][c] !== 0 && val === 0 && boardValues[r][c] !== solution[r][c],
      }))
    );
  }, []);

  // ---------- Socket Event Listeners ----------
  useEffect(() => {
    const handleConnect = () => {
      setState(prev => ({ ...prev, isConnected: true }));
    };

    const handleDisconnect = () => {
      setState(prev => ({ ...prev, isConnected: false }));
    };

    const handleRoomCreated = (data: {
      roomCode: string;
      puzzle: number[][];
      solution: number[][];
      board: number[][];
      difficulty: Difficulty;
      playerId: string;
      players: MultiplayerPlayer[];
    }) => {
      puzzleRef.current = data.puzzle;
      solutionRef.current = data.solution;
      const board = buildBoard(data.puzzle, data.solution, data.board);
      setState(prev => ({
        ...prev,
        roomCode: data.roomCode,
        playerId: data.playerId,
        board,
        players: data.players,
        difficulty: data.difficulty,
        error: null,
        timer: 0,
        chat: [],
        isComplete: false,
      }));
    };

    const handleRoomJoined = (data: {
      roomCode: string;
      puzzle: number[][];
      solution: number[][];
      board: number[][];
      difficulty: Difficulty;
      playerId: string;
      timer: number;
      players: MultiplayerPlayer[];
      chat: ChatMessage[];
    }) => {
      puzzleRef.current = data.puzzle;
      solutionRef.current = data.solution;
      const board = buildBoard(data.puzzle, data.solution, data.board);
      setState(prev => ({
        ...prev,
        roomCode: data.roomCode,
        playerId: data.playerId,
        board,
        players: data.players,
        difficulty: data.difficulty,
        timer: data.timer,
        chat: data.chat,
        error: null,
        isComplete: false,
      }));
    };

    const handleJoinError = (data: { message: string }) => {
      setState(prev => ({ ...prev, error: data.message }));
    };

    const handleBoardUpdated = (data: {
      row: number;
      col: number;
      value: number;
      playerId: string;
      playerName: string;
      playerColor: string;
      isCorrect: boolean;
    }) => {
      setState(prev => {
        const newBoard = prev.board.map(row => row.map(cell => ({ ...cell })));
        newBoard[data.row][data.col] = {
          ...newBoard[data.row][data.col],
          value: data.value,
          isError: !data.isCorrect,
          lastPlayerId: data.playerId,
          lastPlayerColor: data.playerColor,
        };
        return { ...prev, board: newBoard };
      });
    };

    const handleCellErased = (data: { row: number; col: number }) => {
      setState(prev => {
        const newBoard = prev.board.map(row => row.map(cell => ({ ...cell })));
        newBoard[data.row][data.col] = {
          ...newBoard[data.row][data.col],
          value: 0,
          isError: false,
          lastPlayerId: undefined,
          lastPlayerColor: undefined,
        };
        return { ...prev, board: newBoard };
      });
    };

    const handlePlayersUpdated = (players: MultiplayerPlayer[]) => {
      setState(prev => ({ ...prev, players }));
    };

    const handleCursorMoved = (data: { playerId: string; cursor: { row: number; col: number } | null }) => {
      setState(prev => ({
        ...prev,
        players: prev.players.map(p =>
          p.id === data.playerId ? { ...p, cursor: data.cursor } : p
        ),
      }));
    };

    const handleTimerTick = (timer: number) => {
      setState(prev => ({ ...prev, timer }));
    };

    const handleChatBroadcast = (msg: ChatMessage) => {
      setState(prev => ({
        ...prev,
        chat: [...prev.chat.slice(-199), msg],
      }));
    };

    const handleGameWon = (data: { timer: number; players: MultiplayerPlayer[] }) => {
      setState(prev => ({
        ...prev,
        isComplete: true,
        timer: data.timer,
        players: data.players.map(p => ({
          ...p,
          cursor: prev.players.find(pp => pp.id === p.id)?.cursor ?? null,
        })),
      }));
    };

    const handlePlayerLeft = (_data: { playerId: string }) => {
      // Player list is updated via players-updated event
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('room-created', handleRoomCreated);
    socket.on('room-joined', handleRoomJoined);
    socket.on('join-error', handleJoinError);
    socket.on('board-updated', handleBoardUpdated);
    socket.on('cell-erased', handleCellErased);
    socket.on('players-updated', handlePlayersUpdated);
    socket.on('cursor-moved', handleCursorMoved);
    socket.on('timer-tick', handleTimerTick);
    socket.on('chat-broadcast', handleChatBroadcast);
    socket.on('game-won', handleGameWon);
    socket.on('player-left', handlePlayerLeft);

    // Set initial connection state
    if (socket.connected) {
      setState(prev => ({ ...prev, isConnected: true }));
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('room-created', handleRoomCreated);
      socket.off('room-joined', handleRoomJoined);
      socket.off('join-error', handleJoinError);
      socket.off('board-updated', handleBoardUpdated);
      socket.off('cell-erased', handleCellErased);
      socket.off('players-updated', handlePlayersUpdated);
      socket.off('cursor-moved', handleCursorMoved);
      socket.off('timer-tick', handleTimerTick);
      socket.off('chat-broadcast', handleChatBroadcast);
      socket.off('game-won', handleGameWon);
      socket.off('player-left', handlePlayerLeft);
    };
  }, [socket, buildBoard]);

  // ---------- Actions ----------

  const createRoom = useCallback((playerName: string, difficulty: Difficulty) => {
    setState(prev => ({ ...prev, error: null }));
    socket.emit('create-room', { playerName, difficulty });
  }, [socket]);

  const joinRoom = useCallback((roomCode: string, playerName: string) => {
    setState(prev => ({ ...prev, error: null }));
    socket.emit('join-room', { roomCode, playerName });
  }, [socket]);

  const placeNumber = useCallback((row: number, col: number, value: number) => {
    if (state.isComplete) return;
    socket.emit('cell-update', { row, col, value });
  }, [socket, state.isComplete]);

  const eraseCell = useCallback((row: number, col: number) => {
    if (state.isComplete) return;
    socket.emit('cell-erase', { row, col });
  }, [socket, state.isComplete]);

  const moveCursor = useCallback((cursor: { row: number; col: number } | null) => {
    socket.emit('player-cursor', cursor);
  }, [socket]);

  const sendMessage = useCallback((text: string) => {
    if (text.trim()) {
      socket.emit('chat-message', { text: text.trim() });
    }
  }, [socket]);

  const leaveRoom = useCallback(() => {
    socket.emit('leave-room');
    setState({
      roomCode: null,
      playerId: null,
      board: [],
      players: [],
      chat: [],
      timer: 0,
      difficulty: 'easy',
      isComplete: false,
      isConnected: socket.connected,
      error: null,
    });
  }, [socket]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    state,
    createRoom,
    joinRoom,
    leaveRoom,
    placeNumber,
    eraseCell,
    moveCursor,
    sendMessage,
    clearError,
  };
}
