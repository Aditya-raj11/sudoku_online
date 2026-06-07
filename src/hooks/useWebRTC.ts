import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from './useSocket';

export interface RemoteStream {
  peerId: string;
  stream: MediaStream;
}

export function useWebRTC(roomCode: string | null, playerId: string | null) {
  const socket = useSocket();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isInCall, setIsInCall] = useState(false);

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);

  const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  const createPeerConnection = useCallback((peerId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc-ice', {
          targetId: peerId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    // Handle remote tracks
    pc.ontrack = (event) => {
      const [stream] = event.streams;
      setRemoteStreams(prev => {
        const existing = prev.find(s => s.peerId === peerId);
        if (existing) {
          return prev.map(s => s.peerId === peerId ? { ...s, stream } : s);
        }
        return [...prev, { peerId, stream }];
      });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        removePeer(peerId);
      }
    };

    peerConnections.current.set(peerId, pc);
    return pc;
  }, [socket]);

  const removePeer = useCallback((peerId: string) => {
    const pc = peerConnections.current.get(peerId);
    if (pc) {
      pc.close();
      peerConnections.current.delete(peerId);
    }
    setRemoteStreams(prev => prev.filter(s => s.peerId !== peerId));
  }, []);

  // Join call — get media and set up signaling
  const joinCall = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
        audio: true,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsInCall(true);

      // Notify server we're ready for WebRTC
      socket.emit('join-call');
      socket.emit('update-media-state', { isMuted: false, isVideoOff: false });
    } catch (err) {
      console.error('Failed to get media:', err);
      // Try audio-only
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = audioStream;
        setLocalStream(audioStream);
        setIsInCall(true);
        setIsVideoOff(true);
        socket.emit('join-call');
        socket.emit('update-media-state', { isMuted: false, isVideoOff: true });
      } catch (audioErr) {
        console.error('Failed to get audio:', audioErr);
      }
    }
  }, [socket]);

  const leaveCall = useCallback(() => {
    // Notify server we left the call
    socket.emit('leave-call');
    socket.emit('update-media-state', { isMuted: false, isVideoOff: false });

    // Stop local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);

    // Close all peer connections
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    setRemoteStreams([]);
    setIsInCall(false);
    setIsMuted(false);
    setIsVideoOff(false);
  }, [socket]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(prev => {
        const next = !prev;
        socket.emit('update-media-state', { isMuted: next, isVideoOff });
        return next;
      });
    }
  }, [socket, isVideoOff]);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(prev => {
        const next = !prev;
        socket.emit('update-media-state', { isMuted, isVideoOff: next });
        return next;
      });
    }
  }, [socket, isMuted]);

  // WebRTC signaling listeners
  useEffect(() => {
    if (!roomCode || !isInCall) return;

    const handlePlayerJoinedCall = async (data: { playerId: string }) => {
      if (data.playerId === playerId || !localStreamRef.current) return;
      // We initiate the offer to the new peer
      const pc = createPeerConnection(data.playerId);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc-offer', { targetId: data.playerId, offer });
      } catch (err) {
        console.error('Error creating offer:', err);
      }
    };

    const handlePlayerLeftCall = (data: { playerId: string }) => {
      removePeer(data.playerId);
    };

    const handleOffer = async (data: { senderId: string; offer: RTCSessionDescriptionInit }) => {
      if (!localStreamRef.current) return;
      const pc = createPeerConnection(data.senderId);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc-answer', { targetId: data.senderId, answer });
      } catch (err) {
        console.error('Error handling offer:', err);
      }
    };

    const handleAnswer = async (data: { senderId: string; answer: RTCSessionDescriptionInit }) => {
      const pc = peerConnections.current.get(data.senderId);
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        } catch (err) {
          console.error('Error handling answer:', err);
        }
      }
    };

    const handleIce = async (data: { senderId: string; candidate: RTCIceCandidateInit }) => {
      const pc = peerConnections.current.get(data.senderId);
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
          console.error('Error adding ICE candidate:', err);
        }
      }
    };

    const handlePlayerLeft = (data: { playerId: string }) => {
      removePeer(data.playerId);
    };

    socket.on('player-joined-call', handlePlayerJoinedCall);
    socket.on('player-left-call', handlePlayerLeftCall);
    socket.on('webrtc-offer', handleOffer);
    socket.on('webrtc-answer', handleAnswer);
    socket.on('webrtc-ice', handleIce);
    socket.on('player-left', handlePlayerLeft);

    return () => {
      socket.off('player-joined-call', handlePlayerJoinedCall);
      socket.off('player-left-call', handlePlayerLeftCall);
      socket.off('webrtc-offer', handleOffer);
      socket.off('webrtc-answer', handleAnswer);
      socket.off('webrtc-ice', handleIce);
      socket.off('player-left', handlePlayerLeft);
    };
  }, [socket, roomCode, playerId, isInCall, createPeerConnection, removePeer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      peerConnections.current.forEach(pc => pc.close());
      peerConnections.current.clear();
    };
  }, []);

  return {
    localStream,
    remoteStreams,
    isMuted,
    isVideoOff,
    isInCall,
    joinCall,
    leaveCall,
    toggleMute,
    toggleVideo,
  };
}
