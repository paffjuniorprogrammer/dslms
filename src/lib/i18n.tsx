import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Language = 'en' | 'rw';

const translations = {
  en: {
    dashboard: 'Dashboard', schools: 'Schools', questionBank: 'Question Bank', settings: 'Settings',
    teachers: 'Teachers', students: 'Students', liveClasses: 'Live Classes', physicalClasses: 'Physical Classes', questions: 'Questions',
    exams: 'Exams', certificates: 'Certificates', reports: 'Reports', subscription: 'Subscription',
    myClasses: 'My Classes', results: 'Results', classesJoin: 'Classes & Join', profile: 'My Profile',
    search: 'Search', notifications: 'Notifications', messages: 'Messages', logout: 'Logout',
    systemOwner: 'System Owner', superAdmin: 'Super Admin', schoolAdmin: 'School Admin', teacher: 'Teacher', student: 'Student',
    portal: 'Portal', language: 'Language', english: 'English', kinyarwanda: 'Kinyarwanda',
  },
  rw: {
    dashboard: 'Ahabanza', schools: 'Amashuri', questionBank: 'Ububiko bw’ibibazo', settings: 'Igenamiterere',
    teachers: 'Abarimu', students: 'Abanyeshuri', liveClasses: 'Amasomo yo kuri murandasi', physicalClasses: 'Amasomo yo mu ishuri', questions: 'Ibibazo',
    exams: 'Ibizamini', certificates: 'Impamyabushobozi', reports: 'Raporo', subscription: 'Ifatabuguzi',
    myClasses: 'Amasomo yanjye', results: 'Ibisubizo', classesJoin: 'Amasomo no kwinjira', profile: 'Umwirondoro wanjye',
    search: 'Shakisha', notifications: 'Amatangazo', messages: 'Ubutumwa', logout: 'Sohoka',
    systemOwner: 'Nyir’ikorwa', superAdmin: 'Umuyobozi mukuru', schoolAdmin: 'Umuyobozi w’ishuri', teacher: 'Umwarimu', student: 'Umunyeshuri',
    portal: 'Urubuga', language: 'Ururimi', english: 'Icyongereza', kinyarwanda: 'Ikinyarwanda',
  },
} as const;

type TranslationKey = keyof typeof translations.en;
type I18nValue = { language: Language; setLanguage: (language: Language) => void; t: (key: TranslationKey) => string };
const I18nContext = createContext<I18nValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('dslms-language') as Language) || 'en');
  useEffect(() => localStorage.setItem('dslms-language', language), [language]);
  const value = useMemo(() => ({ language, setLanguage, t: (key: TranslationKey) => translations[language][key] }), [language]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside LanguageProvider');
  return value;
}
