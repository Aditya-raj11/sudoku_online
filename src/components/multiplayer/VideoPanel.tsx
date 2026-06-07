import React, { useRef, useEffect } from 'react';
import type { RemoteStream } from '../../hooks/useWebRTC';
import type { MultiplayerPlayer } from '../../hooks/useMultiplayerSudoku';

interface VideoPanelProps {
  localStream: MediaStream | null;
  remoteStreams: RemoteStream[];
  players: MultiplayerPlayer[];
  currentPlayerId: string | null;
  isMuted: boolean;
  isVideoOff: boolean;
  isInCall: boolean;
  onJoinCall: () => void;
  onLeaveCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
}

const VideoTile: React.FC<{
  stream: MediaStream;
  name: string;
  color: string;
  isSelf?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
}> = ({ stream, name, color, isSelf, isMuted, isVideoOff }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="video-tile" style={{ borderColor: color }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isSelf}
        className={isVideoOff ? 'video-hidden' : ''}
      />
      {isVideoOff && (
        <div className="video-avatar" style={{ background: color }}>
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="video-name-overlay">
        <span className="video-name">{isSelf ? `${name} (You)` : name}</span>
        {isMuted && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="video-muted-icon">
            <path d="M1 1l22 22M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.12 1.5-.34 2.18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="12" y1="19" x2="12" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <line x1="8" y1="23" x2="16" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        )}
      </div>
    </div>
  );
};

const VideoPanel: React.FC<VideoPanelProps> = ({
  localStream,
  remoteStreams,
  players,
  currentPlayerId,
  isMuted,
  isVideoOff,
  isInCall,
  onJoinCall,
  onLeaveCall,
  onToggleMute,
  onToggleVideo,
}) => {

  const currentPlayer = players.find(p => p.id === currentPlayerId);

  if (!isInCall) {
    return (
      <div className="video-panel">
        <div className="video-panel-header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M23 7l-7 5 7 5V7zM14 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Video Call</span>
        </div>
        <div className="video-join-prompt">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <path d="M23 7l-7 5 7 5V7zM14 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" stroke="var(--text-light)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p>Start a video call to see your teammates</p>
          <button className="video-join-btn" onClick={onJoinCall}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M23 7l-7 5 7 5V7zM14 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Join Video Call
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="video-panel">
      <div className="video-panel-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M23 7l-7 5 7 5V7zM14 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>Video Call ({1 + remoteStreams.length})</span>
      </div>
      <div className={`video-grid tiles-${1 + remoteStreams.length}`}>
        {localStream && currentPlayer && (
          <VideoTile
            stream={localStream}
            name={currentPlayer.name}
            color={currentPlayer.color}
            isSelf
            isMuted={isMuted}
            isVideoOff={isVideoOff}
          />
        )}
        {remoteStreams.map(rs => {
          const player = players.find(p => p.id === rs.peerId);
          return (
            <VideoTile
              key={rs.peerId}
              stream={rs.stream}
              name={player?.name || 'Unknown'}
              color={player?.color || '#94a3b3'}
              isMuted={player?.isMuted}
              isVideoOff={player?.isVideoOff}
            />
          );
        })}
      </div>
      <div className="video-controls">
        <button
          className={`video-ctrl-btn ${isMuted ? 'active' : ''}`}
          onClick={onToggleMute}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M1 1l22 22M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.12 1.5-.34 2.18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          )}
        </button>
        <button
          className={`video-ctrl-btn ${isVideoOff ? 'active' : ''}`}
          onClick={onToggleVideo}
          title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
        >
          {isVideoOff ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M1 1l22 22M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h7l2 3h4a2 2 0 0 1 2 2v9.34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14.121 15.121A3 3 0 1 1 9.88 10.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M23 7l-7 5 7 5V7zM14 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
        <button
          className="video-ctrl-btn leave"
          onClick={onLeaveCall}
          title="Leave call"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 11.94 11.94 0 0 0 3.75.6 2 2 0 0 1 2 2v3.46a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-5.33-5.33A19.79 19.79 0 0 1 1.98 5.18 2 2 0 0 1 4 3h3.5a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 11.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default VideoPanel;
