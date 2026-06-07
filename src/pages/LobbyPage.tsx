import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMultiplayerContext } from '../contexts/MultiplayerContext';
import type { Difficulty } from '../engine/types';

const difficulties: Difficulty[] = ['easy', 'medium', 'hard', 'expert', 'master', 'extreme'];

const LobbyPage: React.FC = () => {
  const navigate = useNavigate();
  const { createRoom, joinRoom, state, clearError } = useMultiplayerContext();

  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('sudoku-player-name') || '';
  });
  const [joinCode, setJoinCode] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');

  // Navigate when room is ready
  React.useEffect(() => {
    if (state.roomCode) {
      localStorage.setItem('sudoku-player-name', playerName);
      navigate(`/room/${state.roomCode}`);
    }
  }, [state.roomCode, navigate, playerName]);

  const handleCreate = () => {
    if (!playerName.trim()) return;
    createRoom(playerName.trim(), difficulty);
  };

  const handleJoin = () => {
    if (!playerName.trim() || !joinCode.trim()) return;
    joinRoom(joinCode.trim(), playerName.trim());
  };

  return (
    <div className="lobby-page">
      <div className="lobby-bg-pattern" />
      <div className="lobby-container">
        <div className="lobby-header">
          <h1 className="lobby-title">Sudoku</h1>
          <span className="lobby-subtitle">Multiplayer</span>
        </div>

        {mode === 'choose' && (
          <div className="lobby-card">
            <div className="lobby-name-section">
              <label className="lobby-label">Your Nickname</label>
              <input
                type="text"
                className="lobby-input"
                placeholder="Enter your name..."
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                maxLength={20}
                autoFocus
              />
            </div>

            <div className="lobby-actions">
              <button
                className="lobby-btn lobby-btn-create"
                onClick={() => {
                  if (!playerName.trim()) return;
                  setMode('create');
                  clearError();
                }}
                disabled={!playerName.trim()}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
                Create Room
              </button>
              <button
                className="lobby-btn lobby-btn-join"
                onClick={() => {
                  if (!playerName.trim()) return;
                  setMode('join');
                  clearError();
                }}
                disabled={!playerName.trim()}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Join Room
              </button>
            </div>

            <button className="lobby-solo-link" onClick={() => navigate('/')}>
              ← Back to Solo Play
            </button>
          </div>
        )}

        {mode === 'create' && (
          <div className="lobby-card">
            <h2 className="lobby-card-title">Create a New Room</h2>
            <p className="lobby-card-desc">Choose a difficulty and invite up to 4 friends to solve together.</p>

            <label className="lobby-label">Difficulty</label>
            <div className="lobby-difficulty-grid">
              {difficulties.map(d => (
                <button
                  key={d}
                  className={`lobby-diff-btn ${d === difficulty ? 'active' : ''}`}
                  onClick={() => setDifficulty(d)}
                >
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>

            {state.error && <div className="lobby-error">{state.error}</div>}

            <div className="lobby-card-actions">
              <button className="lobby-btn lobby-btn-back" onClick={() => setMode('choose')}>
                Back
              </button>
              <button className="lobby-btn lobby-btn-create" onClick={handleCreate}>
                Create Room
              </button>
            </div>
          </div>
        )}

        {mode === 'join' && (
          <div className="lobby-card">
            <h2 className="lobby-card-title">Join a Room</h2>
            <p className="lobby-card-desc">Enter the 4-digit room code shared by your friend.</p>

            <label className="lobby-label">Room Code</label>
            <input
              type="text"
              className="lobby-input lobby-code-input"
              placeholder="1234"
              value={joinCode}
              onChange={e => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                setJoinCode(val);
              }}
              maxLength={4}
              autoFocus
            />

            {state.error && <div className="lobby-error">{state.error}</div>}

            <div className="lobby-card-actions">
              <button className="lobby-btn lobby-btn-back" onClick={() => { setMode('choose'); clearError(); }}>
                Back
              </button>
              <button
                className="lobby-btn lobby-btn-join"
                onClick={handleJoin}
                disabled={joinCode.length !== 4}
              >
                Join Room
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LobbyPage;
