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
  stream?: MediaStream | null;
  name: string;
  color: string;
  isSelf?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
}> = ({ stream, name, color, isSelf, isMuted, isVideoOff }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream || null;
    }
  }, [stream]);

  return (
    <div className="video-tile" style={{ borderColor: color }}>
      {stream && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isSelf}
          className={isVideoOff ? 'video-hidden' : ''}
        />
      )}
      {(!stream || isVideoOff) && (
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
  onToggleMute,
  onToggleVideo,
}) => {
  return (
    <div className="video-panel">
      <div className="video-panel-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M23 7l-7 5 7 5V7zM14 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>Video Call ({players.length})</span>
      </div>
      <div className={`video-grid tiles-${players.length}`}>
        {players.map(player => {
          const isSelf = player.id === currentPlayerId;
          if (isSelf) {
            return (
              <VideoTile
                key={player.id}
                stream={localStream}
                name={player.name}
                color={player.color}
                isSelf
                isMuted={isMuted}
                isVideoOff={isVideoOff || !localStream}
              />
            );
          } else {
            const rs = remoteStreams.find(s => s.peerId === player.id);
            return (
              <VideoTile
                key={player.id}
                stream={rs?.stream}
                name={player.name}
                color={player.color}
                isMuted={player.isMuted}
                isVideoOff={player.isVideoOff || !rs}
              />
            );
          }
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
      </div>
    </div>
  );
};

export default VideoPanel;
