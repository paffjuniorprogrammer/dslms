import { useState, useRef, useEffect } from 'react';
import { Send, Pin, Trash2, MessageCircle } from 'lucide-react';
import type { ChatMessage } from '@/types/live-class';

interface ChatPanelProps {
  messages: ChatMessage[];
  currentUserId: string;
  onSend: (text: string) => void;
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
  isHost: boolean;
}

export default function ChatPanel({
  messages, currentUserId,
  onSend, onPin, onDelete, isHost
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSend(input.trim());
      setInput('');
    }
  };

  const pinnedMessages = messages.filter(m => m.pinned);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
        <MessageCircle size={18} className="text-blue-600" />
        <h3 className="font-semibold text-slate-800 text-sm">Chat</h3>
        <span className="ml-auto text-xs text-slate-400">{messages.length} messages</span>
      </div>

      {/* Pinned messages */}
      {pinnedMessages.length > 0 && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
          {pinnedMessages.map(msg => (
            <div key={msg.id} className="flex items-start gap-2 text-xs">
              <Pin size={12} className="text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <span className="font-semibold text-blue-700">{msg.senderName}: </span>
                <span className="text-slate-700">{msg.text}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-slate-400 text-sm py-8">
            No messages yet. Start the conversation!
          </div>
        ) : messages.map(msg => {
          const isOwn = msg.senderId === currentUserId;
          return (
            <div key={msg.id} className={`group flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
              <div className={`flex items-center gap-1.5 mb-0.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                  msg.senderRole === 'host' ? 'bg-blue-500' : 'bg-teal-500'
                }`}>
                  {msg.senderName.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-semibold text-slate-700">{msg.senderName}</span>
                {msg.senderRole === 'host' && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-bold">Host</span>
                )}
                {msg.senderRole === 'teacher' && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded font-bold">Teacher</span>
                )}
                {msg.senderRole === 'school_admin' && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-bold">School Admin</span>
                )}
                {msg.senderRole === 'super_admin' && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-bold">Admin</span>
                )}
                <span className="text-[10px] text-slate-400">{formatTime(msg.timestamp)}</span>
              </div>
              <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
                isOwn
                  ? 'bg-blue-600 text-white rounded-tr-sm'
                  : msg.senderRole === 'host' || msg.senderRole === 'teacher'
                    ? 'bg-blue-50 text-slate-700 border border-blue-100 rounded-tl-sm'
                    : 'bg-slate-100 text-slate-700 rounded-tl-sm'
              }`}>
                {msg.text}
              </div>
              {/* Actions */}
              <div className={`flex items-center gap-1 mt-0.5 ${isOwn ? 'flex-row-reverse' : ''} opacity-0 group-hover:opacity-100 transition-opacity`}>
                <button
                  onClick={() => onPin(msg.id)}
                  className="p-1 text-slate-400 hover:text-blue-500"
                  title="Pin message"
                >
                  <Pin size={12} />
                </button>
                {(isHost || isOwn) && (
                  <button
                    onClick={() => onDelete(msg.id)}
                    className="p-1 text-slate-400 hover:text-red-500"
                    title="Delete message"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-slate-200">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
