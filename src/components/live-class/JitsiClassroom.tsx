import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Loader2, Video, WifiOff } from 'lucide-react';

interface JitsiClassroomProps {
  classId: string;
  displayName: string;
  role: 'teacher' | 'student';
  onJoined?: () => void;
}

type JitsiApi = {
  dispose: () => void;
  executeCommand: (command: string, ...args: unknown[]) => void;
  addListener: (event: string, callback: (...args: unknown[]) => void) => void;
  removeAllListeners?: (event?: string) => void;
};

type JitsiApiConstructor = new (domain: string, options: Record<string, unknown>) => JitsiApi;

declare global {
  interface Window {
    JitsiMeetExternalAPI?: JitsiApiConstructor;
  }
}

const JITSI_DOMAIN = (import.meta.env.VITE_JITSI_DOMAIN || 'meet.jit.si').replace(/^https?:\/\//, '').replace(/\/$/, '');

function buildRoomName(classId: string) {
  return `dslms-live-${classId.replace(/[^a-zA-Z0-9-]/g, '-')}`;
}

export default function JitsiClassroom({ classId, displayName, role, onJoined }: JitsiClassroomProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<JitsiApi | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'joined' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let script: HTMLScriptElement | null = null;

    const mount = () => {
      if (cancelled || !containerRef.current || !window.JitsiMeetExternalAPI) return;
      apiRef.current?.dispose();
      containerRef.current.replaceChildren();

      const isTeacher = role === 'teacher';
      const api = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
        roomName: buildRoomName(classId),
        parentNode: containerRef.current,
        width: '100%',
        height: '100%',
        userInfo: { displayName },
        configOverwrite: {
          prejoinConfig: { enabled: false },
          startWithAudioMuted: !isTeacher,
          startWithVideoMuted: !isTeacher,
          disableAP: true,
          disableDeepLinking: true,
          enableNoisyMicDetection: true,
          enableWelcomePage: false,
          enableClosePage: false,
          resolution: 360,
          constraints: {
            video: { height: { ideal: 360, max: 480 }, width: { ideal: 640, max: 854 }, frameRate: { ideal: 24, max: 30 } },
          },
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: isTeacher
            ? ['microphone', 'camera', 'desktop', 'chat', 'raisehand', 'tileview', 'settings', 'hangup']
            : ['microphone', 'camera', 'chat', 'raisehand', 'tileview', 'settings', 'hangup'],
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
          HIDE_INVITE_MORE_HEADER: true,
          MOBILE_APP_PROMO: false,
          SHOW_JITSI_WATERMARK: false,
        },
      });

      apiRef.current = api;
      setStatus('ready');
      api.addListener('videoConferenceJoined', () => {
        setStatus('joined');
        onJoined?.();
      });
      api.addListener('readyToClose', () => setStatus('ready'));
      api.addListener('errorOccurred', () => {
        setStatus('error');
        setError('Jitsi could not connect to the classroom. Please refresh and try again.');
      });
    };

    if (window.JitsiMeetExternalAPI) {
      mount();
    } else {
      script = document.createElement('script');
      script.src = `https://${JITSI_DOMAIN}/external_api.js`;
      script.async = true;
      script.onload = mount;
      script.onerror = () => {
        setStatus('error');
        setError('Could not load the Jitsi classroom service.');
      };
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      apiRef.current?.dispose();
      apiRef.current = null;
      if (script?.parentNode) script.parentNode.removeChild(script);
    };
  }, [classId, displayName, role, onJoined]);

  return (
    <div className="relative w-full h-full min-h-[320px] bg-slate-950 overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />
      {status !== 'joined' && status !== 'error' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-950/90 text-slate-200 pointer-events-none">
          {status === 'loading' ? <Loader2 size={30} className="animate-spin text-blue-400" /> : <Video size={30} className="text-blue-400" />}
          <span className="text-sm font-bold">{status === 'loading' ? 'Loading classroom…' : 'Connecting to classroom…'}</span>
          <span className="text-xs text-slate-500">{role === 'teacher' ? 'Your microphone and camera are ready when Jitsi opens.' : 'You join muted; the teacher’s media will appear automatically.'}</span>
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-slate-950 text-center p-6">
          <WifiOff size={32} className="text-rose-400" />
          <p className="text-sm font-bold text-white">Classroom connection unavailable</p>
          <p className="max-w-md text-xs text-slate-400">{error}</p>
          <button onClick={() => window.location.reload()} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500">
            <ExternalLink size={14} /> Refresh classroom
          </button>
        </div>
      )}
    </div>
  );
}
