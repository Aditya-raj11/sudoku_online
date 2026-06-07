import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMultiplayerContext } from '../contexts/MultiplayerContext';
import { useWebRTC } from '../hooks/useWebRTC';
import RoomHeader from '../components/multiplayer/RoomHeader';
import VideoPanel from '../components/multiplayer/VideoPanel';
import ChatPanel from '../components/multiplayer/ChatPanel';
import PlayerList from '../components/multiplayer/PlayerList';
import type { MultiplayerBoard } from '../hooks/useMultiplayerSudoku';

interface MultiplayerBoardProps {
  board: MultiplayerBoard;
  selectedCell: { row: number; col: number } | null;
  onCellClick: (row: number, col: number) => void;
  playerCursors: Map<string, { row: number; col: number; color: string }>;
  currentPlayerId: string | null;
}

const MultiplayerSudokuBoard: React.FC<MultiplayerBoardProps> = ({
  board,
  selectedCell,
  onCellClick,
  playerCursors,
  currentPlayerId,
}) => {
  const getCellClasses = (row: number, col: number): string => {
    const classes: string[] = ['cell'];
    const cell = board[row]?.[col];
    if (!cell) return classes.join(' ');

    if (selectedCell) {
      const { row: sr, col: sc } = selectedCell;
      const isSelected = row === sr && col === sc;
      const isSameRow = row === sr;
      const isSameCol = col === sc;
      const isSameBox =
        Math.floor(row / 3) === Math.floor(sr / 3) &&
        Math.floor(col / 3) === Math.floor(sc / 3);
      const selectedValue = board[sr]?.[sc]?.value || 0;
      const isSameNumber = cell.value !== 0 && cell.value === selectedValue;

      if (isSelected) classes.push('selected');
      else if (isSameNumber) classes.push('same-number');
      else if (isSameRow || isSameCol || isSameBox) classes.push('related');
    }

    if (cell.isGiven) classes.push('given');
    else if (cell.value !== 0) classes.push('user-entered');
    if (cell.isError) classes.push('error');

    return classes.join(' ');
  };

  // Build cursor overlay map
  const cursorMap = new Map<string, { color: string; name: string }>();
  playerCursors.forEach((cursor, playerId) => {
    if (playerId !== currentPlayerId) {
      const key = `${cursor.row}-${cursor.col}`;
      cursorMap.set(key, { color: cursor.color, name: '' });
    }
  });

  return (
    <div className="board-container">
      <div className="board">
        {board.map((row, r) => (
          <div key={r} className="board-row">
            {row.map((cell, c) => {
              const cursorKey = `${r}-${c}`;
              const otherCursor = cursorMap.get(cursorKey);
              return (
                <div
                  key={`${r}-${c}`}
                  className={getCellClasses(r, c)}
                  onClick={() => onCellClick(r, c)}
                  style={otherCursor ? {
                    boxShadow: `inset 0 0 0 3px ${otherCursor.color}`,
                  } : undefined}
                >
                  {cell.value !== 0 ? (
                    <span
                      className="cell-value"
                      style={cell.lastPlayerColor && !cell.isGiven ? { color: cell.lastPlayerColor } : undefined}
                    >
                      {cell.value}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

// Number pad for multiplayer
const MultiplayerNumberPad: React.FC<{
  onNumberClick: (num: number) => void;
  onErase: () => void;
  board: MultiplayerBoard;
}> = ({ onNumberClick, onErase, board }) => {
  const getCount = (num: number): number => {
    let count = 0;
    for (const row of board) {
      for (const cell of row) {
        if (cell.value === num && !cell.isError) count++;
      }
    }
    return count;
  };

  return (
    <div className="mp-controls">
      <div className="number-pad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => {
          const count = getCount(num);
          const isComplete = count >= 9;
          return (
            <button
              key={num}
              className={`num-btn ${isComplete ? 'completed' : ''}`}
              onClick={() => onNumberClick(num)}
              disabled={isComplete}
            >
              {num}
            </button>
          );
        })}
      </div>
      <button className="mp-erase-btn" onClick={onErase}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M19 4L5 18M5 4l14 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        Erase
      </button>
    </div>
  );
};

// Win modal for multiplayer
const MultiplayerWinModal: React.FC<{
  isComplete: boolean;
  timer: number;
  players: { name: string; color: string; score: number }[];
  onLeave: () => void;
}> = ({ isComplete, timer, players, onLeave }) => {
  if (!isComplete) return null;

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="modal-overlay">
      <div className="modal mp-win-modal">
        <div className="modal-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="#4CAF50" opacity="0.15"/>
            <path d="M9 12l2 2 4-4" stroke="#4CAF50" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="12" r="10" stroke="#4CAF50" strokeWidth="2"/>
          </svg>
        </div>
        <h2 className="modal-title">Puzzle Complete! 🎉</h2>
        <p className="modal-subtitle">
          Your team solved it in {formatTime(timer)}
        </p>
        <div className="mp-scoreboard">
          <h3 className="mp-scoreboard-title">Scoreboard</h3>
          {sorted.map((p, i) => (
            <div key={i} className="mp-score-row">
              <span className="mp-score-rank">#{i + 1}</span>
              <span className="mp-score-dot" style={{ background: p.color }} />
              <span className="mp-score-name">{p.name}</span>
              <span className="mp-score-value">{p.score} pts</span>
            </div>
          ))}
        </div>
        <button className="modal-btn" onClick={onLeave}>
          Back to Lobby
        </button>
      </div>
    </div>
  );
};

// ========== Main Page ==========

const MultiplayerGamePage: React.FC = () => {
  const navigate = useNavigate();
  const { code } = useParams<{ code: string }>();
  
  const {
    state,
    placeNumber,
    eraseCell,
    moveCursor,
    sendMessage,
    joinRoom,
    leaveRoom,
  } = useMultiplayerContext();

  const {
    localStream,
    remoteStreams,
    isMuted,
    isVideoOff,
    isInCall,
    joinCall,
    leaveCall,
    toggleMute,
    toggleVideo,
  } = useWebRTC(state.roomCode, state.playerId);

  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [askingForName, setAskingForName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [joinAttempted, setJoinAttempted] = useState(false);

  // Auto-join room if arriving via direct URL (not from lobby navigation)
  // If coming from lobby, state.roomCode will already be set from the shared context
  useEffect(() => {
    if (!code) return;
    // Already in a room (came from lobby) — no need to re-join
    if (state.roomCode === code) return;
    // Already attempted to join — don't retry
    if (joinAttempted) return;
    // Wait for socket connection
    if (!state.isConnected) return;

    const savedName = localStorage.getItem('sudoku-player-name');
    if (savedName) {
      setJoinAttempted(true);
      joinRoom(code, savedName);
    } else {
      setAskingForName(true);
    }
  }, [state.isConnected, state.roomCode, code, joinRoom, joinAttempted]);

  const handleJoinWithName = useCallback(() => {
    if (nameInput.trim() && code) {
      localStorage.setItem('sudoku-player-name', nameInput.trim());
      setAskingForName(false);
      joinRoom(code, nameInput.trim());
    }
  }, [nameInput, code, joinRoom]);

  const handleCellClick = useCallback((row: number, col: number) => {
    if (state.isComplete) return;
    setSelectedCell({ row, col });
    moveCursor({ row, col });
  }, [moveCursor, state.isComplete]);

  const handleNumberClick = useCallback((num: number) => {
    if (!selectedCell || state.isComplete) return;
    const cell = state.board[selectedCell.row]?.[selectedCell.col];
    if (!cell || cell.isGiven) return;
    placeNumber(selectedCell.row, selectedCell.col, num);
  }, [selectedCell, state.board, placeNumber, state.isComplete]);

  const handleErase = useCallback(() => {
    if (!selectedCell || state.isComplete) return;
    const cell = state.board[selectedCell.row]?.[selectedCell.col];
    if (!cell || cell.isGiven || cell.value === 0) return;
    eraseCell(selectedCell.row, selectedCell.col);
  }, [selectedCell, state.board, eraseCell, state.isComplete]);

  const handleLeave = useCallback(() => {
    leaveCall();
    leaveRoom();
    navigate('/lobby');
  }, [leaveCall, leaveRoom, navigate]);

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (state.isComplete) return;
      if (!selectedCell) return;

      const { row, col } = selectedCell;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          handleCellClick(Math.max(0, row - 1), col);
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleCellClick(Math.min(8, row + 1), col);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleCellClick(row, Math.max(0, col - 1));
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleCellClick(row, Math.min(8, col + 1));
          break;
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          handleErase();
          break;
        default: {
          const num = parseInt(e.key);
          if (num >= 1 && num <= 9) {
            e.preventDefault();
            handleNumberClick(num);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, handleCellClick, handleNumberClick, handleErase, state.isComplete]);

  // Build player cursors map
  const playerCursors = new Map<string, { row: number; col: number; color: string }>();
  state.players.forEach(p => {
    if (p.cursor && p.id !== state.playerId) {
      playerCursors.set(p.id, { row: p.cursor.row, col: p.cursor.col, color: p.color });
    }
  });

  if (state.error) {
    return (
      <div className="lobby-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="lobby-container" style={{ width: '100%', maxWidth: '440px' }}>
          <div className="lobby-header">
            <h1 className="lobby-title">Sudoku</h1>
            <span className="lobby-subtitle">Error</span>
          </div>
          <div className="lobby-card">
            <div className="lobby-error" style={{ marginBottom: '16px' }}>
              {state.error}
            </div>
            <button 
              className="lobby-btn lobby-btn-back" 
              style={{ width: '100%' }}
              onClick={handleLeave}
            >
              Back to Lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (askingForName) {
    return (
      <div className="lobby-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="lobby-container" style={{ width: '100%', maxWidth: '440px' }}>
          <div className="lobby-header">
            <h1 className="lobby-title">Sudoku</h1>
            <span className="lobby-subtitle">Room {code}</span>
          </div>
          <div className="lobby-card">
            <div className="lobby-name-section">
              <label className="lobby-label">Enter your Nickname to Join</label>
              <input
                type="text"
                className="lobby-input"
                placeholder="Enter your name..."
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                maxLength={20}
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') handleJoinWithName();
                }}
              />
            </div>
            <div className="lobby-card-actions" style={{ marginTop: '16px' }}>
              <button 
                className="lobby-btn lobby-btn-back" 
                onClick={() => navigate('/lobby')}
              >
                Back to Lobby
              </button>
              <button
                className="lobby-btn lobby-btn-join"
                onClick={handleJoinWithName}
                disabled={!nameInput.trim()}
              >
                Join Game
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!state.roomCode || state.board.length === 0) {
    return (
      <div className="mp-loading">
        <div className="mp-loading-spinner" />
        <p>Connecting to room...</p>
      </div>
    );
  }

  return (
    <div className="mp-page">
      <RoomHeader
        roomCode={state.roomCode}
        playerCount={state.players.length}
        timer={state.timer}
        difficulty={state.difficulty}
        isComplete={state.isComplete}
        onLeave={handleLeave}
      />
      <div className="mp-layout">
        <div className="mp-left-panel">
          <VideoPanel
            localStream={localStream}
            remoteStreams={remoteStreams}
            players={state.players}
            currentPlayerId={state.playerId}
            isMuted={isMuted}
            isVideoOff={isVideoOff}
            isInCall={isInCall}
            onJoinCall={joinCall}
            onLeaveCall={leaveCall}
            onToggleMute={toggleMute}
            onToggleVideo={toggleVideo}
          />
        </div>
        <div className="mp-center">
          <MultiplayerSudokuBoard
            board={state.board}
            selectedCell={selectedCell}
            onCellClick={handleCellClick}
            playerCursors={playerCursors}
            currentPlayerId={state.playerId}
          />
          <MultiplayerNumberPad
            onNumberClick={handleNumberClick}
            onErase={handleErase}
            board={state.board}
          />
        </div>
        <div className="mp-right-panel">
          <PlayerList
            players={state.players}
            currentPlayerId={state.playerId}
          />
          <ChatPanel
            messages={state.chat}
            onSend={sendMessage}
          />
        </div>
      </div>
      <MultiplayerWinModal
        isComplete={state.isComplete}
        timer={state.timer}
        players={state.players.map(p => ({ name: p.name, color: p.color, score: p.score }))}
        onLeave={handleLeave}
      />
    </div>
  );
};

export default MultiplayerGamePage;
