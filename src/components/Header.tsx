import React, { useState } from 'react';
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
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="header">
      <div className="header-top">
        <div className="header-left">
          <button 
            className="hamburger" 
            aria-label="Menu" 
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
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

      {/* Mobile Drawer Menu */}
      {menuOpen && (
        <div className="mobile-menu-overlay" onClick={() => setMenuOpen(false)}>
          <div className="mobile-menu" onClick={e => e.stopPropagation()}>
            <div className="mobile-menu-header">
              <span className="logo">Sudoku</span>
              <button className="mobile-menu-close" onClick={() => setMenuOpen(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <div className="mobile-menu-links">
              <Link className="mobile-menu-link mp-link" to="/lobby" onClick={() => setMenuOpen(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ marginRight: 8 }}>
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Multiplayer
              </Link>
              <a
                className="mobile-menu-link"
                href="#"
                onClick={e => {
                  e.preventDefault();
                  setMenuOpen(false);
                  onRulesClick();
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ marginRight: 8 }}>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Rules
              </a>
              <a
                className="mobile-menu-link"
                href="#"
                onClick={e => {
                  e.preventDefault();
                  setMenuOpen(false);
                  onSettingsClick();
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ marginRight: 8 }}>
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Settings
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
