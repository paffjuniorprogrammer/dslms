/**
 * useWebRTC.ts
 *
 * Core WebRTC hook for the live class room.
 * Manages:
 *  - Local camera/mic stream
 *  - Screen share stream
 *  - One RTCPeerConnection per remote participant (mesh)
 *  - Deterministic & Glare-free SDP offer/answer negotiation via Supabase Realtime Broadcast
 *  - Dynamic track replacement on camera/mic toggle with renegotiation
 *  - ICE candidate exchange via Supabase Realtime Broadcast
 *  - Remote stream registry (peerId → MediaStream)
 *  - Clean teardown on unmount
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { ParticipantRole, MediaState, StreamKind } from '@/types/live-class';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PeerInfo {
  peerId: string;
  name: string;
  role: ParticipantRole;
}

export interface RemotePeerState {
  peerId: string;
  name: string;
  role: ParticipantRole;
  stream: MediaStream | null;
  micState: MediaState;
  cameraState: MediaState;
  handRaised: boolean;
  isSpeaking: boolean;
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
}

interface UseWebRTCOptions {
  classId: string;
  localPeerId: string;
  localName: string;
  localRole: ParticipantRole;
  /** Optional TURN server URL from env. Falls back to STUN only. */
  turnUrl?: string;
  onParticipantsChange?: (peers: RemotePeerState[]) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// ICE Configuration
// ─────────────────────────────────────────────────────────────────────────────

function getIceConfig(turnUrl?: string): RTCConfiguration {
  const iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ];

  if (turnUrl) {
    iceServers.push({
      urls: turnUrl,
      username: import.meta.env.VITE_TURN_USERNAME || '',
      credential: import.meta.env.VITE_TURN_CREDENTIAL || '',
    });
  }

  return { iceServers };
}

