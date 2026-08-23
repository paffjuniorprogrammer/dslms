import {
  Mic, MicOff, Video, VideoOff, Hand,
  UserCircle, Shield, Volume2, X, Search, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Participant } from '@/types/live-class';

interface ParticipantsPanelProps {
  participants: Participant[];
  isHost: boolean;
  onToggleParticipantMic: (id: string) => void;
  onToggleParticipantCamera: (id: string) => void;
  onRemoveParticipant: (id: string) => void;
  onLowerHand: (id: string) => void;
}

export default function ParticipantsPanel({
  participants, isHost,
  onToggleParticipantMic, onToggleParticipantCamera, onRemoveParticipant, onLowerHand
}: ParticipantsPanelProps) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 25;
  const instructors = participants.filter(p => p.role === 'host' || p.role === 'teacher' || p.role === 'school_admin' || p.role === 'super_admin');
  const students = participants.filter(p => p.role === 'student');
  const raisedHands = participants.filter(p => p.handRaised);
  const filteredStudents = useMemo(() => students.filter(p => p.name.toLowerCase().includes(query.toLowerCase())), [students, query]);
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const visibleStudents = filteredStudents.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
        <UserCircle size={18} className="text-blue-600" />
        <h3 className="font-semibold text-slate-800 text-sm">Participants</h3>
        <span className="ml-auto text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium">
          {participants.length}
        </span>
      </div>

      {/* Hand raised banner */}
      {raisedHands.length > 0 && (
        <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-100">
          <div className="flex items-center gap-2 text-xs font-medium text-yellow-700">
            <Hand size={14} className="animate-pulse" />
            {raisedHands.length} hand{raisedHands.length > 1 ? 's' : ''} raised
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {/* Instructors & Staff */}
        {instructors.length > 0 && (
          <div className="px-4 py-2">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Instructors & Staff ({instructors.length})</div>
            {instructors.map(p => (
              <ParticipantRow
                key={p.id}
                participant={p}
                isHost={isHost}
                onToggleMic={() => onToggleParticipantMic(p.id)}
                onToggleCamera={() => onToggleParticipantCamera(p.id)}
                onRemove={() => onRemoveParticipant(p.id)}
                onLowerHand={() => onLowerHand(p.id)}
              />
            ))}
          </div>
        )}

        {/* Students */}
        <div className="px-4 py-2">
          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2"><span>Students ({students.length})</span>{filteredStudents.length !== students.length && <span>{filteredStudents.length} found</span>}</div>
          <div className="relative mb-2">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} placeholder="Find a student" className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
          </div>
          {visibleStudents.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No students have joined yet</p>
          ) : visibleStudents.map(p => (
            <ParticipantRow
              key={p.id}
              participant={p}
              isHost={isHost}
              onToggleMic={() => onToggleParticipantMic(p.id)}
              onToggleCamera={() => onToggleParticipantCamera(p.id)}
              onRemove={() => onRemoveParticipant(p.id)}
              onLowerHand={() => onLowerHand(p.id)}
            />
          ))}
          {totalPages > 1 && <div className="flex items-center justify-between pt-2 text-[11px] text-slate-500"><span>{currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, filteredStudents.length)} of {filteredStudents.length}</span><div className="flex gap-1"><button disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} className="rounded p-1 hover:bg-slate-100 disabled:opacity-30"><ChevronLeft size={15} /></button><button disabled={currentPage >= totalPages - 1} onClick={() => setPage(currentPage + 1)} className="rounded p-1 hover:bg-slate-100 disabled:opacity-30"><ChevronRight size={15} /></button></div></div>}
        </div>
      </div>
    </div>
  );
}

interface ParticipantRowProps {
  participant: Participant;
  isHost: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onRemove: () => void;
  onLowerHand: () => void;
}

function ParticipantRow({
  participant, isHost, onToggleMic, onToggleCamera, onRemove, onLowerHand
}: ParticipantRowProps) {
  return (
    <div className="flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-slate-50 group">
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center text-white text-xs font-bold">
          {participant.name.charAt(0).toUpperCase()}
        </div>
        {participant.handRaised && (
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-yellow-400 flex items-center justify-center">
            <Hand size={10} className="text-slate-900" />
          </div>
        )}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-slate-700 truncate">{participant.name}</span>
          {participant.role === 'host' && <Shield size={12} className="text-blue-500" />}
        </div>
        {participant.isSpeaking && (
          <div className="flex items-center gap-1 text-[10px] text-green-600">
            <Volume2 size={10} /> Speaking...
          </div>
        )}
      </div>

      {/* Media status indicators */}
      <div className="flex items-center gap-1">
        <span className={`p-1 rounded ${participant.mic === 'on' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
          {participant.mic === 'on' ? <Mic size={12} /> : <MicOff size={12} />}
        </span>
        <span className={`p-1 rounded ${participant.camera === 'on' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
          {participant.camera === 'on' ? <Video size={12} /> : <VideoOff size={12} />}
        </span>
      </div>

      {/* Host controls */}
      {isHost && participant.role !== 'host' && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {participant.handRaised && (
            <button
              onClick={onLowerHand}
              className="p-1 text-yellow-500 hover:bg-yellow-100 rounded"
              title="Lower hand"
            >
              <Hand size={14} />
            </button>
          )}
          <button
            onClick={onToggleMic}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
            title="Mute/Unmute"
          >
            {participant.mic === 'on' ? <Mic size={14} /> : <MicOff size={14} />}
          </button>
          <button
            onClick={onToggleCamera}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
            title="Camera on/off"
          >
            {participant.camera === 'on' ? <Video size={14} /> : <VideoOff size={14} />}
          </button>
          <button
            onClick={onRemove}
            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
            title="Remove"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
