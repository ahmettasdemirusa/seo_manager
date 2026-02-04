'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Site } from '@/types';
import { useLanguage } from '@/context/LanguageContext';
import confetti from 'canvas-confetti';
import HackerTerminal from '@/components/HackerTerminal';

export default function Home() {
  const { t } = useLanguage();
  const [showAddModal, setShowAddModal] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [sites, setSites] = useState<Site[]>([]);

  const handleAnalyze = async () => {
    if (!urlInput) return;
    setIsAnalyzing(true);
    
    try {
      // 1. Google Lighthouse (Client-Side Fetch - Free & No Server Quota)
      // We use the public PageSpeed API directly from the user's browser
      let lighthouseData = null;
      try {
        const googleUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(urlInput.startsWith('http') ? urlInput : `https://${urlInput}`)}&category=SEO&category=PERFORMANCE&category=ACCESSIBILITY&category=BEST_PRACTICES&strategy=mobile`;
        const lhRes = await fetch(googleUrl);
        if (lhRes.ok) {
            const json = await lhRes.json();
            lighthouseData = json.lighthouseResult;
        }
      } catch (e) {
        console.warn("Google PSI (Client) failed:", e);
      }

      // 2. Local Content Scan (Our Backend)
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            url: urlInput.startsWith('http') ? urlInput : `https://${urlInput}`,
            lighthouseData 
        }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        const cleanDomain = new URL(data.data.url).hostname;
        
        // Robust Screenshot Extraction
        let screenshot = null;
        if (lighthouseData?.audits) {
            // Try standard final screenshot (base64)
            if (lighthouseData.audits['final-screenshot']?.details?.data) {
                screenshot = lighthouseData.audits['final-screenshot'].details.data;
            } 
            // Try full page screenshot (base64)
            else if (lighthouseData.audits['full-page-screenshot']?.details?.screenshot?.data) {
                screenshot = lighthouseData.audits['full-page-screenshot'].details.screenshot.data;
            }
        }

        const newSite: Site = {
          id: Date.now().toString(),
          domain: cleanDomain,
          url: data.data.url,
          status: data.score >= 80 ? t('healthy') : data.score >= 50 ? t('optNeeded') : t('critical'),
          score: data.score,
          lastScan: 'Just now',
          issues: data.aiAnalysis?.suggestions?.length || 0,
          aiAnalysis: data.aiAnalysis,
          screenshot // Save robust screenshot
        };

        const updatedSites = [newSite, ...sites];
        setSites(updatedSites);
        localStorage.setItem('seo-sites', JSON.stringify(updatedSites));
        setShowAddModal(false);
        setUrlInput('');
        
        // 🎉 CELEBRATION
        if (data.score >= 90) {
            const duration = 3000;
            const end = Date.now() + duration;

            (function frame() {
            confetti({
                particleCount: 5,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#6366f1', '#ec4899', '#06b6d4'] // Neon colors
            });
            confetti({
                particleCount: 5,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#6366f1', '#ec4899', '#06b6d4']
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
            }());
        }

      } else {
        alert(t('analysisFailed') + ': ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error:', error);
      alert(t('analysisFailed'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Load from LocalStorage on mount
  React.useEffect(() => {
    const saved = localStorage.getItem('seo-sites');
    if (saved) {
      setSites(JSON.parse(saved));
    }
  }, []);

  const deleteSite = (e: React.MouseEvent, siteId: string) => {
    e.stopPropagation();
    const updated = sites.filter(s => s.id !== siteId);
    setSites(updated);
    localStorage.setItem('seo-sites', JSON.stringify(updated));
  };

  return (
    <main className="p-8 max-w-7xl mx-auto space-y-12">
      {/* Header */}
      <header className="flex justify-between items-center py-6 border-b border-white/5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            SEO <span className="gradient-text">AI Manager</span>
          </h1>
          <p className="text-zinc-400 mt-1">{t('subTitle')}</p>
        </div>
        <div className="flex gap-4 items-center">
          <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium shadow-lg shadow-indigo-500/20 transition-all"
            onClick={() => setShowAddModal(true)}>
            + {t('addSite')}
          </button>
        </div>
      </header>

      {/* Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-white/10 p-8 rounded-2xl w-full max-w-md space-y-6">
            <h3 className="text-xl font-semibold text-white">{t('addSite')}</h3>
            
            {isAnalyzing ? (
                <HackerTerminal />
            ) : (
                <>
                    <input 
                    type="text" 
                    placeholder="example.com" 
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    />
                    <div className="flex gap-3 justify-end">
                    <button 
                        onClick={() => setShowAddModal(false)}
                        className="px-4 py-2 text-zinc-400 hover:text-white"
                    >{t('cancel')}</button>
                    <button 
                        onClick={handleAnalyze}
                        disabled={isAnalyzing}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-2"
                    >
                        {t('startScan')}
                    </button>
                    </div>
                </>
            )}
          </div>
        </div>
      )}

      {/* Active Sites List */}
      <section>
        <div className="space-y-4">
          {sites.map((site, i) => (
            <div key={i} className="group glass-panel p-6 rounded-2xl flex items-center justify-between cursor-pointer relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="flex items-center gap-6 relative z-10">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-2xl shadow-lg
                  ${site.score >= 90 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-emerald-500/10' : 
                    site.score >= 70 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-amber-500/10' : 'bg-red-500/10 text-red-400 border border-red-500/20 shadow-red-500/10'}`}>
                  {site.domain.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white group-hover:text-indigo-300 transition-colors tracking-tight">{site.domain}</h3>
                  <p className="text-sm text-zinc-500 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-zinc-600 animate-pulse"></span>
                    {t('lastScan')}: {site.lastScan}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-8 relative z-10">
                <div className="text-right hidden md:block">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">{t('health')}</p>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold inline-block border ${site.status === t('healthy') || site.status === 'Healthy' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
                    {site.status === 'Healthy' ? t('healthy') : site.status === 'Optimization Needed' ? t('optNeeded') : t('critical')}
                  </div>
                </div>
                
                <div className="text-right min-w-[80px]">
                   <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">{t('score')}</p>
                   <p className="text-4xl font-black gradient-text">{site.score}</p>
                </div>

                <div className="flex gap-3">
                  <Link href={`/projects/${site.domain}`} className="px-5 py-2.5 bg-white/5 hover:bg-indigo-600 hover:text-white rounded-xl text-sm transition-all text-center flex items-center justify-center font-medium border border-white/10 hover:border-indigo-500 group-hover:shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                    {t('manage')} →
                  </Link>
                  <button 
                    onClick={(e) => deleteSite(e, site.id)}
                    className="px-4 py-2.5 bg-red-500/5 hover:bg-red-500/20 text-red-400 rounded-xl transition-all border border-red-500/10 hover:border-red-500/30"
                    title={t('delete')}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