async function tuneSender(sender: RTCRtpSender) {
  const parameters = sender.getParameters();
  if (parameters.encodings && parameters.encodings.length > 0) {
    const encoding = parameters.encodings[0];
    if (sender.track?.kind === 'video') {
      encoding.maxBitrate = 800_000;
      encoding.maxFramerate = 24;
    } else if (sender.track?.kind === 'audio') {
      encoding.maxBitrate = 64_000;
    }
    await sender.setParameters(parameters).catch(() => {});
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useWebRTC({
  classId,
  localPeerId,
  localName,
  localRole,
  turnUrl,
  onParticipantsChange,
}: UseWebRTCOptions) {
  // Local streams
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [micState, setMicState] = useState<MediaState>('off');
  const [cameraState, setCameraState] = useState<MediaState>('off');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [activeStreamKind, setActiveStreamKind] = useState<StreamKind | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  // Remote peers
  const [remotePeers, setRemotePeers] = useState<Map<string, RemotePeerState>>(new Map());

  // Refs (stable across renders)
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const micStateRef = useRef<MediaState>('off');
  const cameraStateRef = useRef<MediaState>('off');
  const activeStreamKindRef = useRef<StreamKind | null>(null);
  const makingOfferRef = useRef<Map<string, boolean>>(new Map());
  const pendingIceCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const reconnectTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Keep refs in sync with state
  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);
  useEffect(() => { screenStreamRef.current = screenStream; }, [screenStream]);
  useEffect(() => { micStateRef.current = micState; }, [micState]);
  useEffect(() => { cameraStateRef.current = cameraState; }, [cameraState]);
  useEffect(() => { activeStreamKindRef.current = activeStreamKind; }, [activeStreamKind]);

  // Notify parent when peers change
  useEffect(() => {
    if (onParticipantsChange) {
      onParticipantsChange(Array.from(remotePeers.values()));
    }
  }, [remotePeers, onParticipantsChange]);

  // ─── Peer Connection helpers ───────────────────────────────────────────────

  const updatePeer = useCallback((peerId: string, updates: Partial<RemotePeerState>) => {
    setRemotePeers(prev => {
      const next = new Map(prev);
      const existing = next.get(peerId);
      if (existing) {
        next.set(peerId, { ...existing, ...updates });
      } else {
        next.set(peerId, {
          peerId,
          name: updates.name || 'Participant',
          role: updates.role || 'student',
          stream: null,
          micState: 'off',
          cameraState: 'off',
          handRaised: false,
          isSpeaking: false,
          connectionState: 'new',
          iceConnectionState: 'new',
          ...updates,
        });
      }
      return next;
    });
  }, []);

  const removePeer = useCallback((peerId: string) => {
    peerConnections.current.get(peerId)?.close();
    peerConnections.current.delete(peerId);
    remoteStreamsRef.current.delete(peerId);
    makingOfferRef.current.delete(peerId);
    pendingIceCandidatesRef.current.delete(peerId);
    const reconnectTimer = reconnectTimersRef.current.get(peerId);
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimersRef.current.delete(peerId);
    setRemotePeers(prev => {
      const next = new Map(prev);
      next.delete(peerId);
      return next;
    });
  }, []);

  // ─── Send broadcast via channel ───────────────────────────────────────────

  const broadcast = useCallback((event: string, payload: Record<string, unknown>) => {
    channelRef.current?.send({
      type: 'broadcast',
      event,
      payload: { from: localPeerId, ...payload },
    });
  }, [localPeerId]);

  // ─── Create a new RTCPeerConnection for a remote peer ─────────────────────

  const createPeerConnection = useCallback((remotePeerId: string): RTCPeerConnection => {
    const existing = peerConnections.current.get(remotePeerId);
    if (existing && existing.connectionState !== 'closed') {
      return existing;
    }

    const pc = new RTCPeerConnection(getIceConfig(turnUrl));

    // Attach the current media tracks. Screen sharing replaces the video source,
    // but the local microphone remains the audio source for the room.
    const activeStream = activeStreamKindRef.current === 'screen'
      ? screenStreamRef.current
      : localStreamRef.current;
    if (activeStream) {
        activeStream.getTracks().forEach(track => {
        if (activeStreamKindRef.current === 'screen' && track.kind === 'audio') return;
        const sender = pc.addTrack(track, activeStream);
        tuneSender(sender);
      });
    }
    if (activeStreamKindRef.current === 'screen' && localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        const sender = pc.addTrack(track, localStreamRef.current as MediaStream);
        tuneSender(sender);
      });
    }

    // ICE candidates → send to remote peer
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        broadcast('ice', { to: remotePeerId, candidate: event.candidate.toJSON() });
      }
    };

    // Remote tracks may arrive as separate audio/video events. Keep one
    // aggregate stream per peer instead of replacing the stream on each event.
    pc.ontrack = (event) => {
      const remoteStream = remoteStreamsRef.current.get(remotePeerId) ?? new MediaStream();
      const incomingTracks = event.streams[0]?.getTracks() ?? (event.track ? [event.track] : []);

      incomingTracks.forEach(track => {
        if (!remoteStream.getTrackById(track.id)) {
          remoteStream.addTrack(track);
        }
      });

      remoteStreamsRef.current.set(remotePeerId, remoteStream);
      updatePeer(remotePeerId, { stream: remoteStream });
    };

    // Connection state monitoring and one-shot recovery. The room remains
    // connected while a failed peer negotiates again, instead of leaving the
    // user with a silent black tile.
    pc.onconnectionstatechange = () => {
      updatePeer(remotePeerId, {
        connectionState: pc.connectionState,
        iceConnectionState: pc.iceConnectionState,
      });

      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        if (!reconnectTimersRef.current.has(remotePeerId)) {
          const timer = setTimeout(() => {
            reconnectTimersRef.current.delete(remotePeerId);
            if (peerConnections.current.get(remotePeerId) !== pc || pc.connectionState === 'closed') return;
            pc.restartIce();
            broadcast('reconnect_request', {
              to: remotePeerId,
              fromInfo: { peerId: localPeerId, name: localName, role: localRole },
            });
          }, 1200);
          reconnectTimersRef.current.set(remotePeerId, timer);
        }
      } else if (pc.connectionState === 'connected') {
        const timer = reconnectTimersRef.current.get(remotePeerId);
        if (timer) clearTimeout(timer);
        reconnectTimersRef.current.delete(remotePeerId);
      }

      if (pc.connectionState === 'closed') {
        removePeer(remotePeerId);
      }
    };
    pc.oniceconnectionstatechange = () => {
      updatePeer(remotePeerId, { iceConnectionState: pc.iceConnectionState });
    };

    peerConnections.current.set(remotePeerId, pc);
    return pc;
  }, [broadcast, updatePeer, removePeer, turnUrl, localPeerId, localName, localRole]);

  // ─── Initiate offer to a peer ─────────────────────────────────────────────

  const initiateOffer = useCallback(async (targetPeerId: string, peerInfo: PeerInfo) => {
    try {
      const pc = createPeerConnection(targetPeerId);
      updatePeer(targetPeerId, { peerId: targetPeerId, name: peerInfo.name, role: peerInfo.role });

      makingOfferRef.current.set(targetPeerId, true);
      const offer = await pc.createOffer();
      if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-offer') {
        // If state changed while creating offer, rollback first
        await pc.setLocalDescription({ type: 'rollback' });
      }
      await pc.setLocalDescription(offer);

      broadcast('offer', {
        to: targetPeerId,
        offer: { type: offer.type, sdp: offer.sdp },
        fromInfo: { peerId: localPeerId, name: localName, role: localRole },
      });
    } catch (err) {
      console.warn('WebRTC offer error:', err);
    } finally {
      makingOfferRef.current.set(targetPeerId, false);
    }
  }, [createPeerConnection, updatePeer, broadcast, localPeerId, localName, localRole]);

  // ─── Signaling handlers (Perfect Negotiation) ─────────────────────────────

  const handleOffer = useCallback(async (from: string, offer: RTCSessionDescriptionInit, peerInfo: PeerInfo) => {
    try {
      const pc = createPeerConnection(from);
      updatePeer(from, { peerId: from, name: peerInfo.name, role: peerInfo.role });

      const isCollision = makingOfferRef.current.get(from) || pc.signalingState !== 'stable';
      // Deterministic polite peer rule: higher ID yields to lower ID on glare
      const isPolite = localPeerId < from;

      if (isCollision && !isPolite) {
        // Impolite peer ignores incoming offer during collision
        return;
      }

      if (isCollision && isPolite) {
        await pc.setLocalDescription({ type: 'rollback' });
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const queuedCandidates = pendingIceCandidatesRef.current.get(from) ?? [];
      for (const candidate of queuedCandidates) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
      }
      pendingIceCandidatesRef.current.delete(from);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      broadcast('answer', {
        to: from,
        answer: { type: answer.type, sdp: answer.sdp },
      });
    } catch (err) {
      console.warn('WebRTC handleOffer error:', err);
    }
  }, [createPeerConnection, updatePeer, broadcast, localPeerId]);

  const handleAnswer = useCallback(async (from: string, answer: RTCSessionDescriptionInit) => {
    try {
      const pc = peerConnections.current.get(from);
      if (pc && (pc.signalingState === 'have-local-offer' || pc.signalingState === 'have-remote-pranswer')) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        const queuedCandidates = pendingIceCandidatesRef.current.get(from) ?? [];
        for (const candidate of queuedCandidates) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
        }
        pendingIceCandidatesRef.current.delete(from);
      }
    } catch (err) {
      console.warn('WebRTC handleAnswer error:', err);
    }
  }, []);

  const handleIceCandidate = useCallback(async (from: string, candidate: RTCIceCandidateInit) => {
    const pc = peerConnections.current.get(from);
    if (!pc) return;

    if (!pc.remoteDescription || !pc.remoteDescription.type) {
      const queued = pendingIceCandidatesRef.current.get(from) ?? [];
      pendingIceCandidatesRef.current.set(from, [...queued, candidate]);
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch {
      // Ignore stale ICE candidates
    }
  }, []);

  // ─── Supabase Realtime channel setup ──────────────────────────────────────

  useEffect(() => {
    if (!classId || !localPeerId) return;

    const channel = supabase.channel(`live_class:${classId}`, {
      config: { broadcast: { self: false }, presence: { key: localPeerId } },
    });
    channelRef.current = channel;
    setChannel(channel);

    // Presence: track joined peers
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      Object.keys(state).forEach(key => {
        const presences = state[key] as Array<Record<string, unknown>>;
        presences.forEach(presence => {
          const peerId = presence['peerId'] as string;
          const name = presence['name'] as string;
          const role = presence['role'] as ParticipantRole;
          if (peerId && peerId !== localPeerId) {
            updatePeer(peerId, {
              peerId,
              name,
              role,
              micState: (presence['micState'] as MediaState) || 'off',
              cameraState: (presence['cameraState'] as MediaState) || 'off',
              handRaised: Boolean(presence['handRaised']),
            });
            // Deterministic offer initiator: peer with larger ID initiates
            if (localPeerId > peerId) {
              initiateOffer(peerId, { peerId, name, role }).catch(console.warn);
            }
          }
        });
      });
    });

    channel.on('presence', { event: 'join' }, ({ newPresences }) => {
      newPresences.forEach((presence: Record<string, unknown>) => {
        const peerId = presence['peerId'] as string;
        const name = presence['name'] as string;
        const role = presence['role'] as ParticipantRole;
        if (peerId && peerId !== localPeerId) {
          updatePeer(peerId, {
            peerId,
            name,
            role,
            micState: (presence['micState'] as MediaState) || 'off',
            cameraState: (presence['cameraState'] as MediaState) || 'off',
            handRaised: Boolean(presence['handRaised']),
          });
          // Deterministic offer initiator
          if (localPeerId > peerId) {
            initiateOffer(peerId, { peerId, name, role }).catch(console.warn);
          }
        }
      });
    });

    channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      leftPresences.forEach((presence: Record<string, unknown>) => {
        const peerId = presence['peerId'] as string;
        if (peerId) removePeer(peerId);
      });
    });

    // Broadcast: WebRTC signaling
    channel.on('broadcast', { event: 'offer' }, async ({ payload }) => {
      if (payload.to !== localPeerId) return;
      await handleOffer(payload.from, payload.offer, payload.fromInfo);
    });

    channel.on('broadcast', { event: 'answer' }, async ({ payload }) => {
      if (payload.to !== localPeerId) return;
      await handleAnswer(payload.from, payload.answer);
    });

    channel.on('broadcast', { event: 'ice' }, async ({ payload }) => {
      if (payload.to !== localPeerId) return;
      await handleIceCandidate(payload.from, payload.candidate);
    });

    // Broadcast: request a fresh offer after an ICE failure.
    channel.on('broadcast', { event: 'reconnect_request' }, ({ payload }) => {
      if (payload.to !== localPeerId || !payload.fromInfo) return;
      initiateOffer(payload.from, payload.fromInfo as PeerInfo).catch(console.warn);
    });

    // Broadcast: media state changes
    channel.on('broadcast', { event: 'media_state' }, ({ payload }) => {
      updatePeer(payload.from, {
        micState: payload.micState,
        cameraState: payload.cameraState,
      });
    });

    // Broadcast: hand raise
    channel.on('broadcast', { event: 'hand_raise' }, ({ payload }) => {
      updatePeer(payload.from, { handRaised: payload.raised });
    });

    const peerConnectionsForCleanup = peerConnections.current;

    // Subscribe and track presence
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          peerId: localPeerId,
          name: localName,
          role: localRole,
          micState: micStateRef.current,
          cameraState: cameraStateRef.current,
        });
      }
    });

    return () => {
      peerConnectionsForCleanup.forEach(pc => pc.close());
      peerConnectionsForCleanup.clear();
      channel.unsubscribe();
      channelRef.current = null;
      setChannel(null);
    };
  }, [classId, localPeerId, localName, localRole, handleOffer, handleAnswer, handleIceCandidate, initiateOffer, updatePeer, removePeer]);

  // ─── Track replacement & renegotiation across peers ────────────────────────

  const syncTracksWithPeers = useCallback(async (newStream: MediaStream | null, streamKind: StreamKind = activeStreamKind || 'camera') => {
    if (!newStream) return;
    // Display audio must not replace the microphone sender. Screen sharing
    // changes video only; camera/mic changes synchronize both media kinds.
    const tracks = streamKind === 'screen' ? newStream.getVideoTracks() : newStream.getTracks();

    for (const [peerId, pc] of peerConnections.current.entries()) {
      let needsRenegotiation = false;
      const senders = pc.getSenders();

      for (const track of tracks) {
        const existingSender = senders.find(s => s.track?.kind === track.kind || (!s.track && track.kind === 'video'));
        if (existingSender) {
          await existingSender.replaceTrack(track).catch(console.warn);
          await tuneSender(existingSender);
        } else {
          const sender = pc.addTrack(track, newStream);
          await tuneSender(sender);
          needsRenegotiation = true;
        }
      }

      if (needsRenegotiation) {
        const peer = remotePeers.get(peerId);
        if (peer) {
          initiateOffer(peerId, { peerId, name: peer.name, role: peer.role }).catch(console.warn);
        }
      }
    }
  }, [initiateOffer, remotePeers, activeStreamKind]);

  // ─── Media controls ────────────────────────────────────────────────────────

  const startCamera = useCallback(async () => {
    try {
      setMediaError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640, max: 1280 },
          height: { ideal: 360, max: 720 },
          frameRate: { ideal: 24, max: 30 },
          facingMode: 'user',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });

      const audioTrack = stream.getAudioTracks()[0];
      const shouldEnableMic = localRole !== 'student' || micStateRef.current === 'on';
      if (audioTrack) {
        audioTrack.enabled = shouldEnableMic;
        await audioTrack.applyConstraints({
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        }).catch(() => {});
      }

      localStreamRef.current = stream;
      setLocalStream(stream);
      setCameraState('on');
      if (shouldEnableMic) setMicState('on');
      setActiveStreamKind('camera');

      await syncTracksWithPeers(stream, 'camera');

      broadcast('media_state', { micState: shouldEnableMic ? 'on' : 'off', cameraState: 'on' });
    } catch (err) {
      console.error('Camera error:', err);
      setMediaError('Could not access camera. Please check camera permissions in your browser.');
    }
  }, [syncTracksWithPeers, broadcast, localRole]);

  const stopCamera = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => t.stop());
    }

    // Disable video tracks on senders
    peerConnections.current.forEach(pc => {
      const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
      videoSender?.replaceTrack(null).catch(console.warn);
    });

    setCameraState('off');
    setLocalStream(prev => {
      if (!prev) return null;
      const audio = prev.getAudioTracks();
      return audio.length > 0 ? new MediaStream(audio) : null;
    });

    if (activeStreamKind === 'camera') setActiveStreamKind(null);
    broadcast('media_state', { micState: micStateRef.current, cameraState: 'off' });
  }, [activeStreamKind, broadcast]);

  const toggleCamera = useCallback(() => {
    if (cameraState === 'on') stopCamera();
    else startCamera();
  }, [cameraState, startCamera, stopCamera]);

  const startMic = useCallback(async () => {
    try {
      setMediaError(null);
      if (localStreamRef.current) {
        const audioTracks = localStreamRef.current.getAudioTracks();
        if (audioTracks.length > 0) {
          audioTracks.forEach(t => (t.enabled = true));
          setMicState('on');
          broadcast('media_state', { micState: 'on', cameraState: cameraStateRef.current });
          return;
        }
      }

      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      const audioTrack = audioStream.getAudioTracks()[0];
      await audioTrack?.applyConstraints({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      }).catch(() => {});

      const newStream = localStreamRef.current
        ? new MediaStream([...localStreamRef.current.getTracks(), audioTrack])
        : new MediaStream([audioTrack]);

      localStreamRef.current = newStream;
      setLocalStream(newStream);
      setMicState('on');

      await syncTracksWithPeers(newStream, 'camera');

      broadcast('media_state', { micState: 'on', cameraState: cameraStateRef.current });
    } catch (err) {
      console.error('Mic error:', err);
      setMediaError('Could not access microphone. Check browser permissions.');
    }
  }, [syncTracksWithPeers, broadcast]);

  const stopMic = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => (t.enabled = false));
    }
    setMicState('off');
    broadcast('media_state', { micState: 'off', cameraState: cameraStateRef.current });
  }, [broadcast]);

  const toggleMic = useCallback(() => {
    if (micState === 'on') stopMic();
    else startMic();
  }, [micState, startMic, stopMic]);

  const startScreenShare = useCallback(async () => {
    try {
      setMediaError(null);
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const videoTrack = stream.getVideoTracks()[0];

      videoTrack.onended = () => {
        screenStreamRef.current = null;
        setScreenStream(null);
        setIsScreenSharing(false);
        setActiveStreamKind(cameraStateRef.current === 'on' ? 'camera' : null);
        // Re-attach camera
        if (localStreamRef.current && cameraStateRef.current === 'on') {
          syncTracksWithPeers(localStreamRef.current, 'camera');
        }
      };

      screenStreamRef.current = stream;
      setScreenStream(stream);
      setIsScreenSharing(true);
      setActiveStreamKind('screen');

      await syncTracksWithPeers(stream, 'screen');
    } catch (err) {
      console.error('Screen share error:', err);
      setMediaError('Screen sharing cancelled or denied.');
    }
  }, [syncTracksWithPeers]);

  const stopScreenShare = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;
    setScreenStream(null);
    setIsScreenSharing(false);
    setActiveStreamKind(cameraStateRef.current === 'on' ? 'camera' : null);

    if (localStreamRef.current && cameraStateRef.current === 'on') {
      syncTracksWithPeers(localStreamRef.current, 'camera');
    }
  }, [syncTracksWithPeers]);

  const toggleScreenShare = useCallback(() => {
    if (isScreenSharing) stopScreenShare();
    else startScreenShare();
  }, [isScreenSharing, startScreenShare, stopScreenShare]);

  // ─── Hand raise ───────────────────────────────────────────────────────────

  const [localHandRaised, setLocalHandRaised] = useState(false);
  const toggleHand = useCallback(() => {
    setLocalHandRaised(prev => {
      broadcast('hand_raise', { raised: !prev });
      return !prev;
    });
  }, [broadcast]);

  // ─── Broadcast custom event (exercises, etc.) ─────────────────────────────

  const broadcastEvent = useCallback((event: string, payload: Record<string, unknown>) => {
    broadcast(event, payload);
  }, [broadcast]);

  const onBroadcast = useCallback((event: string, handler: (payload: Record<string, unknown>) => void) => {
    channelRef.current?.on('broadcast', { event }, ({ payload }) => handler(payload));
  }, []);

  // ─── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    const peerConnectionsForCleanup = peerConnections.current;
    return () => {
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      peerConnectionsForCleanup.forEach(pc => pc.close());
      peerConnectionsForCleanup.clear();
    };
  }, []);

  return {
    localStream,
    screenStream,
    micState,
    cameraState,
    isScreenSharing,
    activeStreamKind,
    mediaError,
    localHandRaised,
    remotePeers,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    toggleHand,
    broadcastEvent,
    onBroadcast,
    channelRef,
    channel,
  };
}
