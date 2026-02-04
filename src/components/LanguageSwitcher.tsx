'use client';

import { useLanguage } from '@/context/LanguageContext';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-1">
      <button
        onClick={() => setLanguage('en')}
        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
          language === 'en' 
            ? 'bg-indigo-600 text-white shadow-lg' 
            : 'text-zinc-400 hover:text-white'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage('tr')}
        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
          language === 'tr' 
            ? 'bg-indigo-600 text-white shadow-lg' 
            : 'text-zinc-400 hover:text-white'
        }`}
      >
        TR
      </button>
    </div>
  );
}
