/**
 * useLivePresence.ts
 *
 * Tracks participant presence in a live class room via Supabase Realtime.
 * Works alongside useWebRTC — merges remote peer video/audio state with
 * presence data so the UI has a single source of truth for the participant list.
 */

import { useCallback, useEffect, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Participant, MediaState, ParticipantRole } from '@/types/live-class';
import type { RemotePeerState } from './useWebRTC';

interface UseLivePresenceOptions {
  classId: string;
  localPeerId: string;
  localName: string;
  localRole: ParticipantRole;
  remotePeers: Map<string, RemotePeerState>;
  localMicState: MediaState;
  localCameraState: MediaState;
  localHandRaised: boolean;
  /** Shared channel from useWebRTC */
  channelRef: React.MutableRefObject<RealtimeChannel | null>;
}

export function useLivePresence({
  classId,
  localPeerId,
  localName,
  localRole,
  remotePeers,
  localMicState,
  localCameraState,
  localHandRaised,
  channelRef,
}: UseLivePresenceOptions) {
  const [participants, setParticipants] = useState<Participant[]>([]);

  // ─── Build participant list from local state + remote peers ───────────────

  useEffect(() => {
    const localParticipant: Participant = {
      id: localPeerId,
      name: localName,
      role: localRole,
      mic: localMicState,
      camera: localCameraState,
      handRaised: localHandRaised,
      isHost: localRole === 'host' || localRole === 'teacher' || localRole === 'school_admin' || localRole === 'super_admin',
    };

    const remoteParticipants: Participant[] = Array.from(remotePeers.values()).map(peer => ({
      id: peer.peerId,
      name: peer.name,
      role: peer.role,
      mic: peer.micState,
      camera: peer.cameraState,
      handRaised: peer.handRaised,
      isSpeaking: peer.isSpeaking,
      isHost: peer.role === 'host' || peer.role === 'teacher' || peer.role === 'school_admin' || peer.role === 'super_admin',
    }));

    setParticipants([localParticipant, ...remoteParticipants]);
  }, [localPeerId, localName, localRole, localMicState, localCameraState, localHandRaised, remotePeers]);

  // ─── Host governance controls ──────────────────────────────────────────────

  const broadcast = useCallback((event: string, payload: Record<string, unknown>) => {
    channelRef.current?.send({
      type: 'broadcast',
      event,
      payload: { from: localPeerId, ...payload },
    });
  }, [channelRef, localPeerId]);

  const muteParticipant = useCallback((targetPeerId: string) => {
    broadcast('mute_participant', { target: targetPeerId });
  }, [broadcast]);

  const muteAll = useCallback(() => {
    broadcast('mute_all', {});
  }, [broadcast]);

  const disableAllCameras = useCallback(() => {
    broadcast('disable_all_cameras', {});
  }, [broadcast]);

  const lowerAllHands = useCallback(() => {
    broadcast('lower_all_hands', {});
  }, [broadcast]);

  const removeParticipant = useCallback((targetPeerId: string) => {
    broadcast('remove_participant', { target: targetPeerId });
  }, [broadcast]);

  // ─── Listen for host governance commands (students) ────────────────────────

  useEffect(() => {
    if (!classId || !localPeerId || localRole !== 'student') return;

    // These events are received by students; use the shared channel
    const ch = channelRef.current;
    if (!ch) return;

    const handleMuteAll = () => {
      // Students would mute themselves locally — handled in parent via event
    };

    ch.on('broadcast', { event: 'mute_all' }, handleMuteAll);
    ch.on('broadcast', { event: 'mute_participant' }, ({ payload }) => {
      if (payload.target === localPeerId) {
        // Parent handles this by toggling mic off
      }
    });

    ch.on('broadcast', { event: 'remove_participant' }, ({ payload }) => {
      if (payload.target === localPeerId) {
        // Force redirect — will be handled in the room component
        window.dispatchEvent(new CustomEvent('live_class_removed'));
      }
    });
  }, [classId, localPeerId, localRole, channelRef]);

  // ─── Subscribe to exercise events ─────────────────────────────────────────

  const [exerciseLaunchPayload, setExerciseLaunchPayload] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const ch = channelRef.current;
    if (!ch) return;

    ch.on('broadcast', { event: 'exercise_launch' }, ({ payload }) => {
      if (localRole !== 'host') {
        setExerciseLaunchPayload(payload);
      }
    });
  }, [channelRef, localRole]);

  const clearExerciseLaunch = useCallback(() => {
    setExerciseLaunchPayload(null);
  }, []);

  // ─── Expose utility helpers ────────────────────────────────────────────────

  const getParticipant = useCallback((peerId: string) => {
    return participants.find(p => p.id === peerId) ?? null;
  }, [participants]);

  const hostParticipant = participants.find(p => p.isHost) ?? null;
  const studentParticipants = participants.filter(p => !p.isHost);
  const raisedHandCount = studentParticipants.filter(p => p.handRaised).length;

  // Also supply per-peer streams from remotePeers map
  const getRemoteStream = useCallback((peerId: string): MediaStream | null => {
    return remotePeers.get(peerId)?.stream ?? null;
  }, [remotePeers]);

  return {
    participants,
    hostParticipant,
    studentParticipants,
    raisedHandCount,
    getParticipant,
    getRemoteStream,

    // Host controls
    muteParticipant,
    muteAll,
    disableAllCameras,
    lowerAllHands,
    removeParticipant,

    // Exercise signals
    exerciseLaunchPayload,
    clearExerciseLaunch,
  };
}
