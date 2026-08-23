import {
  Mic, MicOff, Video, VideoOff, ScreenShare, ScreenShareOff,
  Hand, PhoneOff, Settings
} from 'lucide-react';
import type { MediaState } from '@/types/live-class';

interface MediaControlsProps {
  micState: MediaState;
  cameraState: MediaState;
  isScreenSharing: boolean;
  handRaised: boolean;
  isHost: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onToggleHand: () => void;
  onOpenSettings?: () => void;
  onLeave: () => void;
}

export default function MediaControls({
  micState, cameraState, isScreenSharing, handRaised, isHost,
  onToggleMic, onToggleCamera, onToggleScreenShare, onToggleHand, onOpenSettings, onLeave
}: MediaControlsProps) {
  return (
    <div className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-900/95 border-t border-white/10">
      <ControlButton
        active={micState === 'on'}
        activeColor="bg-slate-700 hover:bg-slate-600"
        inactiveColor="bg-red-600 hover:bg-red-700"
        onClick={onToggleMic}
        icon={micState === 'on' ? <Mic size={20} /> : <MicOff size={20} />}
        label={micState === 'on' ? 'Mute' : 'Unmute'}
      />

      <ControlButton
        active={cameraState === 'on'}
        activeColor="bg-slate-700 hover:bg-slate-600"
        inactiveColor="bg-red-600 hover:bg-red-700"
        onClick={onToggleCamera}
        icon={cameraState === 'on' ? <Video size={20} /> : <VideoOff size={20} />}
        label={cameraState === 'on' ? 'Stop Video' : 'Start Video'}
      />

      {isHost && (
        <ControlButton
          active={isScreenSharing}
          activeColor="bg-blue-600 hover:bg-blue-700"
          inactiveColor="bg-slate-700 hover:bg-slate-600"
          onClick={onToggleScreenShare}
          icon={isScreenSharing ? <ScreenShareOff size={20} /> : <ScreenShare size={20} />}
          label={isScreenSharing ? 'Stop Share' : 'Share Screen'}
        />
      )}

      {!isHost && (
        <ControlButton
          active={handRaised}
          activeColor="bg-yellow-500 hover:bg-yellow-600 text-slate-900"
          inactiveColor="bg-slate-700 hover:bg-slate-600"
          onClick={onToggleHand}
          icon={<Hand size={20} />}
          label={handRaised ? 'Lower Hand' : 'Raise Hand'}
        />
      )}

      <div className="w-px h-8 bg-white/10 mx-1" />

      <ControlButton
        active={false}
        activeColor=""
        inactiveColor="bg-slate-700 hover:bg-slate-600"
        onClick={onOpenSettings || (() => {})}
        icon={<Settings size={20} />}
        label="Settings"
      />

      <ControlButton
        active={false}
        activeColor=""
        inactiveColor="bg-red-600 hover:bg-red-700"
        onClick={onLeave}
        icon={<PhoneOff size={20} />}
        label="Leave"
      />
    </div>
  );
}

interface ControlButtonProps {
  active: boolean;
  activeColor: string;
  inactiveColor: string;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function ControlButton({ active, activeColor, inactiveColor, onClick, icon, label }: ControlButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-white transition-all ${active ? activeColor : inactiveColor}`}
      title={label}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
