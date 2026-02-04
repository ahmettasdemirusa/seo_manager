'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { dictionary, Language } from '@/lib/dictionary';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof dictionary['en']) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('app-language') as Language;
    if (saved && (saved === 'en' || saved === 'tr')) {
      setLanguage(saved);
    }
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('app-language', lang);
  };

  const t = (key: keyof typeof dictionary['en']) => {
    return dictionary[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
