import React from 'react';
import type { Difficulty } from '../engine/types';

interface GameOverModalProps {
  isGameOver: boolean;
  isGameWon: boolean;
  score: number;
  timer: number;
  mistakes: number;
  difficulty: Difficulty;
  onNewGame: (difficulty: Difficulty) => void;
}

const GameOverModal: React.FC<GameOverModalProps> = ({
  isGameOver,
  isGameWon,
  score,
  timer,
  mistakes,
  difficulty,
  onNewGame,
}) => {
  if (!isGameOver && !isGameWon) return null;

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-icon">
          {isGameWon ? (
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill="#4CAF50" opacity="0.15"/>
              <path d="M9 12l2 2 4-4" stroke="#4CAF50" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="12" r="10" stroke="#4CAF50" strokeWidth="2"/>
            </svg>
          ) : (
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill="#e74c3c" opacity="0.15"/>
              <path d="M15 9l-6 6M9 9l6 6" stroke="#e74c3c" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="12" cy="12" r="10" stroke="#e74c3c" strokeWidth="2"/>
            </svg>
          )}
        </div>
        <h2 className="modal-title">
          {isGameWon ? 'Congratulations!' : 'Game Over'}
        </h2>
        <p className="modal-subtitle">
          {isGameWon
            ? 'You solved the puzzle!'
            : 'You made too many mistakes.'}
        </p>
        <div className="modal-stats">
          <div className="modal-stat">
            <span className="modal-stat-label">Difficulty</span>
            <span className="modal-stat-value">{difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</span>
          </div>
          <div className="modal-stat">
            <span className="modal-stat-label">Time</span>
            <span className="modal-stat-value">{formatTime(timer)}</span>
          </div>
          <div className="modal-stat">
            <span className="modal-stat-label">Score</span>
            <span className="modal-stat-value">{score}</span>
          </div>
          <div className="modal-stat">
            <span className="modal-stat-label">Mistakes</span>
            <span className="modal-stat-value">{mistakes}/3</span>
          </div>
        </div>
        <button className="modal-btn" onClick={() => onNewGame(difficulty)}>
          New Game
        </button>
      </div>
    </div>
  );
};

export default GameOverModal;
