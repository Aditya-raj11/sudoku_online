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

      // Handle dynamic track updates (add/remove) inside the stream reactively
      const handleTracksChanged = () => {
        setRemoteStreams(prev => {
          const existing = prev.find(s => s.peerId === peerId);
          if (existing) {
            return prev.map(s => s.peerId === peerId ? { ...s, stream: new MediaStream(existing.stream.getTracks()) } : s);
          }
          return prev;
        });
      };

      stream.onaddtrack = handleTracksChanged;
      stream.onremovetrack = handleTracksChanged;

      // Force a fresh MediaStream object reference so React useEffect re-runs and re-binds srcObject
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

  const startLocalStream = useCallback(async (initialVideo: boolean, initialAudio: boolean) => {
    try {
      const constraints: MediaStreamConstraints = {
        video: initialVideo ? { width: 320, height: 240, facingMode: 'user' } : false,
        audio: initialAudio,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);

      setIsVideoOff(!initialVideo);
      setIsMuted(!initialAudio);

      // Update all peer connections and renegotiate
      peerConnections.current.forEach(async (pc, peerId) => {
        addLocalStreamToPeerConnection(pc, stream);
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('webrtc-offer', { targetId: peerId, offer });
        } catch (err) {
          console.error('Error renegotiating offer:', err);
        }
      });

      socket.emit('update-media-state', { isMuted: !initialAudio, isVideoOff: !initialVideo });
    } catch (err) {
      console.error('Failed to get media stream, trying audio-only:', err);
      if (initialVideo) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          localStreamRef.current = audioStream;
          setLocalStream(audioStream);

          setIsVideoOff(true);
          setIsMuted(false);

          peerConnections.current.forEach(async (pc, peerId) => {
            addLocalStreamToPeerConnection(pc, audioStream);
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socket.emit('webrtc-offer', { targetId: peerId, offer });
            } catch (err) {
              console.error('Error renegotiating offer (audio-only):', err);
            }
          });

          socket.emit('update-media-state', { isMuted: false, isVideoOff: true });
        } catch (audioErr) {
          console.error('Failed to get audio stream:', audioErr);
        }
      }
    }
  }, [socket, addLocalStreamToPeerConnection]);

  const joinCall = useCallback(async () => {
    await startLocalStream(true, true);
  }, [startLocalStream]);

  const leaveCall = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setIsMuted(true);
    setIsVideoOff(true);

    socket.emit('update-media-state', { isMuted: true, isVideoOff: true });

    // Remove our tracks from all peer connections and renegotiate
    peerConnections.current.forEach(async (pc, peerId) => {
      pc.getTransceivers().forEach(transceiver => {
        if (transceiver.direction === 'sendrecv' || transceiver.direction === 'sendonly') {
          transceiver.direction = 'recvonly';
          transceiver.sender.replaceTrack(null);
        }
      });
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc-offer', { targetId: peerId, offer });
      } catch (err) {
        console.error('Error renegotiating after stopping stream:', err);
      }
    });
  }, [socket]);

  const toggleMute = useCallback(async () => {
    if (!localStreamRef.current) {
      await startLocalStream(false, true);
      return;
    }

    const audioTracks = localStreamRef.current.getAudioTracks();
    if (audioTracks.length === 0) {
      try {
        const freshStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const newTrack = freshStream.getAudioTracks()[0];
        if (newTrack) {
          localStreamRef.current.addTrack(newTrack);
          setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
          setIsMuted(false);
          socket.emit('update-media-state', { isMuted: false, isVideoOff });

          peerConnections.current.forEach(async (pc, peerId) => {
            const transceivers = pc.getTransceivers();
            const audioTransceiver = transceivers.find(t => t.receiver.track.kind === 'audio');
            if (audioTransceiver) {
              audioTransceiver.direction = 'sendrecv';
              audioTransceiver.sender.replaceTrack(newTrack);
            } else {
              pc.addTrack(newTrack, localStreamRef.current!);
            }
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socket.emit('webrtc-offer', { targetId: peerId, offer });
            } catch (err) {
              console.error('Error renegotiating after unmuting:', err);
            }
          });
        }
      } catch (err) {
        console.error('Failed to get audio track:', err);
      }
    } else {
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(prev => {
        const next = !prev;
        socket.emit('update-media-state', { isMuted: next, isVideoOff });
        return next;
      });
    }
  }, [socket, isVideoOff, startLocalStream]);

  const toggleVideo = useCallback(async () => {
    if (!localStreamRef.current) {
      await startLocalStream(true, false);
      return;
    }

    const videoTracks = localStreamRef.current.getVideoTracks();
    const isCurrentlyOff = isVideoOff;

    if (!isCurrentlyOff) {
      // Stop the hardware track so the camera light turns off
      videoTracks.forEach(track => {
        track.stop();
        localStreamRef.current?.removeTrack(track);
      });
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      setIsVideoOff(true);
      socket.emit('update-media-state', { isMuted, isVideoOff: true });

      peerConnections.current.forEach(async (pc, peerId) => {
        const transceivers = pc.getTransceivers();
        const videoTransceiver = transceivers.find(t => t.receiver.track.kind === 'video');
        if (videoTransceiver) {
          videoTransceiver.direction = 'recvonly';
          videoTransceiver.sender.replaceTrack(null);
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit('webrtc-offer', { targetId: peerId, offer });
          } catch (err) {
            console.error('Error renegotiating after stopping camera:', err);
          }
        }
      });
    } else {
      // Re-enable camera hardware and replace it in active connections
      try {
        const freshStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: 'user' }
        });
        const newTrack = freshStream.getVideoTracks()[0];
        if (newTrack) {
          localStreamRef.current.addTrack(newTrack);
          setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
          setIsVideoOff(false);
          socket.emit('update-media-state', { isMuted, isVideoOff: false });

          peerConnections.current.forEach(async (pc, peerId) => {
            const transceivers = pc.getTransceivers();
            const videoTransceiver = transceivers.find(t => t.receiver.track.kind === 'video');
            if (videoTransceiver) {
              videoTransceiver.direction = 'sendrecv';
              videoTransceiver.sender.replaceTrack(newTrack);
            } else {
              pc.addTrack(newTrack, localStreamRef.current!);
            }
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socket.emit('webrtc-offer', { targetId: peerId, offer });
            } catch (err) {
              console.error('Error renegotiating after starting camera:', err);
            }
          });
        }
      } catch (err) {
        console.error('Failed to start camera:', err);
      }
    }
  }, [socket, isMuted, isVideoOff, startLocalStream]);

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
