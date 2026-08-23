import { useState } from 'react';
import {
  Settings, Mail, MessageSquare, FileText, Award,
  ShieldCheck, Database, Users, Key,
  Bell, Save, CheckCircle2, RefreshCw, Server,
  Download
} from 'lucide-react';

type TabType =
  | 'general'
  | 'email'
  | 'sms'
  | 'exam'
  | 'certificate'
  | 'backup'
  | 'security'
  | 'audit'
  | 'roles'
  | 'api'
  | 'notifications';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('general');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states
  const [systemName, setSystemName] = useState('Driving School Management System');
  const [logoUrl, setLogoUrl] = useState('https://driveclass.rw/logo.png');
  const [timezone] = useState('Africa/Kigali (CAT UTC+2)');
  const [defaultLanguage, setDefaultLanguage] = useState('Kinyarwanda');
  const [darkMode, setDarkMode] = useState(false);

  // Email
  const [smtpHost, setSmtpHost] = useState('smtp.mailgun.org');
  const [smtpPort, setSmtpPort] = useState('587');
  const [senderEmail, setSenderEmail] = useState('noreply@driveclass.rw');

  // SMS
  const [smsGateway, setSmsGateway] = useState('MTN Rwanda Telecom API');
  const [senderId, setSenderId] = useState('DriveClass');

  // Exam
  const [passMark, setPassMark] = useState(80); // 80% pass mark (16/20)
  const [examDuration, setExamDuration] = useState(20); // 20 minutes
  const [randomizeQuestions, setRandomizeQuestions] = useState(true);

  // Certificate
  const [certPrefix, setCertPrefix] = useState('RW-CERT-2026-');
  const [issuerTitle, setIssuerTitle] = useState('Rwanda National Police Traffic Licensing Directorate');

  // Security
  const [enforce2FA, setEnforce2FA] = useState(true);
  const [minPassLength, setMinPassLength] = useState(8);

  // API Keys
  const [googleMapsKey, setGoogleMapsKey] = useState('AIzaSyD-RwandaMaps-APIKey-2026');
  const [momoApiSecret, setMomoApiSecret] = useState('momo_rw_secret_prod_88912');

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSaveAll = () => {
    triggerToast('⚙️ System settings saved and applied successfully!');
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'general', label: 'General Settings', icon: <Settings size={16} /> },
    { id: 'email', label: 'Email Settings', icon: <Mail size={16} /> },
    { id: 'sms', label: 'SMS Gateway', icon: <MessageSquare size={16} /> },
    { id: 'exam', label: 'Exam Configuration', icon: <FileText size={16} /> },
    { id: 'certificate', label: 'Certificates', icon: <Award size={16} /> },
    { id: 'backup', label: 'Database Backup', icon: <Database size={16} /> },
    { id: 'security', label: 'Security & 2FA', icon: <ShieldCheck size={16} /> },
    { id: 'audit', label: 'Audit Logs', icon: <Server size={16} /> },
    { id: 'roles', label: 'Roles & Permissions', icon: <Users size={16} /> },
    { id: 'api', label: 'API Integrations', icon: <Key size={16} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 size={18} className="text-emerald-400" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-extrabold text-[11px] border border-blue-200">
              Super Admin Control
            </span>
            <span className="text-xs text-slate-400 font-medium">DriveClass Rwanda Platform</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Configuration & Settings</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure core platform options, exam rules, SMS gateways, certificate issuance, security, and API keys.
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-sm transition-all self-start sm:self-auto"
        >
          <Save size={16} />
          <span>Save Changes</span>
        </button>
      </div>

      {/* Main Settings Body: Left Navigation Tabs + Right Form Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Vertical Menu */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-2 space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition-all text-left ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Right Settings Form Container */}
        <div className="lg:col-span-9 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-5 text-xs">
              <div className="pb-3 border-b border-slate-100">
                <h2 className="font-extrabold text-slate-900 text-sm">General Platform Information</h2>
                <p className="text-slate-400 mt-0.5">Basic identity branding and default system localization</p>
              </div>

              <div className="space-y-4 max-w-xl">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">System Name</label>
                  <input
                    type="text"
                    value={systemName}
                    onChange={e => setSystemName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">System Logo URL</label>
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={e => setLogoUrl(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Default Language</label>
                    <select
                      value={defaultLanguage}
                      onChange={e => setDefaultLanguage(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                    >
                      <option value="Kinyarwanda">Kinyarwanda</option>
                      <option value="English">English</option>
                      <option value="French">French</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Platform Timezone</label>
                    <input
                      type="text"
                      disabled
                      value={timezone}
                      className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-mono text-slate-600"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <span className="font-bold text-slate-800 block">Dark Mode Preference</span>
                    <span className="text-slate-400 text-[10px]">Enable dark theme option across platform UI</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={darkMode}
                    onChange={e => setDarkMode(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Email Settings */}
          {activeTab === 'email' && (
            <div className="space-y-5 text-xs">
              <div className="pb-3 border-b border-slate-100">
                <h2 className="font-extrabold text-slate-900 text-sm">SMTP Email Server Settings</h2>
                <p className="text-slate-400 mt-0.5">Automated password reset and school notification emails</p>
              </div>

              <div className="space-y-4 max-w-xl">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">SMTP Host Provider</label>
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={e => setSmtpHost(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Port</label>
                    <input
                      type="text"
                      value={smtpPort}
                      onChange={e => setSmtpPort(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">From Sender Address</label>
                    <input
                      type="email"
                      value={senderEmail}
                      onChange={e => setSenderEmail(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => triggerToast('✉️ Test email dispatched to superadmin@driveclass.rw')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl border border-slate-200"
                >
                  Send Test Email
                </button>
              </div>
            </div>
          )}

          {/* SMS Settings */}
          {activeTab === 'sms' && (
            <div className="space-y-5 text-xs">
              <div className="pb-3 border-b border-slate-100">
                <h2 className="font-extrabold text-slate-900 text-sm">SMS Gateway Configuration</h2>
                <p className="text-slate-400 mt-0.5">Student exam verification codes & classroom notifications</p>
              </div>

              <div className="space-y-4 max-w-xl">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">SMS Gateway Provider</label>
                  <select
                    value={smsGateway}
                    onChange={e => setSmsGateway(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  >
                    <option value="MTN Rwanda Telecom API">MTN Rwanda Telecom API</option>
                    <option value="Airtel Rwanda SMS Gateway">Airtel Rwanda SMS Gateway</option>
                    <option value="Twilio Global SMS">Twilio Global SMS</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sender ID Header</label>
                  <input
                    type="text"
                    value={senderId}
                    onChange={e => setSenderId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Exam Configuration */}
          {activeTab === 'exam' && (
            <div className="space-y-5 text-xs">
              <div className="pb-3 border-b border-slate-100">
                <h2 className="font-extrabold text-slate-900 text-sm">Provisional Exam Standards (National Driving Rules)</h2>
                <p className="text-slate-400 mt-0.5">Rules governing theory driving license practice and live exams</p>
              </div>

              <div className="space-y-4 max-w-xl">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Pass Score Mark (%)</label>
                    <input
                      type="number"
                      value={passMark}
                      onChange={e => setPassMark(Number(e.target.value))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                    />
                    <span className="text-[10px] text-slate-400">80% = Minimum 16 / 20 score</span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Exam Duration (Minutes)</label>
                    <input
                      type="number"
                      value={examDuration}
                      onChange={e => setExamDuration(Number(e.target.value))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                    />
                    <span className="text-[10px] text-slate-400">Standard 20 minutes countdown</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <span className="font-bold text-slate-800 block">Randomize Exam Questions</span>
                    <span className="text-slate-400 text-[10px]">Shuffle question options per student instance</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={randomizeQuestions}
                    onChange={e => setRandomizeQuestions(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Certificates */}
          {activeTab === 'certificate' && (
            <div className="space-y-5 text-xs">
              <div className="pb-3 border-b border-slate-100">
                <h2 className="font-extrabold text-slate-900 text-sm">Certificate Issuance Configuration</h2>
                <p className="text-slate-400 mt-0.5">Automatic PDF certificate generation settings</p>
              </div>

              <div className="space-y-4 max-w-xl">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Certificate Number Prefix</label>
                  <input
                    type="text"
                    value={certPrefix}
                    onChange={e => setCertPrefix(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Official Issuer Title</label>
                  <input
                    type="text"
                    value={issuerTitle}
                    onChange={e => setIssuerTitle(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Database Backup */}
          {activeTab === 'backup' && (
            <div className="space-y-5 text-xs">
              <div className="pb-3 border-b border-slate-100">
                <h2 className="font-extrabold text-slate-900 text-sm">Database Backup & Storage</h2>
                <p className="text-slate-400 mt-0.5">Automated snapshots and manual database backups</p>
              </div>

              <div className="space-y-4 max-w-xl">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                  <div>
                    <strong className="text-slate-900 block text-xs">Automated Daily Cloud Snapshot</strong>
                    <span className="text-slate-400 text-[11px]">Last backup completed today at 06:00 AM UTC</span>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-extrabold rounded-full text-[10px]">
                    Active
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => triggerToast('💾 Database snapshot backup initiated...')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
                  >
                    <Download size={14} /> Backup Database Now
                  </button>

                  <button
                    onClick={() => triggerToast('ℹ️ Backup history fetched.')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl border border-slate-200"
                  >
                    <RefreshCw size={14} /> View Backup History
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Security & 2FA */}
          {activeTab === 'security' && (
            <div className="space-y-5 text-xs">
              <div className="pb-3 border-b border-slate-100">
                <h2 className="font-extrabold text-slate-900 text-sm">Security Policy & Authentication</h2>
                <p className="text-slate-400 mt-0.5">Enforce multi-factor authentication & password rules</p>
              </div>

              <div className="space-y-4 max-w-xl">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <span className="font-bold text-slate-800 block">Enforce 2FA for Super Admin & School Admins</span>
                    <span className="text-slate-400 text-[10px]">Require TOTP authenticator code on login</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={enforce2FA}
                    onChange={e => setEnforce2FA(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Minimum Password Length</label>
                  <input
                    type="number"
                    value={minPassLength}
                    onChange={e => setMinPassLength(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Audit Logs */}
          {activeTab === 'audit' && (
            <div className="space-y-5 text-xs">
              <div className="pb-3 border-b border-slate-100">
                <h2 className="font-extrabold text-slate-900 text-sm">System Audit Trail</h2>
                <p className="text-slate-400 mt-0.5">Security access logs and administrative events</p>
              </div>

              <div className="space-y-2 font-mono text-[11px]">
                {[
                  { time: '2026-08-07 08:20:12', user: 'System Owner', action: 'Question Bank Export', ip: '197.243.0.12' },
                  { time: '2026-08-07 07:45:00', user: 'School Admin (Kigali Academy)', action: 'Live Class Started', ip: '197.243.14.88' },
                  { time: '2026-08-07 06:00:00', user: 'Cron Engine', action: 'Automated DB Snapshot', ip: '127.0.0.1' },
                  { time: '2026-08-06 18:30:41', user: 'System Owner', action: 'School Registration Approved', ip: '197.243.0.12' },
                ].map((log, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-slate-700">
                    <div>
                      <span className="text-slate-400 mr-3">{log.time}</span>
                      <strong className="text-slate-900">{log.user}:</strong> {log.action}
                    </div>
                    <span className="text-slate-400">{log.ip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Roles & Permissions */}
          {activeTab === 'roles' && (
            <div className="space-y-5 text-xs">
              <div className="pb-3 border-b border-slate-100">
                <h2 className="font-extrabold text-slate-900 text-sm">Access Control Matrix</h2>
                <p className="text-slate-400 mt-0.5">Permissions assigned to system roles</p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="grid grid-cols-4 font-extrabold text-slate-700 pb-2 border-b border-slate-200">
                  <span>Role</span>
                  <span>Manage Schools</span>
                  <span>Edit Questions</span>
                  <span>Issue Certs</span>
                </div>
                <div className="grid grid-cols-4 text-slate-800">
                  <span className="font-bold text-blue-600">Super Admin</span>
                  <span>Full Access</span>
                  <span>Full Access</span>
                  <span>Full Access</span>
                </div>
                <div className="grid grid-cols-4 text-slate-800">
                  <span className="font-bold text-slate-900">School Admin</span>
                  <span className="text-slate-400">Own School</span>
                  <span>Read Only</span>
                  <span>Own School</span>
                </div>
                <div className="grid grid-cols-4 text-slate-800">
                  <span className="font-bold text-slate-900">Teacher</span>
                  <span className="text-slate-400">No</span>
                  <span className="text-slate-400">Read Only</span>
                  <span className="text-slate-400">No</span>
                </div>
              </div>
            </div>
          )}

          {/* API Integrations */}
          {activeTab === 'api' && (
            <div className="space-y-5 text-xs">
              <div className="pb-3 border-b border-slate-100">
                <h2 className="font-extrabold text-slate-900 text-sm">External API Key Credentials</h2>
                <p className="text-slate-400 mt-0.5">Integrations for maps, mobile money payments, and notifications</p>
              </div>

              <div className="space-y-4 max-w-xl">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Google Maps Platform API Key</label>
                  <input
                    type="password"
                    value={googleMapsKey}
                    onChange={e => setGoogleMapsKey(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">MTN Mobile Money Gateway Secret</label>
                  <input
                    type="password"
                    value={momoApiSecret}
                    onChange={e => setMomoApiSecret(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <div className="space-y-5 text-xs">
              <div className="pb-3 border-b border-slate-100">
                <h2 className="font-extrabold text-slate-900 text-sm">Automated Alert Triggers</h2>
                <p className="text-slate-400 mt-0.5">System notifications sent to Super Admin</p>
              </div>

              <div className="space-y-3 max-w-xl">
                {[
                  'Alert when a driving school subscription expires in < 30 days',
                  'Alert on new school registration application',
                  'Alert on high classroom server load (> 80%)',
                  'Daily email summary of certificates generated',
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="font-bold text-slate-800">{item}</span>
                    <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded cursor-pointer" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
