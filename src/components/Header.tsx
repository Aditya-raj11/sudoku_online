import React from 'react';
import { Link } from 'react-router-dom';
import type { Difficulty } from '../engine/types';

interface HeaderProps {
  difficulty: Difficulty;
  onDifficultyChange: (d: Difficulty) => void;
  onRulesClick: () => void;
  onSettingsClick: () => void;
}

const difficulties: Difficulty[] = ['easy', 'medium', 'hard', 'expert', 'master', 'extreme'];

const Header: React.FC<HeaderProps> = ({
  difficulty,
  onDifficultyChange,
  onRulesClick,
  onSettingsClick,
}) => {
  return (
    <header className="header">
      <div className="header-top">
        <div className="header-left">
          <button className="hamburger" aria-label="Menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 6h18M3 12h18M3 18h18" stroke="#344861" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <h1 className="logo">Sudoku</h1>
          <nav className="header-nav">
            <a className="nav-link active" href="#" onClick={e => e.preventDefault()}>Classic</a>
            <a className="nav-link" href="#" onClick={e => e.preventDefault()}>Killer</a>
          </nav>
        </div>
        <div className="header-right">
          <Link className="nav-link-small mp-link" to="/lobby">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ marginRight: 4, verticalAlign: 'text-bottom' }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Multiplayer
          </Link>
          <a className="nav-link-small" href="#" onClick={e => e.preventDefault()}>Awards</a>
          <a
            className="nav-link-small"
            href="#"
            onClick={e => {
              e.preventDefault();
              onRulesClick();
            }}
          >
            Rules
          </a>
          <a
            className="nav-link-small"
            href="#"
            onClick={e => {
              e.preventDefault();
              onSettingsClick();
            }}
          >
            Settings
          </a>
        </div>
      </div>
      <div className="difficulty-bar">
        <span className="difficulty-label">Difficulty:</span>
        {difficulties.map(d => (
          <button
            key={d}
            className={`difficulty-btn ${d === difficulty ? 'active' : ''}`}
            onClick={() => onDifficultyChange(d)}
          >
            {d.charAt(0).toUpperCase() + d.slice(1)}
          </button>
        ))}
      </div>
    </header>
  );
};

export default Header;
