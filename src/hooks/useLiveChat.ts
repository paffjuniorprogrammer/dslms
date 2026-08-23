/**
 * useLiveChat.ts
 *
 * Real-time chat hook for live class sessions.
 * - Sends messages via Supabase Realtime Broadcast (instant delivery)
 * - Persists messages to live_class_messages table
 * - Loads recent message history on join
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { ChatMessage, ParticipantRole } from '@/types/live-class';

interface UseLiveChatOptions {
  classId: string;
  senderId: string;
  senderName: string;
  senderRole: ParticipantRole;
  /** Shared channel from useWebRTC (optional — can create own if not shared) */
  channel?: RealtimeChannel | null;
}

export function useLiveChat({
  classId,
  senderId,
  senderName,
  senderRole,
  channel: externalChannel,
}: UseLiveChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const ownChannelRef = useRef<RealtimeChannel | null>(null);

  // Use external channel if available, otherwise create our own subscription
  const getChannel = useCallback((): RealtimeChannel | null => {
    return externalChannel ?? ownChannelRef.current;
  }, [externalChannel]);

  // ─── Load message history from DB ─────────────────────────────────────────

  useEffect(() => {
    if (!classId) return;

    setIsLoading(true);
    supabase
      .from('live_class_messages')
      .select('*')
      .eq('class_id', classId)
      .order('created_at', { ascending: true })
      .limit(100)
      .then(({ data, error }) => {
        if (!error && data) {
          const mapped: ChatMessage[] = data.map((row: {
            id: string;
            sender_id: string;
            sender_name: string;
            sender_role: string;
            message: string;
            pinned: boolean;
            created_at: string;
          }) => ({
            id: row.id,
            senderId: row.sender_id,
            senderName: row.sender_name,
            senderRole: row.sender_role as 'host' | 'student',
            text: row.message,
            timestamp: new Date(row.created_at).getTime(),
            pinned: row.pinned,
          }));
          setMessages(mapped);
        }
        setIsLoading(false);
      });
  }, [classId]);

  // ─── Subscribe to incoming broadcast chat messages ─────────────────────────

  useEffect(() => {
    if (!classId) return;

    // If no external channel, create our own
    if (!externalChannel) {
      const ch = supabase.channel(`live_class_chat:${classId}`, {
        config: { broadcast: { self: false } },
      });

      ch.on('broadcast', { event: 'chat' }, ({ payload }) => {
        const msg: ChatMessage = {
          id: payload.id as string,
          senderId: payload.senderId as string,
          senderName: payload.senderName as string,
          senderRole: (payload.senderRole as 'host' | 'student') || 'student',
          text: payload.text as string,
          timestamp: payload.timestamp as number,
          pinned: false,
        };
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      });

      ch.on('broadcast', { event: 'pin_message' }, ({ payload }) => {
        setMessages(prev =>
          prev.map(m => m.id === payload.messageId ? { ...m, pinned: !m.pinned } : m)
        );
      });

      ch.on('broadcast', { event: 'delete_message' }, ({ payload }) => {
        setMessages(prev => prev.filter(m => m.id !== payload.messageId));
      });

      ch.subscribe();
      ownChannelRef.current = ch;

      return () => {
        ch.unsubscribe();
        ownChannelRef.current = null;
      };
    } else {
      // Listen on the shared channel
      externalChannel.on('broadcast', { event: 'chat' }, ({ payload }) => {
        const msg: ChatMessage = {
          id: payload.id as string,
          senderId: payload.senderId as string,
          senderName: payload.senderName as string,
          senderRole: (payload.senderRole as 'host' | 'student') || 'student',
          text: payload.text as string,
          timestamp: payload.timestamp as number,
          pinned: false,
        };
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      });

      externalChannel.on('broadcast', { event: 'pin_message' }, ({ payload }) => {
        setMessages(prev =>
          prev.map(m => m.id === payload.messageId ? { ...m, pinned: !m.pinned } : m)
        );
      });

      externalChannel.on('broadcast', { event: 'delete_message' }, ({ payload }) => {
        setMessages(prev => prev.filter(m => m.id !== payload.messageId));
      });
    }
  }, [classId, externalChannel]);

  // ─── Send a chat message ───────────────────────────────────────────────────

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      senderId,
      senderName,
      senderRole,
      text: text.trim(),
      timestamp: Date.now(),
    };

    // Optimistic update
    setMessages(prev => [...prev, msg]);

    // Broadcast to room
    const ch = getChannel();
    ch?.send({
      type: 'broadcast',
      event: 'chat',
      payload: {
        id: msg.id,
        senderId: msg.senderId,
        senderName: msg.senderName,
        senderRole: msg.senderRole,
        text: msg.text,
        timestamp: msg.timestamp,
      },
    });

    // Persist to DB (best-effort — don't block UI)
    supabase.from('live_class_messages').insert({
      id: msg.id,
      class_id: classId,
      sender_id: senderId,
      sender_name: senderName,
      sender_role: senderRole,
      message: msg.text,
    }).then(({ error }) => {
      if (error) console.warn('Chat persist failed:', error.message);
    });
  }, [senderId, senderName, senderRole, classId, getChannel]);

  // ─── Pin / delete messages (host only) ────────────────────────────────────

  const pinMessage = useCallback(async (messageId: string) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, pinned: !m.pinned } : m));

    const ch = getChannel();
    ch?.send({ type: 'broadcast', event: 'pin_message', payload: { messageId } });

    // Update in DB
    const current = messages.find(m => m.id === messageId);
    if (current) {
      await supabase
        .from('live_class_messages')
        .update({ pinned: !current.pinned })
        .eq('id', messageId);
    }
  }, [messages, getChannel]);

  const deleteMessage = useCallback(async (messageId: string) => {
    setMessages(prev => prev.filter(m => m.id !== messageId));

    const ch = getChannel();
    ch?.send({ type: 'broadcast', event: 'delete_message', payload: { messageId } });

    await supabase.from('live_class_messages').delete().eq('id', messageId);
  }, [getChannel]);

  return {
    messages,
    isLoading,
    sendMessage,
    pinMessage,
    deleteMessage,
  };
}
