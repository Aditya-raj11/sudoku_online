import type { SudokuSettings } from '../engine/types';

interface GameControlsProps {
  mistakes: number;
  maxMistakes: number;
  timer: number;
  isPaused: boolean;
  isNotesMode: boolean;
  hintsRemaining: number;
  score: number;
  numberCounts: Map<number, number>;
  onUndo: () => void;
  onErase: () => void;
  onToggleNotes: () => void;
  onHint: () => void;
  onTogglePause: () => void;
  onNumberClick: (num: number) => void;
  onNewGame: () => void;
  settings: SudokuSettings;
}

const GameControls: React.FC<GameControlsProps> = ({
  mistakes,
  maxMistakes,
  timer,
  isPaused,
  isNotesMode,
  hintsRemaining,
  score,
  numberCounts,
  onUndo,
  onErase,
  onToggleNotes,
  onHint,
  onTogglePause,
  onNumberClick,
  onNewGame,
  settings,
}) => {
  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="controls-panel">
      {/* Score display */}
      <div className="score-display">{score}</div>

      {/* Stats row */}
      <div className="stats-row">
        <div className="stat">
          <span className="stat-label">Mistakes</span>
          <span className="stat-value">
            {settings.mistakesLimit ? `${mistakes}/${maxMistakes}` : mistakes}
          </span>
        </div>
        {settings.timerEnabled && (
          <div className="stat timer-stat">
            <span className="stat-label">Time</span>
            <span className="stat-value">{formatTime(timer)}</span>
            <button className="pause-btn" onClick={onTogglePause} aria-label={isPaused ? 'Resume' : 'Pause'}>
              {isPaused ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M8 5v14l11-7z" fill="#6e7c8c"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="6" y="4" width="4" height="16" rx="1" fill="#6e7c8c"/>
                  <rect x="14" y="4" width="4" height="16" rx="1" fill="#6e7c8c"/>
                </svg>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="action-buttons">
        <button className="action-btn" onClick={onUndo}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M7 7h10a4 4 0 0 1 0 8H7" stroke="#6e7c8c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 4L7 7l3 3" stroke="#6e7c8c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Undo</span>
        </button>
        <button className="action-btn" onClick={onErase}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M19 4L5 18M5 4l14 14" stroke="#6e7c8c" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span>Erase</span>
        </button>
        <button className={`action-btn ${isNotesMode ? 'active' : ''}`} onClick={onToggleNotes}>
          <div className="btn-badge-wrapper">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 1 1 3.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" stroke="#6e7c8c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className={`badge ${isNotesMode ? 'on' : 'off'}`}>{isNotesMode ? 'ON' : 'OFF'}</span>
          </div>
          <span>Notes</span>
        </button>
        <button className="action-btn" onClick={onHint}>
          <div className="btn-badge-wrapper">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke="#6e7c8c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="badge hint-badge">{hintsRemaining}</span>
          </div>
          <span>Hint</span>
        </button>
      </div>

      {/* Number pad */}
      <div className="number-pad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => {
          const count = numberCounts.get(num) || 0;
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

      {/* New Game button */}
      <button className="new-game-btn" onClick={onNewGame}>
        New Game
      </button>
    </div>
  );
};

export default GameControls;
