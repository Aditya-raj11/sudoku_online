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
  const [isMuted, setIsMuted] = useState(true);
  const [isVideoOff, setIsVideoOff] = useState(true);
  const isInCall = true;

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);

  const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  const removePeer = useCallback((peerId: string) => {
    const pc = peerConnections.current.get(peerId);
    if (pc) {
      pc.close();
      peerConnections.current.delete(peerId);
    }
    setRemoteStreams(prev => prev.filter(s => s.peerId !== peerId));
  }, []);

  const addLocalStreamToPeerConnection = useCallback((pc: RTCPeerConnection, stream: MediaStream) => {
    stream.getTracks().forEach(track => {
      const transceivers = pc.getTransceivers();
      const transceiver = transceivers.find(t => t.sender && t.receiver && t.receiver.track.kind === track.kind);
      if (transceiver) {
        transceiver.direction = 'sendrecv';
        transceiver.sender.replaceTrack(track);
      } else {
        pc.addTrack(track, stream);
      }
    });
  }, []);

  const getOrCreatePeerConnection = useCallback((peerId: string, isOfferer: boolean): RTCPeerConnection => {
    let pc = peerConnections.current.get(peerId);
    if (pc) {
      return pc;
    }

    pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks if they exist
    if (localStreamRef.current && localStreamRef.current.getTracks().length > 0) {
      addLocalStreamToPeerConnection(pc, localStreamRef.current);
      
      if (isOfferer) {
        // Ensure we offer to receive what we aren't sending
        const hasVideo = localStreamRef.current.getVideoTracks().length > 0;
        if (!hasVideo) {
          try { pc.addTransceiver('video', { direction: 'recvonly' }); } catch (e) {}
        }
        const hasAudio = localStreamRef.current.getAudioTracks().length > 0;
        if (!hasAudio) {
          try { pc.addTransceiver('audio', { direction: 'recvonly' }); } catch (e) {}
        }
      }
    } else if (isOfferer) {
      // If we are the offerer but have no local tracks, we must add recvonly transceivers
      try { pc.addTransceiver('video', { direction: 'recvonly' }); } catch (e) {}
      try { pc.addTransceiver('audio', { direction: 'recvonly' }); } catch (e) {}
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
      let stream = event.streams[0];
      if (!stream) {
        stream = new MediaStream([event.track]);
      }

      // Clone the stream to force a fresh reference for React, while keeping browser media routing
      const freshStream = new MediaStream(stream.getTracks());
      setRemoteStreams(prev => {
        const existing = prev.find(s => s.peerId === peerId);
        if (existing) {
          return prev.map(s => s.peerId === peerId ? { ...s, stream: freshStream } : s);
        }
        return [...prev, { peerId, stream: freshStream }];
      });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        removePeer(peerId);
      }
    };

    peerConnections.current.set(peerId, pc);
    return pc;
  }, [socket, addLocalStreamToPeerConnection, removePeer]);

  const updateLocalMediaState = useCallback(async (nextVideoOn: boolean, nextAudioOn: boolean) => {
    let currentStream = localStreamRef.current;
    if (!currentStream) {
      currentStream = new MediaStream();
      localStreamRef.current = currentStream;
    }

    let audioTrack: MediaStreamTrack | undefined = currentStream.getAudioTracks()[0];
    let videoTrack: MediaStreamTrack | undefined = currentStream.getVideoTracks()[0];

    // 1. Acquire/Enable/Disable Audio
    if (nextAudioOn) {
      if (!audioTrack) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioTrack = audioStream.getAudioTracks()[0];
          currentStream.addTrack(audioTrack);
        } catch (err) {
          console.error('Failed to get audio track:', err);
        }
      }
      if (audioTrack) {
        audioTrack.enabled = true;
      }
    } else {
      // Always stop the microphone completely when muted to release hardware and clear Android mic indicator
      if (audioTrack) {
        audioTrack.stop();
        currentStream.removeTrack(audioTrack);
        audioTrack = undefined;
      }
    }

    // 2. Acquire/Stop Video
    if (nextVideoOn) {
      if (!videoTrack) {
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 320, height: 240, facingMode: 'user' }
          });
          videoTrack = videoStream.getVideoTracks()[0];
          currentStream.addTrack(videoTrack);
        } catch (err) {
          console.error('Failed to get video track:', err);
        }
      }
      if (videoTrack) {
        videoTrack.enabled = true;
      }
    } else {
      // Always stop the camera completely to turn off the hardware light
      if (videoTrack) {
        videoTrack.stop();
        currentStream.removeTrack(videoTrack);
        videoTrack = undefined;
      }
    }

    // 3. Update local stream reference
    const activeTracks = currentStream.getTracks();
    if (activeTracks.length > 0) {
      setLocalStream(new MediaStream(activeTracks));
    } else {
      localStreamRef.current = null;
      setLocalStream(null);
    }

    setIsVideoOff(!nextVideoOn || !videoTrack);
    setIsMuted(!nextAudioOn || !audioTrack);

    // 4. Update all peer connections
    peerConnections.current.forEach(async (pc, peerId) => {
      const transceivers = pc.getTransceivers();

      // Video transceiver
      try {
        const videoTransceiver = transceivers.find(t => t.receiver.track.kind === 'video');
        if (videoTransceiver) {
          if (nextVideoOn && videoTrack) {
            videoTransceiver.direction = 'sendrecv';
            await videoTransceiver.sender.replaceTrack(videoTrack);
          } else {
            videoTransceiver.direction = 'recvonly';
            await videoTransceiver.sender.replaceTrack(null);
          }
        } else if (nextVideoOn && videoTrack) {
          pc.addTrack(videoTrack, currentStream!);
        }
      } catch (err) {
        console.error('Error updating video transceiver:', err);
      }

      // Audio transceiver
      try {
        const audioTransceiver = transceivers.find(t => t.receiver.track.kind === 'audio');
        if (audioTransceiver) {
          if (nextAudioOn && audioTrack) {
            audioTransceiver.direction = 'sendrecv';
            await audioTransceiver.sender.replaceTrack(audioTrack);
          } else {
            audioTransceiver.direction = 'recvonly';
            await audioTransceiver.sender.replaceTrack(null);
          }
        } else if (nextAudioOn && audioTrack) {
          pc.addTrack(audioTrack, currentStream!);
        }
      } catch (err) {
        console.error('Error updating audio transceiver:', err);
      }

      // Renegotiate
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc-offer', { targetId: peerId, offer });
      } catch (err) {
        console.error('Error renegotiating offer:', err);
      }
    });

    socket.emit('update-media-state', {
      isMuted: !nextAudioOn || !audioTrack,
      isVideoOff: !nextVideoOn || !videoTrack
    });
  }, [socket]);

  const joinCall = useCallback(async () => {
    await updateLocalMediaState(true, true);
  }, [updateLocalMediaState]);

  const leaveCall = useCallback(async () => {
    await updateLocalMediaState(false, false);
  }, [updateLocalMediaState]);

  const toggleMute = useCallback(async () => {
    const nextAudioOn = isMuted; // Turn on if currently muted
    const currentVideoOn = !isVideoOff;
    await updateLocalMediaState(currentVideoOn, nextAudioOn);
  }, [isMuted, isVideoOff, updateLocalMediaState]);

  const toggleVideo = useCallback(async () => {
    const nextVideoOn = isVideoOff; // Turn on if currently off
    const currentAudioOn = !isMuted;
    await updateLocalMediaState(nextVideoOn, currentAudioOn);
  }, [isMuted, isVideoOff, updateLocalMediaState]);

  const processIceQueue = async (pc: RTCPeerConnection) => {
    const queue = (pc as any)._iceQueue;
    if (queue) {
      for (const cand of queue) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch (e) {
          console.error('Error adding queued ICE candidate:', e);
        }
      }
      delete (pc as any)._iceQueue;
    }
  };

  // WebRTC signaling listeners
  useEffect(() => {
    if (!roomCode) return;

    const handlePlayerJoinedCall = async (data: { playerId: string }) => {
      if (data.playerId === playerId) return;
      const pc = getOrCreatePeerConnection(data.playerId, true);
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
      const pc = getOrCreatePeerConnection(data.senderId, false);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc-answer', { targetId: data.senderId, answer });
        await processIceQueue(pc);
      } catch (err) {
        console.error('Error handling offer:', err);
      }
    };

    const handleAnswer = async (data: { senderId: string; answer: RTCSessionDescriptionInit }) => {
      const pc = peerConnections.current.get(data.senderId);
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          await processIceQueue(pc);
        } catch (err) {
          console.error('Error handling answer:', err);
        }
      }
    };

    const handleIce = async (data: { senderId: string; candidate: RTCIceCandidateInit }) => {
      const pc = peerConnections.current.get(data.senderId);
      if (pc) {
        try {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          } else {
            const queue = (pc as any)._iceQueue || [];
            queue.push(data.candidate);
            (pc as any)._iceQueue = queue;
          }
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

    // Auto-join signaling call
    socket.emit('join-call');

    return () => {
      socket.off('player-joined-call', handlePlayerJoinedCall);
      socket.off('player-left-call', handlePlayerLeftCall);
      socket.off('webrtc-offer', handleOffer);
      socket.off('webrtc-answer', handleAnswer);
      socket.off('webrtc-ice', handleIce);
      socket.off('player-left', handlePlayerLeft);
    };
  }, [socket, roomCode, playerId, getOrCreatePeerConnection, removePeer]);

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
