import React from 'react';

interface RoomHeaderProps {
  roomCode: string;
  playerCount: number;
  timer: number;
  difficulty: string;
  isComplete: boolean;
  onLeave: () => void;
}

const RoomHeader: React.FC<RoomHeaderProps> = ({
  roomCode,
  playerCount,
  timer,
  difficulty,
  isComplete,
  onLeave,
}) => {
  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode).catch(() => {});
  };

  return (
    <div className="room-header">
      <div className="room-header-left">
        <button className="room-back-btn" onClick={onLeave} title="Leave Room">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="room-logo">Sudoku</h1>
        <span className="room-mode-badge">Multiplayer</span>
      </div>

      <div className="room-header-center">
        <div className="room-code-group" onClick={copyCode} title="Click to copy">
          <span className="room-code-label">Room</span>
          <span className="room-code-value">{roomCode}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="room-copy-icon">
            <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </div>
      </div>

      <div className="room-header-right">
        <div className="room-stat">
          <span className="room-stat-label">Players</span>
          <span className="room-stat-value">{playerCount}/5</span>
        </div>
        <div className="room-stat">
          <span className="room-stat-label">Difficulty</span>
          <span className="room-stat-value">{difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</span>
        </div>
        <div className="room-stat">
          <span className="room-stat-label">Time</span>
          <span className="room-stat-value">{formatTime(timer)}</span>
        </div>
        {isComplete && (
          <div className="room-complete-badge">✓ Complete</div>
        )}
      </div>
    </div>
  );
};

export default RoomHeader;
