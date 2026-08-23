import { useState } from 'react';
import { Bell, Search, MessageSquare, Calendar, ChevronDown, CheckCircle2, User, Settings, LogOut } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface TopBarProps {
  userName: string;
  userRole: string;
  avatarInitials?: string;
  onLogout?: () => void;
}

export default function TopBar({ userName, userRole, avatarInitials, onLogout }: TopBarProps) {
  const { language, setLanguage, t } = useI18n();
  const [showNotif, setShowNotif] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const notifications = [
    { id: 1, text: 'Nyagatare Driving School registered', time: '10 mins ago', unread: true },
    { id: 2, text: 'ABC Driving School renewed subscription', time: '45 mins ago', unread: true },
    { id: 3, text: 'Teacher Jean Claude account activated', time: '2 hours ago', unread: false },
    { id: 4, text: 'Certificate #RW-2026-902 generated', time: '4 hours ago', unread: false },
    { id: 5, text: 'NorthSide Drivers subscription expired', time: '1 day ago', unread: false },
  ];

  const messages = [
    { id: 1, sender: 'Kigali Driving Academy', text: 'Requesting API credentials for automated student registration...', time: '15m ago', unread: true },
    { id: 2, sender: 'Ministry of Infrastructure (MININFRA)', text: 'Quarterly compliance audit report submitted.', time: '1h ago', unread: true },
    { id: 3, sender: 'Gakeke School Admin', text: 'Payment receipt uploaded for Pro tier renewal.', time: '3h ago', unread: false },
  ];

  // Current formatted date
  const todayDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 shadow-xs">
      {/* Search Bar */}
      <div className="relative w-36 sm:w-80">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder={t('search')}
          className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all placeholder:text-slate-400"
        />
      </div>

      {/* Right Navigation Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => setLanguage(language === 'en' ? 'rw' : 'en')}
          className="inline-flex items-center justify-center h-9 min-w-11 px-2 rounded-xl border border-slate-200 bg-white text-[10px] font-extrabold text-blue-700 hover:bg-blue-50 transition-colors"
          aria-label={t('language')}
        >
          {language === 'en' ? 'RW' : 'EN'}
        </button>
        {/* Date Display */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/60 text-slate-600 text-xs font-semibold">
          <Calendar size={14} className="text-blue-600" />
          <span>{todayDate}</span>
        </div>

        {/* Messages Dropdown */}
        <div className="relative">
          <button
            onClick={() => { setShowMessages(!showMessages); setShowNotif(false); setShowProfileMenu(false); }}
            className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-600 transition-all"
            title={t('messages')}
          >
            <MessageSquare size={17} />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white text-[9px] font-black rounded-full flex items-center justify-center">2</span>
          </button>

          {showMessages && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 p-2 animate-in fade-in slide-in-from-top-2">
              <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-xs">System Inbox</h3>
                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">2 Unread</span>
              </div>
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {messages.map((m) => (
                  <div key={m.id} className={`p-3 hover:bg-slate-50 rounded-xl transition-all ${m.unread ? 'bg-blue-50/40' : ''}`}>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-extrabold text-slate-800">{m.sender}</p>
                      <span className="text-[10px] text-slate-400">{m.time}</span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">{m.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => { setShowNotif(!showNotif); setShowMessages(false); setShowProfileMenu(false); }}
            className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-600 transition-all"
            title={t('notifications')}
          >
            <Bell size={17} />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white"></span>
          </button>

          {showNotif && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 p-2 animate-in fade-in slide-in-from-top-2">
              <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-xs">System Audit Alerts</h3>
                <span className="text-[10px] text-slate-400">Real-Time</span>
              </div>
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className={`p-3 hover:bg-slate-50 rounded-xl transition-all ${n.unread ? 'bg-emerald-50/40' : ''}`}>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 size={14} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-slate-800 leading-snug">{n.text}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{n.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile Avatar Dropdown */}
        <div className="relative pl-2 border-l border-slate-200">
          <button
            onClick={() => { setShowProfileMenu(!showProfileMenu); setShowNotif(false); setShowMessages(false); }}
            className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-50 transition-all"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
              {avatarInitials || 'SA'}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-bold text-slate-900 leading-tight">{userName}</div>
              <div className="text-[10px] text-blue-600 font-extrabold leading-tight">{userRole}</div>
            </div>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 top-12 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 p-1.5 animate-in fade-in slide-in-from-top-2">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-800">{userName}</p>
                <p className="text-[10px] text-slate-500">{userRole}</p>
              </div>
              <div className="py-1 space-y-0.5">
                <button className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-xl">
                  <User size={14} /> Profile Settings
                </button>
                <button className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-xl">
                  <Settings size={14} /> System Configuration
                </button>
              </div>
              <div className="pt-1 border-t border-slate-100">
                <button
                  onClick={onLogout}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl"
                >
                  <LogOut size={14} /> {t('logout')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
