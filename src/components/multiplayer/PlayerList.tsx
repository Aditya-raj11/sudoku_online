import React from 'react';
import type { MultiplayerPlayer } from '../../hooks/useMultiplayerSudoku';

interface PlayerListProps {
  players: MultiplayerPlayer[];
  currentPlayerId: string | null;
}

const PlayerList: React.FC<PlayerListProps> = ({ players, currentPlayerId }) => {
  return (
    <div className="player-list">
      <div className="player-list-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>Players ({players.length}/5)</span>
      </div>
      <div className="player-list-items">
        {players.map(player => (
          <div
            key={player.id}
            className={`player-item ${player.id === currentPlayerId ? 'is-you' : ''}`}
          >
            <div className="player-dot" style={{ background: player.color }} />
            <div className="player-info">
              <div className="player-name-row">
                <span className="player-name">{player.name}</span>
                {player.isHost && <span className="player-badge host">Host</span>}
                {player.id === currentPlayerId && <span className="player-badge you">You</span>}
              </div>
              <div className="player-score">Score: {player.score}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlayerList;
