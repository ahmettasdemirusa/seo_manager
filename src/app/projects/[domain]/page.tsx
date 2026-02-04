'use client';

import React, { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { Site } from '@/types';
import { useLanguage } from '@/context/LanguageContext';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import LinkVisualizer from '@/components/LinkVisualizer';
import BrokenLinkChecker from '@/components/BrokenLinkChecker';
import { generatePdfReport } from '@/lib/pdfGenerator';
import WarRoom from '@/components/WarRoom';
import SeoCopilot from '@/components/SeoCopilot';

export default function ProjectDetail({ params }: { params: Promise<{ domain: string }> }) {
  const { t } = useLanguage();
  const resolvedParams = use(params);
  const [site, setSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'technical' | 'intelligence' | 'competitor' | 'marketing' | 'plan' | 'tools'>('overview');
  
  // Actions states
  const [isRescanning, setIsRescanning] = useState(false);
  const [fixing, setFixing] = useState<string | null>(null);
  const [compUrl, setCompUrl] = useState('');
  const [compData, setCompData] = useState<any>(null);
  const [analyzingComp, setAnalyzingComp] = useState(false);
  const [sitemapUrls, setSitemapUrls] = useState<string[]>([]);
  const [loadingSitemap, setLoadingSitemap] = useState(false);
  const [showImages, setShowImages] = useState(false);
  const [targetKeyword, setTargetKeyword] = useState('');
  const [keywordAnalysis, setKeywordAnalysis] = useState<any>(null);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [scanStrategy, setScanStrategy] = useState<'mobile' | 'desktop'>('mobile');

  useEffect(() => {
    const saved = localStorage.getItem('seo-sites');
    if (saved) {
      const sites = JSON.parse(saved);
      const found = sites.find((s: Site) => s.domain === decodeURIComponent(resolvedParams.domain));
      if (found) setSite(found);
    }
    setLoading(false);
  }, [resolvedParams.domain]);

  const handleRescan = async () => {
    if (!site) return;
    setIsRescanning(true);
    try {
      let lighthouseData = null;
      try {
        const googleUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(site.url)}&category=SEO&category=PERFORMANCE&category=ACCESSIBILITY&category=BEST_PRACTICES&strategy=${scanStrategy}`;
        const lhRes = await fetch(googleUrl);
        if (lhRes.ok) {
            const json = await lhRes.json();
            lighthouseData = json.lighthouseResult;
        }
      } catch (e) {}

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: site.url, lighthouseData, strategy: scanStrategy }),
      });

      const data = await response.json();
      if (data.status === 'success') {
        let screenshot = null;
        if (lighthouseData?.audits) {
            if (lighthouseData.audits['final-screenshot']?.details?.data) screenshot = lighthouseData.audits['final-screenshot'].details.data;
            else if (lighthouseData.audits['full-page-screenshot']?.details?.screenshot?.data) screenshot = lighthouseData.audits['full-page-screenshot'].details.screenshot.data;
        }

        const updatedSite: Site = {
          ...site,
          score: data.score,
          lastScan: 'Just now',
          status: data.score >= 80 ? t('healthy') : data.score >= 50 ? t('optNeeded') : t('critical'),
          issues: data.aiAnalysis?.suggestions?.length || 0,
          aiAnalysis: data.aiAnalysis,
          screenshot: screenshot || site.screenshot,
          history: [...(site.history || []), { date: new Date().toLocaleDateString(), score: data.score }]
        };
        setSite(updatedSite);
        
        const saved = localStorage.getItem('seo-sites');
        if (saved) {
          const sites = JSON.parse(saved);
          const updated = sites.map((s: Site) => s.id === site.id ? updatedSite : s);
          localStorage.setItem('seo-sites', JSON.stringify(updated));
        }
        alert(t('scanComplete'));
      } else {
        alert(t('analysisFailed') + ': ' + data.error);
      }
    } catch (e) {
      alert(t('analysisFailed'));
    } finally {
      setIsRescanning(false);
    }
  };

  const handleAiFix = async (type: 'title' | 'description' | 'h1') => {
    if (!site) return;
    setFixing(type);
    try {
        const context = `${site.aiAnalysis?.data?.title} ${site.aiAnalysis?.data?.description} ${site.aiAnalysis?.data?.keywords?.map((k:any)=>k.word).join(' ')}`;
        const res = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, content: context, current: type === 'title' ? site.aiAnalysis?.data?.title : '' })
        });
        const data = await res.json();
        if (data.result) {
            const newData = { ...site.aiAnalysis.data };
            if (type === 'title') newData.title = data.result;
            if (type === 'description') newData.description = data.result;
            if (type === 'h1') newData.h1 = data.result;
            const newSite = { ...site, aiAnalysis: { ...site.aiAnalysis, data: newData } };
            setSite(newSite);
            
            const saved = localStorage.getItem('seo-sites');
            if (saved) {
                const sites = JSON.parse(saved);
                const updated = sites.map((s: Site) => s.id === site.id ? newSite : s);
                localStorage.setItem('seo-sites', JSON.stringify(updated));
            }
        }
    } catch(e) {
        alert('AI Generation failed');
    } finally {
        setFixing(null);
    }
  };

  const toggleTask = (taskId: string) => {
    setCompletedTasks(prev => 
        prev.includes(taskId) 
        ? prev.filter(id => id !== taskId) 
        : [...prev, taskId]
    );
  };

  const handleCompetitorAnalysis = async () => {
    if (!compUrl) return;
    setAnalyzingComp(true);
    try {
        let lighthouseData = null;
        try {
            const googleUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(compUrl.startsWith('http') ? compUrl : `https://${compUrl}`)}&category=SEO&category=PERFORMANCE&category=ACCESSIBILITY&category=BEST_PRACTICES&strategy=mobile`;
            const lhRes = await fetch(googleUrl);
            if (lhRes.ok) {
                const json = await lhRes.json();
                lighthouseData = json.lighthouseResult;
            }
        } catch (e) {}

        const res = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: compUrl.startsWith('http') ? compUrl : `https://${compUrl}`, lighthouseData })
        });
        const data = await res.json();
        if (data.status === 'success') {
            setCompData(data.data);
        }
    } catch(e) {
        alert(t('analysisFailed'));
    } finally {
        setAnalyzingComp(false);
    }
  };

  const loadSitemap = async () => {
    setLoadingSitemap(true);
    try {
        const res = await fetch('/api/sitemap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: site?.url })
        });
        const data = await res.json();
        setSitemapUrls(data.urls || []);
    } catch(e) {}
    setLoadingSitemap(false);
  };

  const analyzeTargetKeyword = () => {
    if (!targetKeyword || !site) return;
    const k = targetKeyword.toLowerCase();
    const title = site.aiAnalysis?.data?.title?.toLowerCase() || '';
    const desc = site.aiAnalysis?.data?.description?.toLowerCase() || '';
    const h1 = site.aiAnalysis?.data?.h1?.toLowerCase() || '';
    const url = site.url.toLowerCase();
    const contentKeywords = site.aiAnalysis?.data?.keywords || [];
    const foundKeyword = contentKeywords.find((item: any) => item.word.toLowerCase() === k);
    const density = foundKeyword ? parseFloat(foundKeyword.density) : 0;
    
    let score = 0;
    if (title.includes(k)) score += 30;
    if (desc.includes(k)) score += 20;
    if (h1.includes(k)) score += 20;
    if (url.includes(k)) score += 10;
    if (density > 0.5) score += 20;
    
    setKeywordAnalysis({ score, density, inTitle: title.includes(k), inDesc: desc.includes(k), inH1: h1.includes(k), inUrl: url.includes(k) });
  };

  if (loading) return <div className="p-8 text-zinc-400">Loading...</div>;
  if (!site) return <div className="p-8 text-center text-red-400">{t('notFound')}</div>;

  return (
    <main className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-zinc-500 mb-4">
        <Link href="/" className="hover:text-white transition-colors">{t('dashboard')}</Link>
        <span>/</span>
        <span className="text-white">{site.domain}</span>
      </div>

      <header className="flex justify-between items-start">
        <div>
          <div className="print-header">
            <h1 className="text-3xl font-bold">SEO Report</h1>
            <p className="text-sm text-gray-500">Generated by SEO AI Manager</p>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">{site.domain}</h1>
          <a href={site.url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-1 no-print">
            {site.url} ↗
          </a>
        </div>
        <div className="flex gap-3 no-print">
          <button onClick={() => generatePdfReport(site)} className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-colors flex items-center gap-2">
            <span>🖨️</span> {t('exportPdf')}
          </button>
          
          {/* Strategy Toggle */}
          <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
            <button 
                onClick={() => setScanStrategy('mobile')}
                className={`px-3 py-1 text-xs rounded-md transition-all ${scanStrategy === 'mobile' ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'}`}
            >
                📱 Mobile
            </button>
            <button 
                onClick={() => setScanStrategy('desktop')}
                className={`px-3 py-1 text-xs rounded-md transition-all ${scanStrategy === 'desktop' ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'}`}
            >
                💻 Desktop
            </button>
          </div>

          <button onClick={handleRescan} disabled={isRescanning} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg font-medium disabled:opacity-50 flex items-center gap-2">
            {isRescanning ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>{t('scanning')}</> : t('runAnalysis')}
          </button>
        </div>
      </header>

      {/* Tabs Navigation */}
      <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/5 no-print">
        {['overview', 'content', 'technical', 'intelligence', 'competitor', 'marketing', 'plan', 'tools'].map((tab) => (
            <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`flex-1 py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
                    activeTab === tab 
                    ? 'bg-indigo-600/20 text-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.3)] border border-indigo-500/30' 
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
            >
                {t(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}` as any)}
            </button>
        ))}
      </div>

      {/* TAB: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Global War Room Monitor */}
            <div className="w-full">
                <WarRoom isScanning={isRescanning} />
            </div>

            {/* Google Lighthouse Stats */}
            {site.aiAnalysis?.data?.scores && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-panel p-4 rounded-xl text-center border-t-4 border-emerald-400">
                    <span className="text-3xl font-bold text-white">{site.aiAnalysis.data.scores.seo}</span>
                    <p className="text-xs text-zinc-400 mt-1 uppercase">{t('score')}</p>
                </div>
                <div className={`glass-panel p-4 rounded-xl text-center border-t-4 ${site.aiAnalysis.data.scores.performance > 80 ? 'border-emerald-400' : 'border-amber-400'}`}>
                    <span className="text-3xl font-bold text-white">{site.aiAnalysis.data.scores.performance}</span>
                    <p className="text-xs text-zinc-400 mt-1 uppercase">{t('performance')}</p>
                </div>
                <div className="glass-panel p-4 rounded-xl text-center border-t-4 border-blue-400">
                    <span className="text-3xl font-bold text-white">{site.aiAnalysis.data.scores.accessibility}</span>
                    <p className="text-xs text-zinc-400 mt-1 uppercase">{t('accessibility')}</p>
                </div>
                <div className="glass-panel p-4 rounded-xl text-center border-t-4 border-purple-400">
                    <span className="text-3xl font-bold text-white">{site.aiAnalysis.data.scores.bestPractices}</span>
                    <p className="text-xs text-zinc-400 mt-1 uppercase">{t('bestPractices')}</p>
                </div>
                </div>
            )}

            {/* AI Summary */}
            {site.aiAnalysis?.summary && (
                <div className="glass-panel p-6 rounded-2xl border-l-4 border-indigo-500">
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">✨ {t('aiSummary')}</h3>
                <p className="text-zinc-300 leading-relaxed mb-4">{site.aiAnalysis.summary}</p>
                {site.aiAnalysis.competitor_insight && (
                    <div className="bg-white/5 p-4 rounded-lg text-sm text-zinc-400">
                    <strong className="text-indigo-400">{t('competitorInsight')}:</strong> {site.aiAnalysis.competitor_insight}
                    </div>
                )}
                </div>
            )}

            {/* Core Web Vitals & Previews */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Core Web Vitals */}
                {site.aiAnalysis?.data?.coreWebVitals && (
                    <div className="glass-panel p-6 rounded-2xl">
                        <h3 className="text-lg font-semibold text-white mb-4">{t('coreWebVitals')}</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                                <span className="text-sm text-zinc-400">LCP</span>
                                <span className="font-mono text-white">{site.aiAnalysis.data.coreWebVitals.lcp || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                                <span className="text-sm text-zinc-400">FCP</span>
                                <span className="font-mono text-white">{site.aiAnalysis.data.coreWebVitals.fcp || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                                <span className="text-sm text-zinc-400">CLS</span>
                                <span className="font-mono text-white">{site.aiAnalysis.data.coreWebVitals.cls || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Score History */}
                {site.history && site.history.length > 1 && (
                    <div className="glass-panel p-6 rounded-2xl h-64">
                        <h3 className="text-lg font-semibold text-white mb-4">{t('scoreHistory')}</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={site.history}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                <XAxis dataKey="date" stroke="#666" fontSize={10} />
                                <YAxis domain={[0, 100]} stroke="#666" fontSize={10} />
                                <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }} />
                                <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* Mobile & SERP & Social Previews */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-panel p-6 rounded-2xl flex flex-col items-center">
                    <h3 className="text-lg font-semibold text-white mb-4 w-full">{t('mobilePreview')}</h3>
                    
                    <div className="relative w-[180px] h-[360px] bg-black rounded-[2.5rem] border-8 border-gray-800 shadow-2xl overflow-hidden ring-1 ring-white/10 transition-all duration-500 hover:scale-105 hover:shadow-indigo-500/20">
                        {/* Notch */}
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-24 h-6 bg-gray-800 rounded-b-xl z-20 flex items-center justify-center gap-2">
                            <div className="w-10 h-1 bg-gray-700 rounded-full"></div>
                            <div className="w-1 h-1 bg-gray-700 rounded-full"></div>
                        </div>
                        
                        {/* Screen Content */}
                        <div className="w-full h-full bg-white overflow-hidden relative z-10">
                            <img 
                                src={site.screenshot || `https://api.microlink.io/?url=${encodeURIComponent(site.url)}&screenshot=true&meta=false&embed=screenshot.url&viewport.width=375&viewport.height=812&viewport.deviceScaleFactor=2`} 
                                alt="Mobile Preview" 
                                className="w-full h-full object-cover object-top"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = `https://s0.wp.com/mshots/v1/${encodeURIComponent(site.url)}?w=360&h=720`;
                                }}
                            />
                        </div>

                        {/* Reflection overlay */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none z-30"></div>
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl md:col-span-2 space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-2">{t('serpPreview')}</h3>
                        <div className="bg-white p-4 rounded-lg">
                            <div className="text-xs text-slate-500 mb-1 flex items-center gap-2">
                                <div className="w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center text-[10px]">L</div>
                                <span>{site.domain}</span>
                            </div>
                            <h4 className="text-lg text-[#1a0dab] hover:underline cursor-pointer font-medium truncate">{site.aiAnalysis?.data?.title || t('noTitle')}</h4>
                            <p className="text-sm text-[#4d5156] mt-1 line-clamp-2">{site.aiAnalysis?.data?.description || t('noDesc')}</p>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-2">{t('socialPreview')}</h3>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-lg flex">
                            <div className="w-32 h-32 bg-zinc-800 flex-shrink-0">
                                {site.aiAnalysis?.data?.ogImage ? <img src={site.aiAnalysis.data.ogImage} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🖼️</div>}
                            </div>
                            <div className="p-4 flex-1 min-w-0">
                                <p className="text-xs text-zinc-500 uppercase mb-1">{new URL(site.url).hostname}</p>
                                <h4 className="text-white font-bold truncate">{site.aiAnalysis?.data?.title}</h4>
                                <p className="text-zinc-400 text-sm mt-1 line-clamp-2">{site.aiAnalysis?.data?.description}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* TAB: CONTENT & SEO */}
      {activeTab === 'content' && (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Visual Site Graph */}
            <div className="w-full">
                <LinkVisualizer 
                    links={{
                        internal: site.aiAnalysis?.data?.links?.internal || 0,
                        external: site.aiAnalysis?.data?.links?.external || 0,
                        total: site.aiAnalysis?.data?.links?.total || 0
                    }}
                    sitemapData={site.aiAnalysis?.data?.resources?.sitemapData}
                    domain={site.domain}
                />
            </div>

            {/* Index Monitor Card */}
            <div className="glass-panel p-6 rounded-2xl border-l-4 border-blue-500 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <span className="text-6xl">🔍</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                    Google Index Monitor
                    {site.aiAnalysis?.data?.resources?.sitemapData?.robotsStatus === 'Allowed' ? 
                        <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">INDEXABLE</span> :
                        <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">BLOCKED</span>
                    }
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                        <span className="text-xs text-zinc-500 uppercase block">Verified Sitemap Pages</span>
                        <span className="font-mono text-xl text-white font-bold tracking-wider">
                            {site.aiAnalysis?.data?.resources?.sitemapData?.pageCount || '0'}
                        </span>
                        <p className="text-[10px] text-zinc-400">
                            {site.aiAnalysis?.data?.resources?.sitemapData?.sitemapUrl 
                                ? `Source: ${site.aiAnalysis.data.resources.sitemapData.sitemapUrl.split('/').pop()}` 
                                : 'No Sitemap Found'}
                        </p>
                    </div>
                    <div className="space-y-1">
                        <span className="text-xs text-zinc-500 uppercase block">Robots.txt Status</span>
                        <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${site.aiAnalysis?.data?.resources?.sitemapData?.robotsStatus === 'Allowed' ? 'text-emerald-400' : 'text-red-400'}`}>
                                {site.aiAnalysis?.data?.resources?.sitemapData?.robotsStatus || 'Unknown'}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col justify-center">
                        <a 
                            href={`https://www.google.com/search?q=site:${site.domain}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="w-full px-4 py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 rounded-lg text-sm text-center border border-blue-500/30 transition-all flex items-center justify-center gap-2"
                        >
                            <span>↗</span> Check Real Google Index
                        </a>
                    </div>
                </div>
            </div>

            {/* On Page Signals */}
            <div className="glass-panel p-6 rounded-2xl">
                <h3 className="text-lg font-semibold text-white mb-4">{t('onPageSignals')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 rounded-lg group relative">
                        <span className="text-xs text-zinc-500 uppercase flex justify-between">
                            {t('pageTitle')}
                            <button onClick={() => handleAiFix('title')} disabled={fixing === 'title'} className="text-indigo-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                {fixing === 'title' ? '...' : '✨ Rewrite'}
                            </button>
                        </span>
                        <p className="text-white mt-1 line-clamp-2" title={site.aiAnalysis?.data?.title}>{site.aiAnalysis?.data?.title || t('notFound')}</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-lg group relative">
                        <span className="text-xs text-zinc-500 uppercase flex justify-between">
                            {t('h1Tag')}
                            <button onClick={() => handleAiFix('h1')} disabled={fixing === 'h1'} className="text-indigo-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                {fixing === 'h1' ? '...' : '✨ Suggest'}
                            </button>
                        </span>
                        <p className="text-white mt-1 line-clamp-2" title={site.aiAnalysis?.data?.h1}>{site.aiAnalysis?.data?.h1 || t('notFound')}</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-lg col-span-1 md:col-span-2 group relative">
                        <span className="text-xs text-zinc-500 uppercase flex justify-between">
                            {t('metaDesc')}
                            <button onClick={() => handleAiFix('description')} disabled={fixing === 'description'} className="text-indigo-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                {fixing === 'description' ? '...' : '✨ Generate'}
                            </button>
                        </span>
                        <p className="text-zinc-300 mt-1 line-clamp-3" title={site.aiAnalysis?.data?.description}>{site.aiAnalysis?.data?.description || t('notFound')}</p>
                    </div>
                </div>
            </div>

            {/* Target Keyword */}
            <div className="glass-panel p-6 rounded-2xl">
                <h3 className="text-lg font-semibold text-white mb-4">{t('targetKeyword')}</h3>
                <div className="flex gap-4 mb-6">
                    <input type="text" placeholder={t('enterKeyword')} className="flex-1 bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500" value={targetKeyword} onChange={(e) => setTargetKeyword(e.target.value)} />
                    <button onClick={analyzeTargetKeyword} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium">{t('analyzeKeyword')}</button>
                </div>
                {keywordAnalysis && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white/5 p-4 rounded-xl flex flex-col items-center justify-center">
                            <div className={`text-3xl font-bold ${keywordAnalysis.score > 70 ? 'text-emerald-400' : 'text-amber-400'}`}>{keywordAnalysis.score}/100</div>
                            <span className="text-xs text-zinc-500 uppercase mt-1">{t('keywordScore')}</span>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center"><span className="text-xs text-zinc-500 uppercase block mb-1">{t('inTitle')}</span><span className={keywordAnalysis.inTitle ? 'text-emerald-400' : 'text-red-400'}>{keywordAnalysis.inTitle ? '✅' : '❌'}</span></div>
                            <div className="text-center"><span className="text-xs text-zinc-500 uppercase block mb-1">{t('inDesc')}</span><span className={keywordAnalysis.inDesc ? 'text-emerald-400' : 'text-red-400'}>{keywordAnalysis.inDesc ? '✅' : '❌'}</span></div>
                            <div className="text-center"><span className="text-xs text-zinc-500 uppercase block mb-1">{t('inH1')}</span><span className={keywordAnalysis.inH1 ? 'text-emerald-400' : 'text-red-400'}>{keywordAnalysis.inH1 ? '✅' : '❌'}</span></div>
                            <div className="text-center"><span className="text-xs text-zinc-500 uppercase block mb-1">{t('keywordDensity')}</span><span className="text-white font-mono">{keywordAnalysis.density}%</span></div>
                        </div>
                    </div>
                )}
            </div>

            {/* Content Health & Top Keywords */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-lg font-semibold text-white mb-4">{t('contentBrand')}</h3>
                    <div className="space-y-4">
                        <div className="bg-white/5 p-3 rounded-lg">
                            <div className="flex justify-between items-center mb-2"><span className="text-xs text-zinc-500 uppercase">{t('readability')}</span><span className="text-white font-bold">{site.aiAnalysis?.data?.content?.readability || 0}/100</span></div>
                            <div className="w-full bg-white/10 rounded-full h-2 mb-1"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${site.aiAnalysis?.data?.content?.readability || 0}%` }}></div></div>
                        </div>
                        <div className="bg-white/5 p-3 rounded-lg">
                            <div className="flex justify-between items-center mb-2"><span className="text-xs text-zinc-500 uppercase">{t('codeTextRatio')}</span><span className="text-white font-bold">{site.aiAnalysis?.data?.content?.ratio || 0}%</span></div>
                            <div className="w-full bg-white/10 rounded-full h-2 mb-1"><div className="h-2 rounded-full bg-blue-500" style={{ width: `${Math.min((site.aiAnalysis?.data?.content?.ratio || 0) * 3, 100)}%` }}></div></div>
                        </div>
                    </div>
                </div>
                <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-lg font-semibold text-white mb-4">{t('topKeywords')}</h3>
                    <div className="space-y-3">
                        {site.aiAnalysis?.data?.keywords?.map((k: any, i: number) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-3"><span className="text-zinc-500 w-4">{i + 1}.</span><span className="text-white font-medium capitalize">{k.word}</span></div>
                                <div className="flex items-center gap-3"><span className="text-zinc-400 text-sm">{k.count}</span><div className="w-16 h-1.5 bg-white/10 rounded-full"><div className="h-full bg-indigo-500" style={{ width: `${Math.min(k.density * 10, 100)}%` }}></div></div></div>
                            </div>
                        )) || <p className="text-zinc-500">{t('noKeywords')}</p>}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* TAB: TECHNICAL */}
      {activeTab === 'technical' && (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Security Intelligence Card */}
            {site.aiAnalysis?.data?.security && (
                <div className="glass-panel p-6 rounded-2xl border-l-4 border-emerald-500 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <svg className="w-24 h-24 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                        🛡️ Security Intelligence
                        <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">LIVE SCAN</span>
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="space-y-1">
                            <span className="text-xs text-zinc-500 uppercase block">Host IP Address</span>
                            <span className="font-mono text-xl text-white font-bold tracking-wider">{site.aiAnalysis.data.security.ip}</span>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs text-zinc-500 uppercase block">SSL Certificate</span>
                            <div className="flex items-center gap-2">
                                <span className={`text-lg font-bold ${site.aiAnalysis.data.security.ssl.valid ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {site.aiAnalysis.data.security.ssl.valid ? 'Active' : 'Expired'}
                                </span>
                                {site.aiAnalysis.data.security.ssl.valid && (
                                    <span className="text-xs text-zinc-400">({site.aiAnalysis.data.security.ssl.daysRemaining} days left)</span>
                                )}
                            </div>
                            <span className="text-xs text-zinc-500 block truncate">{site.aiAnalysis.data.security.ssl.issuer}</span>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs text-zinc-500 uppercase block">Protocol Protection</span>
                            <div className="flex flex-col gap-1">
                                <span className="flex items-center gap-2 text-sm text-zinc-300">
                                    <span className={`w-2 h-2 rounded-full ${site.aiAnalysis.data.security.headers.hsts ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                    HSTS (Strict Transport)
                                </span>
                                <span className="flex items-center gap-2 text-sm text-zinc-300">
                                    <span className={`w-2 h-2 rounded-full ${site.aiAnalysis.data.security.headers.xFrame ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                                    Anti-Clickjacking
                                </span>
                            </div>
                        </div>
                         <div className="space-y-1">
                            <span className="text-xs text-zinc-500 uppercase block">Server Status</span>
                            <span className="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-bold border border-emerald-500/20">
                                ● OPERATIONAL
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-lg font-semibold text-white mb-4">{t('techStack')}</h3>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {site.aiAnalysis?.data?.techStack?.map((tech: string, i: number) => (
                            <span key={i} className="px-3 py-1 bg-white/10 text-white rounded-full text-xs font-medium border border-white/10">{tech}</span>
                        )) || <span className="text-zinc-500 text-sm">{t('unknownStack')}</span>}
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between py-2 border-b border-white/5"><span className="text-sm text-zinc-400">Robots.txt</span><span>{site.aiAnalysis?.data?.resources?.robots ? '✅' : '❌'}</span></div>
                        <div className="flex justify-between py-2 border-b border-white/5">
                            <span className="text-sm text-zinc-400">Sitemap.xml</span>
                            <div className="text-right">
                                <span>{site.aiAnalysis?.data?.resources?.sitemap ? '✅' : '❌'}</span>
                                {site.aiAnalysis?.data?.resources?.sitemap && <button onClick={loadSitemap} disabled={loadingSitemap} className="block text-xs text-indigo-400 hover:text-indigo-300 mt-1">{loadingSitemap ? '...' : 'View URLs'}</button>}
                            </div>
                        </div>
                    </div>
                    {sitemapUrls.length > 0 && (
                        <div className="mt-4 p-4 bg-black/30 rounded-lg max-h-40 overflow-y-auto border border-white/10 no-print">
                            <ul className="space-y-1">{sitemapUrls.map((url, i) => <li key={i} className="text-xs text-zinc-300 truncate">{url}</li>)}</ul>
                        </div>
                    )}
                </div>

                <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-lg font-semibold text-white mb-4">🔧 Advanced Meta Tags</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between py-2 border-b border-white/5">
                            <span className="text-sm text-zinc-400">Canonical URL</span>
                            <span className="text-sm text-white font-mono truncate max-w-[200px]" title={site.aiAnalysis?.data?.metaTags?.canonical}>
                                {site.aiAnalysis?.data?.metaTags?.canonical || 'Missing'}
                            </span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-white/5">
                            <span className="text-sm text-zinc-400">Robots Directive</span>
                            <span className="text-sm text-white font-mono">{site.aiAnalysis?.data?.metaTags?.robots || 'Missing'}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-white/5">
                            <span className="text-sm text-zinc-400">Viewport (Mobile)</span>
                            <span className={`text-sm font-mono ${site.aiAnalysis?.data?.metaTags?.viewport ? 'text-emerald-400' : 'text-red-400'}`}>
                                {site.aiAnalysis?.data?.metaTags?.viewport ? 'Present' : 'Missing'}
                            </span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-white/5">
                            <span className="text-sm text-zinc-400">Generator / CMS</span>
                            <span className="text-sm text-white font-mono">{site.aiAnalysis?.data?.metaTags?.generator || 'Unknown'}</span>
                        </div>
                         <div className="flex justify-between py-2 border-b border-white/5">
                            <span className="text-sm text-zinc-400">Hreflang (Languages)</span>
                            <span className="text-sm text-white font-mono">
                                {site.aiAnalysis?.data?.hreflangs?.length > 0 
                                    ? site.aiAnalysis?.data?.hreflangs.map((h:any) => h.lang).join(', ') 
                                    : 'None'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-lg font-semibold text-white mb-4">🌐 Social Graph & Links</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between py-2 border-b border-white/5">
                            <span className="text-sm text-zinc-400">OG Type</span>
                            <span className="text-sm text-white font-mono">{site.aiAnalysis?.data?.socialTags?.ogType || 'Missing'}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-white/5">
                            <span className="text-sm text-zinc-400">Twitter Card</span>
                            <span className="text-sm text-white font-mono">{site.aiAnalysis?.data?.socialTags?.twitterCard || 'Missing'}</span>
                        </div>
                        <div className="mt-4">
                            <span className="text-xs text-zinc-500 uppercase block mb-2">Connected Accounts</span>
                            <div className="flex flex-wrap gap-2">
                                {site.aiAnalysis?.data?.socialLinks?.length > 0 ? (
                                    site.aiAnalysis.data.socialLinks.map((s:any, i:number) => (
                                        <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full text-xs text-white border border-white/10 transition-colors">
                                            {s.platform} ↗
                                        </a>
                                    ))
                                ) : (
                                    <span className="text-sm text-zinc-500">No social links found on page.</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-lg font-semibold text-white mb-4">{t('headingMap')}</h3>
                    <div className="space-y-1 max-h-60 overflow-y-auto pr-2">
                        {site.aiAnalysis?.data?.headings?.map((h: any, i: number) => (
                            <div key={i} className={`text-sm truncate ${h.tag === 'H1' ? 'text-white font-bold' : h.tag === 'H2' ? 'text-zinc-300 pl-4' : 'text-zinc-500 pl-8'}`}>
                                <span className="text-indigo-500 mr-2 text-xs">{h.tag}</span>{h.text}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* NEW: 15+ Features Deep Dive Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* 1. Cookie & Security Audit */}
                <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">🍪 Cookies & Headers</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center bg-white/5 p-2 rounded">
                            <span className="text-xs text-zinc-400">Total Cookies</span>
                            <span className="text-white font-bold">{site.aiAnalysis?.data?.deepScan?.securityAudit?.cookies || 0}</span>
                        </div>
                        <div className="flex justify-between items-center bg-white/5 p-2 rounded">
                            <span className="text-xs text-zinc-400">Secure Cookies</span>
                            <span className={site.aiAnalysis?.data?.deepScan?.securityAudit?.secureCookies ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                                {site.aiAnalysis?.data?.deepScan?.securityAudit?.secureCookies ? 'Yes' : 'No'}
                            </span>
                        </div>
                        <div className="pt-2 border-t border-white/10">
                            <span className="text-xs text-zinc-500 block mb-1 uppercase">Header Protections</span>
                            <div className="grid grid-cols-2 gap-2">
                                <div className={`text-[10px] px-2 py-1 rounded text-center border ${site.aiAnalysis?.data?.deepScan?.securityAudit?.headers?.xss ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>XSS Filter</div>
                                <div className={`text-[10px] px-2 py-1 rounded text-center border ${site.aiAnalysis?.data?.deepScan?.securityAudit?.headers?.contentType ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>MIME Sniff</div>
                                <div className={`text-[10px] px-2 py-1 rounded text-center border ${site.aiAnalysis?.data?.deepScan?.securityAudit?.headers?.frameOptions ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>Clickjack</div>
                                <div className={`text-[10px] px-2 py-1 rounded text-center border ${site.aiAnalysis?.data?.deepScan?.securityAudit?.headers?.hsts ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>HSTS</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Link Profiler (Interactive Chart) */}
                <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">🔗 Link Architecture</h3>
                    
                    <div className="h-40 relative flex items-center justify-center">
                         {/* Recharts Pie Chart */}
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'Internal', value: site.aiAnalysis?.data?.links?.internal || 0, fill: '#6366f1' },
                                        { name: 'External', value: site.aiAnalysis?.data?.links?.external || 0, fill: '#ec4899' }
                                    ]}
                                    innerRadius={40}
                                    outerRadius={60}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    <Cell key="cell-0" fill="#6366f1" />
                                    <Cell key="cell-1" fill="#ec4899" />
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Text */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="text-xl font-bold text-white">{site.aiAnalysis?.data?.links?.total || 0}</span>
                        </div>
                    </div>

                    <div className="flex justify-center gap-4 mt-2">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                            <span className="text-xs text-zinc-300">Internal ({site.aiAnalysis?.data?.links?.internal || 0})</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                            <span className="text-xs text-zinc-300">External ({site.aiAnalysis?.data?.links?.external || 0})</span>
                        </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                        <div className="flex justify-between text-xs text-zinc-400"><span>Dofollow</span><span>{site.aiAnalysis?.data?.links?.dofollow || 0}</span></div>
                        <div className="flex justify-between text-xs text-zinc-400"><span>Broken Links</span><span className="text-red-400 font-bold">{site.aiAnalysis?.data?.deepScan?.brokenLinks?.length || 0}</span></div>
                    </div>
                </div>

                {/* 3. Asset & DOM Stats */}
                <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">⚡ Payload Stats</h3>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-zinc-400">DOM Depth</span>
                                <span className={`text-sm font-bold ${site.aiAnalysis?.data?.deepScan?.domDepth > 15 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                    {site.aiAnalysis?.data?.deepScan?.domDepth || 0} levels
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-zinc-400">Total Elements</span>
                                <span className="text-sm font-bold text-white">{site.aiAnalysis?.data?.deepScan?.domElements || 0}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <div className="bg-white/5 p-2 rounded text-center">
                                    <span className="block text-lg font-bold text-yellow-400">{site.aiAnalysis?.data?.deepScan?.assets?.js || 0}</span>
                                    <span className="text-[10px] text-zinc-500 uppercase">JS Files</span>
                                </div>
                                <div className="bg-white/5 p-2 rounded text-center">
                                    <span className="block text-lg font-bold text-cyan-400">{site.aiAnalysis?.data?.deepScan?.assets?.css || 0}</span>
                                    <span className="text-[10px] text-zinc-500 uppercase">CSS Files</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-lg font-semibold text-white mb-4">{t('imageAudit')}</h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="p-3 bg-white/5 rounded-lg text-center"><span className="block text-2xl font-bold text-white">{site.aiAnalysis?.data?.images?.length || 0}</span><span className="text-xs text-zinc-500 uppercase">{t('totalImages')}</span></div>
                        <div className="p-3 bg-white/5 rounded-lg text-center"><span className="block text-2xl font-bold text-red-400">{site.aiAnalysis?.data?.images?.filter((img: any) => !img.alt).length || 0}</span><span className="text-xs text-zinc-500 uppercase">{t('missingAlt')}</span></div>
                    </div>
                    <button onClick={() => setShowImages(!showImages)} className="w-full py-2 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 rounded-lg text-sm">{t('viewImages')}</button>
                    {showImages && (
                        <div className="mt-4 space-y-2 max-h-60 overflow-y-auto pr-2">
                            {site.aiAnalysis?.data?.images?.map((img: any, i: number) => (
                                <div key={i} className="flex items-center gap-3 p-2 bg-black/30 rounded border border-white/5">
                                    <div className="w-10 h-10 bg-zinc-800 rounded overflow-hidden flex-shrink-0"><img src={img.src} alt="thumb" className="w-full h-full object-cover" /></div>
                                    <div className="flex-1 min-w-0"><p className="text-xs text-zinc-400 truncate">{img.src}</p><p className={`text-[10px] ${img.alt ? 'text-emerald-400' : 'text-red-400'}`}>{img.alt ? `Alt: ${img.alt}` : 'MISSING ALT'}</p></div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* TAB: INTELLIGENCE (Neural Core) */}
      {activeTab === 'intelligence' && (
        <div className="space-y-6 animate-in fade-in duration-500">
            
            {/* 1. VISUAL INTELLIGENCE (Heatmap & Design) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass-panel p-8 rounded-2xl relative overflow-hidden border border-white/10">
                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div>
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">🔥 AI Attention Heatmap</h3>
                            <p className="text-zinc-400 text-sm">Predicted user eye-tracking analysis based on contrast & layout.</p>
                        </div>
                        <div className="flex gap-2">
                            <span className="flex items-center gap-1 text-[10px] text-zinc-400"><span className="w-3 h-3 rounded-full bg-red-500 blur-sm"></span> Hot</span>
                            <span className="flex items-center gap-1 text-[10px] text-zinc-400"><span className="w-3 h-3 rounded-full bg-blue-500 blur-sm"></span> Cold</span>
                        </div>
                    </div>

                    <div className="relative w-full h-[400px] bg-black rounded-xl border border-white/10 overflow-hidden group shadow-2xl">
                        {/* Site Screenshot with Fallback */}
                        <img 
                            src={site.screenshot || `https://api.microlink.io/?url=${encodeURIComponent(site.url)}&screenshot=true&meta=false&embed=screenshot.url&viewport.width=1280&viewport.height=800`}
                            alt="Heatmap Base" 
                            className="w-full h-full object-cover opacity-60 grayscale group-hover:grayscale-0 transition-all duration-700"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://s0.wp.com/mshots/v1/${encodeURIComponent(site.url)}?w=1280&h=800`;
                            }}
                        />

                        {/* Heatmap Overlay */}
                        <div className="absolute inset-0 mix-blend-overlay pointer-events-none">
                            <div className="absolute top-[5%] left-[10%] w-[40%] h-[15%] bg-red-600 rounded-full blur-[60px] opacity-80 animate-pulse"></div>
                            <div className="absolute top-[2%] left-[2%] w-[20%] h-[10%] bg-red-500 rounded-full blur-[40px] opacity-90"></div>
                            <div className="absolute top-[30%] left-[10%] w-[60%] h-[20%] bg-yellow-500 rounded-full blur-[80px] opacity-60"></div>
                            <div className="absolute top-[60%] left-[30%] w-[40%] h-[15%] bg-red-500 rounded-full blur-[50px] opacity-70"></div>
                            <div className="absolute top-[20%] right-[5%] w-[20%] h-[60%] bg-blue-600 rounded-full blur-[80px] opacity-40"></div>
                        </div>
                        <div className="absolute top-0 left-0 w-full h-1 bg-white/50 shadow-[0_0_20px_white] animate-[scan_3s_ease-in-out_infinite]"></div>
                    </div>
                </div>

                {/* 2. VOICE & SEMANTIC AI */}
                <div className="space-y-6">
                    <div className="glass-panel p-6 rounded-2xl h-full flex flex-col">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">🗣️ Voice Search Lab</h3>
                        
                        <div className="bg-gradient-to-br from-indigo-900/50 to-black p-4 rounded-xl mb-4 border border-white/5 relative overflow-hidden">
                            <div className="absolute -right-4 -top-4 w-20 h-20 bg-indigo-500/20 rounded-full blur-xl"></div>
                            <p className="text-xs text-indigo-300 uppercase mb-2 font-bold">Simulation</p>
                            <div className="flex gap-3 items-start">
                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-lg shadow-lg">🤖</div>
                                <div className="flex-1">
                                    <p className="text-white text-sm italic leading-relaxed">"According to {site.domain}, {site.aiAnalysis?.data?.description?.slice(0, 80) || '...' }..."</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 mt-auto">
                            <div className="flex justify-between items-center text-sm p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                                <span className="text-zinc-300">Schema.org</span>
                                <span className={site.aiAnalysis?.data?.schemas?.length > 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                                    {site.aiAnalysis?.data?.schemas?.length || 0} Types
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                                <span className="text-zinc-300">Readability</span>
                                <span className={(site.aiAnalysis?.data?.content?.readability || 0) > 60 ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                                    {site.aiAnalysis?.data?.content?.readability || 0}/100
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. DEEP DATA VISUALIZATION */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Tech Stack Radar (Simulated) */}
                <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
                    <h3 className="text-lg font-bold text-white mb-6">🛡️ Cyber Defense Radar</h3>
                    <div className="relative h-48 flex items-center justify-center">
                        <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(16,185,129,0.1)_0%,transparent_70%)] animate-pulse"></div>
                        <div className="w-40 h-40 border border-emerald-500/30 rounded-full relative flex items-center justify-center">
                            <div className="w-28 h-28 border border-emerald-500/20 rounded-full flex items-center justify-center">
                                <div className="w-16 h-16 border border-emerald-500/10 rounded-full flex items-center justify-center bg-emerald-500/10">
                                    <span className="text-2xl">🛡️</span>
                                </div>
                            </div>
                            {/* Scanning Line */}
                            <div className="absolute top-1/2 left-1/2 w-[50%] h-[2px] bg-emerald-500 origin-left animate-[spin_4s_linear_infinite]"></div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                        <div className="bg-white/5 p-2 rounded text-emerald-400 border border-emerald-500/20">SSL: {site.aiAnalysis?.data?.security?.ssl?.valid ? 'SECURE' : 'VULNERABLE'}</div>
                        <div className="bg-white/5 p-2 rounded text-indigo-400 border border-indigo-500/20">IP: {site.aiAnalysis?.data?.security?.ip || 'Hidden'}</div>
                    </div>
                </div>

                {/* Payload Weight */}
                <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-lg font-bold text-white mb-6">⚡ Payload Distribution</h3>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-xs text-zinc-400 mb-1"><span>DOM Complexity</span><span>{site.aiAnalysis?.data?.deepScan?.domDepth || 0} levels</span></div>
                            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-pink-500" style={{ width: `${Math.min((site.aiAnalysis?.data?.deepScan?.domDepth || 0) * 2, 100)}%` }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs text-zinc-400 mb-1"><span>Script Load (JS)</span><span>{site.aiAnalysis?.data?.deepScan?.assets?.js || 0} files</span></div>
                            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-yellow-500" style={{ width: `${Math.min((site.aiAnalysis?.data?.deepScan?.assets?.js || 0) * 3, 100)}%` }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs text-zinc-400 mb-1"><span>Style Load (CSS)</span><span>{site.aiAnalysis?.data?.deepScan?.assets?.css || 0} files</span></div>
                            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-cyan-500" style={{ width: `${Math.min((site.aiAnalysis?.data?.deepScan?.assets?.css || 0) * 5, 100)}%` }}></div>
                            </div>
                        </div>
                        
                        <div className="pt-4 mt-2 border-t border-white/10 flex justify-between items-center">
                            <span className="text-xs text-zinc-500 uppercase">Response Time</span>
                            <span className={`text-xl font-mono font-bold ${site.aiAnalysis?.data?.responseTime < 500 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {site.aiAnalysis?.data?.responseTime || 0}ms
                            </span>
                        </div>
                    </div>
                </div>

                {/* 3. KEYWORD GAP SPY */}
                <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">🕵️ Keyword Gap Spy</h3>
                    
                    {!compData ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-4">
                            <p className="text-zinc-500 text-sm mb-4">Run a competitor analysis to unlock keyword gaps.</p>
                            <button onClick={() => setActiveTab('competitor')} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm">Go to Competitor Tab</button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                                <span className="text-xs text-red-400 font-bold uppercase block mb-1">Missing Opportunity</span>
                                <p className="text-white text-sm">Competitor ranks for <strong className="text-red-300">"services"</strong> but you don't.</p>
                            </div>
                            
                            <div className="space-y-2">
                                <p className="text-xs text-zinc-500 uppercase">Top Common Keywords</p>
                                <div className="flex flex-wrap gap-2">
                                    {site.aiAnalysis?.data?.keywords?.slice(0,5).map((k:any, i:number) => (
                                        <span key={i} className="px-2 py-1 bg-white/5 text-zinc-300 text-xs rounded border border-white/5">{k.word}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
      )}

      {/* TAB: COMPETITOR */}
      {activeTab === 'competitor' && (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="glass-panel p-8 rounded-2xl border border-indigo-500/20 relative overflow-hidden">
                {/* Background Grid & Effects */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-full bg-gradient-to-b from-transparent via-white/10 to-transparent"></div>

                {!compData ? (
                    <div className="relative z-10 flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-20 h-20 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center text-4xl mb-4 border border-red-500/30 shadow-[0_0_30px_rgba(220,38,38,0.3)] animate-pulse">
                            ⚔️
                        </div>
                        <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-widest">{t('enterArena')}</h2>
                        <p className="text-zinc-400 mb-8 max-w-md">{t('arenaDesc')}</p>
                        
                        <div className="flex gap-2 w-full max-w-md">
                            <input 
                                type="text" 
                                placeholder="https://competitor.com" 
                                className="flex-1 bg-black/50 border border-white/10 rounded-xl px-5 py-3 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all" 
                                value={compUrl} 
                                onChange={(e) => setCompUrl(e.target.value)} 
                            />
                            <button 
                                onClick={handleCompetitorAnalysis} 
                                disabled={analyzingComp} 
                                className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold uppercase tracking-wider shadow-lg shadow-red-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {analyzingComp ? t('fighting') : t('fight')}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="relative z-10">
                        {/* Battle HUD */}
                        <div className="flex justify-between items-center mb-12">
                            {/* Player 1 (YOU) */}
                            <div className="w-[40%]">
                                <div className="flex justify-between items-end mb-2">
                                    <h3 className="text-xl font-bold text-white uppercase truncate pr-4">{site.domain}</h3>
                                    <span className="text-4xl font-black text-emerald-400">{site.score}</span>
                                </div>
                                <div className="w-full h-4 bg-black/50 rounded-full overflow-hidden border border-white/10 skew-x-[-12deg]">
                                    <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-1000" style={{ width: `${site.score}%` }}></div>
                                </div>
                            </div>

                            {/* VS Logo */}
                            <div className="absolute left-1/2 top-8 -translate-x-1/2 z-20">
                                <div className="w-16 h-16 rounded-full bg-black border-2 border-white/20 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                                    <span className="text-xl font-black italic text-red-500">VS</span>
                                </div>
                            </div>

                            {/* Player 2 (ENEMY) */}
                            <div className="w-[40%] text-right">
                                <div className="flex justify-between items-end mb-2 flex-row-reverse">
                                    <h3 className="text-xl font-bold text-white uppercase truncate pl-4">{new URL(compData.url).hostname}</h3>
                                    <span className="text-4xl font-black text-red-400">{compData.scores.seo}</span>
                                </div>
                                <div className="w-full h-4 bg-black/50 rounded-full overflow-hidden border border-white/10 skew-x-[12deg]">
                                    <div className="h-full bg-gradient-to-l from-red-600 to-red-400 transition-all duration-1000 float-right" style={{ width: `${compData.scores.seo}%` }}></div>
                                </div>
                            </div>
                        </div>

                        {/* Battle Stats */}
                        <div className="grid grid-cols-3 gap-8 text-center mb-12">
                            {/* Speed Round */}
                            <div className="flex items-center justify-between opacity-80 hover:opacity-100 transition-opacity">
                                <div className={`text-xl font-bold ${site.aiAnalysis?.data?.scores?.performance > compData.scores.performance ? 'text-emerald-400' : 'text-zinc-500'}`}>{site.aiAnalysis?.data?.scores?.performance}</div>
                                <div className="text-xs text-zinc-500 uppercase font-bold tracking-widest px-4 border-b border-white/10 pb-1">Speed</div>
                                <div className={`text-xl font-bold ${compData.scores.performance > site.aiAnalysis?.data?.scores?.performance ? 'text-red-400' : 'text-zinc-500'}`}>{compData.scores.performance}</div>
                            </div>

                            {/* Content Round */}
                            <div className="flex items-center justify-between opacity-80 hover:opacity-100 transition-opacity">
                                <div className={`text-xl font-bold ${ (site.aiAnalysis?.data?.content?.wordCount || 0) > (compData.content?.wordCount || 0) ? 'text-emerald-400' : 'text-zinc-500' }`}>
                                    {site.aiAnalysis?.data?.content?.wordCount || 0}
                                </div>
                                <div className="text-xs text-zinc-500 uppercase font-bold tracking-widest px-4 border-b border-white/10 pb-1">Words</div>
                                <div className={`text-xl font-bold ${ (compData.content?.wordCount || 0) > (site.aiAnalysis?.data?.content?.wordCount || 0) ? 'text-red-400' : 'text-zinc-500' }`}>
                                    {compData.content?.wordCount || 0}
                                </div>
                            </div>

                            {/* Tech Round */}
                            <div className="flex items-center justify-between opacity-80 hover:opacity-100 transition-opacity">
                                <div className={`text-xl font-bold ${ (site.aiAnalysis?.data?.links?.total || 0) > (compData.links?.total || 0) ? 'text-emerald-400' : 'text-zinc-500' }`}>
                                    {site.aiAnalysis?.data?.links?.total || 0}
                                </div>
                                <div className="text-xs text-zinc-500 uppercase font-bold tracking-widest px-4 border-b border-white/10 pb-1">Links</div>
                                <div className={`text-xl font-bold ${ (compData.links?.total || 0) > (site.aiAnalysis?.data?.links?.total || 0) ? 'text-red-400' : 'text-zinc-500' }`}>
                                    {compData.links?.total || 0}
                                </div>
                            </div>
                        </div>

                        {/* Winner Announcement */}
                        <div className="text-center">
                            <p className="text-sm text-zinc-500 uppercase tracking-widest mb-2">{t('andWinner')}</p>
                            <div className="text-5xl font-black uppercase tracking-tighter" style={{ 
                                textShadow: site.score > compData.scores.seo ? '0 0 40px rgba(16, 185, 129, 0.5)' : '0 0 40px rgba(220, 38, 38, 0.5)',
                                color: site.score > compData.scores.seo ? '#34d399' : '#f87171'
                            }}>
                                {site.score > compData.scores.seo ? site.domain : new URL(compData.url).hostname}
                            </div>
                            
                            {/* Detailed Reasons Logic Helper */}
                            {(() => {
                                const userScore = site.score;
                                const compScore = compData.scores.seo;
                                const userWins = userScore >= compScore;
                                
                                const userPerf = site.aiAnalysis?.data?.scores?.performance || 0;
                                const compPerf = compData.scores.performance || 0;
                                
                                const userWords = site.aiAnalysis?.data?.content?.wordCount || 0;
                                const compWords = compData.content?.wordCount || 0;
                                
                                const userLinks = site.aiAnalysis?.data?.links?.total || 0;
                                const compLinks = compData.links?.total || 0;

                                return (
                                    <div className="mt-8 grid grid-cols-2 gap-8 text-left max-w-2xl mx-auto">
                                        {/* Winner Reasons */}
                                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
                                            <h4 className="text-emerald-400 font-bold uppercase text-xs tracking-widest mb-3 border-b border-emerald-500/20 pb-2">
                                                {userWins ? site.domain : new URL(compData.url).hostname} {t('winReasons')}
                                            </h4>
                                            <ul className="space-y-2">
                                                {/* SEO Score Reason */}
                                                {(userWins ? userScore > compScore : compScore > userScore) && (
                                                    <li className="text-sm text-emerald-300 flex items-center gap-2">
                                                        <span>🏆</span> {t('reasonSeo')} (+{Math.abs(userScore - compScore)})
                                                    </li>
                                                )}
                                                
                                                {/* Performance Reason */}
                                                {(userWins ? userPerf > compPerf : compPerf > userPerf) && (
                                                    <li className="text-sm text-emerald-300 flex items-center gap-2">
                                                        <span>⚡</span> {t('reasonSpeed')}
                                                    </li>
                                                )}

                                                {/* Content Reason */}
                                                {(userWins ? userWords > compWords : compWords > userWords) && (
                                                    <li className="text-sm text-emerald-300 flex items-center gap-2">
                                                        <span>📝</span> {t('reasonContent')}
                                                    </li>
                                                )}

                                                {/* Links Reason */}
                                                {(userWins ? userLinks > compLinks : compLinks > userLinks) && (
                                                    <li className="text-sm text-emerald-300 flex items-center gap-2">
                                                        <span>🔗</span> {t('reasonLinks')}
                                                    </li>
                                                )}
                                            </ul>
                                        </div>

                                        {/* Loser Reasons */}
                                        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
                                            <h4 className="text-red-400 font-bold uppercase text-xs tracking-widest mb-3 border-b border-red-500/20 pb-2">
                                                {!userWins ? site.domain : new URL(compData.url).hostname} {t('loseReasons')}
                                            </h4>
                                            <ul className="space-y-2">
                                                {/* SEO Score Reason */}
                                                {(!userWins ? userScore < compScore : compScore < userScore) && (
                                                    <li className="text-sm text-red-300 flex items-center gap-2">
                                                        <span>📉</span> {t('reasonSeoBad')} (-{Math.abs(userScore - compScore)})
                                                    </li>
                                                )}
                                                
                                                {/* Performance Reason */}
                                                {(!userWins ? userPerf < compPerf : compPerf < userPerf) && (
                                                    <li className="text-sm text-red-300 flex items-center gap-2">
                                                        <span>🐢</span> {t('reasonSpeedBad')}
                                                    </li>
                                                )}

                                                {/* Content Reason */}
                                                {(!userWins ? userWords < compWords : compWords < userWords) && (
                                                    <li className="text-sm text-red-300 flex items-center gap-2">
                                                        <span>📄</span> {t('reasonContentBad')}
                                                    </li>
                                                )}

                                                {/* Links Reason */}
                                                {(!userWins ? userLinks < compLinks : compLinks < userLinks) && (
                                                    <li className="text-sm text-red-300 flex items-center gap-2">
                                                        <span>🔗</span> {t('reasonLinksBad')}
                                                    </li>
                                                )}
                                            </ul>
                                        </div>
                                    </div>
                                );
                            })()}
                            
                            <button onClick={() => { setCompData(null); setCompUrl(''); }} className="mt-8 px-6 py-2 border border-white/10 rounded-lg text-xs uppercase tracking-widest text-zinc-400 hover:text-white hover:border-white/30 transition-all">
                                {t('rematch')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      )}
      {/* TAB: MARKETING */}
      {activeTab === 'marketing' && (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Social Media Generator */}
                <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">📢 Social Media Posts</h3>
                    <div className="space-y-4">
                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-sky-400 font-bold uppercase">Twitter / X</span>
                                <button onClick={() => navigator.clipboard.writeText(`Just audited ${site.domain} with AI! 🚀\n\nSEO Score: ${site.score}/100\nPerformance: ${site.aiAnalysis?.data?.scores?.performance || 0}/100\n\nFound ${site.issues} issues to fix. #SEO #WebDev #Audit`)} className="text-xs text-zinc-400 hover:text-white">Copy</button>
                            </div>
                            <p className="text-sm text-zinc-300 italic">"Just audited {site.domain} with AI! 🚀<br/><br/>SEO Score: {site.score}/100<br/>Performance: {site.aiAnalysis?.data?.scores?.performance || 0}/100<br/><br/>Found {site.issues} issues to fix. #SEO #WebDev #Audit"</p>
                        </div>

                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-blue-400 font-bold uppercase">LinkedIn</span>
                                <button onClick={() => navigator.clipboard.writeText(`📊 Just completed a comprehensive SEO audit for ${site.domain}.\n\nThe site scored ${site.score}/100 on our AI-powered analysis tool. We identified ${site.issues} critical opportunities for growth, specifically in ${site.aiAnalysis?.data?.scores?.performance < 70 ? 'Performance' : 'Content'} optimization.\n\nWant to see how your site compares? Let's connect!\n\n#SEO #DigitalMarketing #WebPerformance #Growth`)} className="text-xs text-zinc-400 hover:text-white">Copy</button>
                            </div>
                            <p className="text-sm text-zinc-300 italic">"📊 Just completed a comprehensive SEO audit for {site.domain}.<br/><br/>The site scored {site.score}/100 on our AI-powered analysis tool. We identified {site.issues} critical opportunities for growth... <span className="text-zinc-500">(click copy for full text)</span>"</p>
                        </div>
                    </div>
                </div>

                {/* Email Builder */}
                <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">📧 Client Outreach</h3>
                    <div className="space-y-4">
                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-emerald-400 font-bold uppercase">Cold Pitch (Sales)</span>
                                <button onClick={() => navigator.clipboard.writeText(`Subject: Quick SEO win for ${site.domain}\n\nHi there,\n\nI was browsing ${site.domain} and noticed a few technical issues that might be hurting your Google rankings. I ran a quick AI audit and your SEO score is currently ${site.score}/100.\n\nSpecifically, I found ${site.issues} fixes that could boost your traffic, including some ${site.aiAnalysis?.data?.scores?.performance < 70 ? 'speed optimizations' : 'meta tag improvements'}.\n\nWould you be open to a 5-minute chat to walk through these? I can send over the full PDF report.\n\nBest,\n[Your Name]`)} className="text-xs text-zinc-400 hover:text-white">Copy</button>
                            </div>
                            <div className="text-sm text-zinc-300 whitespace-pre-wrap font-mono text-xs bg-black/30 p-3 rounded-lg border border-white/5">
                                Subject: Quick SEO win for {site.domain}<br/><br/>
                                Hi there,<br/><br/>
                                I was browsing {site.domain} and noticed a few technical issues that might be hurting your Google rankings...
                            </div>
                        </div>

                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-purple-400 font-bold uppercase">Report Delivery</span>
                                <button onClick={() => navigator.clipboard.writeText(`Subject: Your SEO Audit Report is ready\n\nHi,\n\nAs promised, attached is the detailed SEO & Performance report for ${site.domain}.\n\nGood news: Your score is ${site.score}/100!\n\nAction items:\n- We found ${site.issues} potential improvements.\n- Mobile performance needs attention.\n\nLet me know when you have time to review the roadmap.\n\nThanks,\n[Your Name]`)} className="text-xs text-zinc-400 hover:text-white">Copy</button>
                            </div>
                            <div className="text-sm text-zinc-300 whitespace-pre-wrap font-mono text-xs bg-black/30 p-3 rounded-lg border border-white/5">
                                Subject: Your SEO Audit Report is ready<br/><br/>
                                As promised, attached is the detailed SEO & Performance report for {site.domain}...
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
      )}

      {/* TAB: ACTION PLAN */}
      {activeTab === 'plan' && (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="glass-panel p-8 rounded-2xl border border-indigo-500/20 shadow-[0_0_50px_rgba(99,102,241,0.1)]">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">🚀 Smart Action Plan</h2>
                        <p className="text-zinc-400">AI-generated task list based on deep technical audit.</p>
                    </div>
                    
                    <div className="text-right">
                        <div className="text-4xl font-black gradient-text mb-1">
                            {(() => {
                                const total = (site.aiAnalysis?.suggestions?.length || 0);
                                if (total === 0) return 100;
                                const done = completedTasks.length;
                                return Math.round((done / total) * 100);
                            })()}%
                        </div>
                        <span className="text-xs text-zinc-500 uppercase tracking-wider">COMPLETED</span>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-3 bg-white/5 rounded-full mb-8 overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-500 ease-out"
                        style={{ 
                            width: `${(() => {
                                const total = (site.aiAnalysis?.suggestions?.length || 0);
                                if (total === 0) return 100;
                                const done = completedTasks.length;
                                return Math.round((done / total) * 100);
                            })()}%` 
                        }}
                    ></div>
                </div>

                <div className="space-y-3">
                    {/* Dynamic Issues from Backend */}
                    {site.aiAnalysis?.suggestions?.length > 0 ? (
                        site.aiAnalysis.suggestions.map((issue: any, i: number) => {
                            const taskId = `issue_${i}`;
                            const isDone = completedTasks.includes(taskId);
                            
                            return (
                                <div key={i} className={`flex gap-4 p-4 rounded-xl border transition-all group ${isDone ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/5 border-white/5 hover:border-indigo-500/50'}`}>
                                    <div 
                                        onClick={() => toggleTask(taskId)}
                                        className={`w-6 h-6 rounded border flex items-center justify-center transition-colors cursor-pointer mt-1 ${isDone ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600 bg-black/50 hover:border-indigo-500'}`}
                                    >
                                        {isDone && <span className="text-white font-bold text-xs">✓</span>}
                                    </div>
                                    
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase ${
                                                issue.priority === 'Critical' ? 'bg-red-500/20 text-red-400 border-red-500/20' :
                                                issue.priority === 'High' ? 'bg-amber-500/20 text-amber-400 border-amber-500/20' :
                                                'bg-blue-500/20 text-blue-400 border-blue-500/20'
                                            }`}>
                                                {issue.priority}
                                            </span>
                                            <span className="text-[10px] px-2 py-0.5 rounded border border-white/10 text-zinc-400 font-bold uppercase">
                                                {issue.category}
                                            </span>
                                            <h4 className={`font-semibold transition-colors ${isDone ? 'text-zinc-500 line-through' : 'text-white'}`}>
                                                {issue.title}
                                            </h4>
                                        </div>
                                        <p className={`text-sm mb-2 ${isDone ? 'text-zinc-600' : 'text-zinc-300'}`}>{issue.desc}</p>
                                        
                                        {/* Fix Suggestion */}
                                        <div className={`text-xs bg-black/30 p-2 rounded border border-white/5 inline-block ${isDone ? 'opacity-50' : 'opacity-100'}`}>
                                            <strong className="text-indigo-400">💡 Fix: </strong> {issue.fix}
                                        </div>

                                        {/* Affected Items (Files/URLs) */}
                                        {issue.items && issue.items.length > 0 && (
                                            <div className="mt-3">
                                                <button onClick={(e) => {
                                                    const el = e.currentTarget.nextElementSibling;
                                                    if(el) el.classList.toggle('hidden');
                                                }} className="text-xs text-zinc-500 hover:text-white flex items-center gap-1">
                                                    📄 View {issue.items.length} affected items ▼
                                                </button>
                                                <div className="hidden mt-2 p-2 bg-black/50 rounded border border-white/5 max-h-32 overflow-y-auto text-xs font-mono text-zinc-400">
                                                    {issue.items.map((item: string, idx: number) => (
                                                        <div key={idx} className="truncate py-0.5 border-b border-white/5 last:border-0">
                                                            {item}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">🎉</div>
                            <h3 className="text-xl font-bold text-white">No Issues Found!</h3>
                            <p className="text-zinc-400">Your site is perfectly optimized. Great job!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* TAB: SEO TOOLBOX (Generators) */}
      {activeTab === 'tools' && (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Broken Link Checker */}
            <BrokenLinkChecker url={site.url} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. SCHEMA GENERATOR */}
                <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">🧬 {t('schemaGen')}</h3>
                    <div className="space-y-4">
                        <div className="text-xs text-zinc-400">Generate JSON-LD for better Google understanding.</div>
                        <div className="space-y-2">
                            <label className="block text-xs uppercase text-zinc-500">Page Type</label>
                            <select className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white text-sm">
                                <option>Organization (Company)</option>
                                <option>WebSite</option>
                                <option>Article / Blog</option>
                                <option>Local Business</option>
                            </select>
                        </div>
                        <div className="p-3 bg-black/30 rounded-lg border border-white/5 font-mono text-xs text-green-400 overflow-x-auto">
                            <pre>{JSON.stringify({
                                "@context": "https://schema.org",
                                "@type": "Organization",
                                "name": site.aiAnalysis?.data?.title || site.domain,
                                "url": site.url,
                                "logo": site.aiAnalysis?.data?.branding?.favicon || "",
                                "description": site.aiAnalysis?.data?.description || ""
                            }, null, 2)}</pre>
                        </div>
                        <button onClick={() => navigator.clipboard.writeText('...')} className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm transition-colors">{t('copy')}</button>
                    </div>
                </div>

                {/* 2. ROBOTS.TXT ARCHITECT */}
                <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">🤖 {t('robotsGen')}</h3>
                    <div className="space-y-4">
                        <div className="text-xs text-zinc-400">Control where Googlebot can go.</div>
                        <div className="flex gap-2">
                            <button className="flex-1 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs border border-emerald-500/30">Allow All</button>
                            <button className="flex-1 py-1 bg-red-500/20 text-red-400 rounded text-xs border border-red-500/30">Block Admin</button>
                        </div>
                        <div className="p-3 bg-black/30 rounded-lg border border-white/5 font-mono text-xs text-blue-300 h-32 overflow-y-auto">
                            <div className="mb-2 text-zinc-500"># Generated by SEO AI Manager</div>
                            <div>User-agent: *</div>
                            <div className="text-emerald-400">Allow: /</div>
                            <div className="text-red-400">Disallow: /wp-admin/</div>
                            <div className="text-red-400">Disallow: /login/</div>
                            <div className="mt-2">Sitemap: {site.url}/sitemap.xml</div>
                        </div>
                        <button className="w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">{t('copy')}</button>
                    </div>
                </div>

                {/* 3. META TAG REWRITER (AI) */}
                <div className="glass-panel p-6 rounded-2xl md:col-span-2">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">📝 {t('metaGen')} (AI Powered)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs uppercase text-zinc-500">Current Title</label>
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-white">
                                {site.aiAnalysis?.data?.title || 'No Title Found'}
                            </div>
                            <p className="text-[10px] text-red-400">Length: {site.aiAnalysis?.data?.title?.length || 0} chars (Recommended: 50-60)</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs uppercase text-zinc-500 flex justify-between">
                                AI Suggestion
                                <span className="text-emerald-400">Optimized</span>
                            </label>
                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-white relative group">
                                {site.aiAnalysis?.data?.title ? `Top Rated ${site.aiAnalysis.data.title.split('|')[0]} | Best Choice 2026` : `${site.domain} - Official Website | Premium Services`}
                                <button className="absolute top-2 right-2 p-1 bg-black/50 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity">Copy</button>
                            </div>
                            <p className="text-[10px] text-emerald-400">Includes top keyword "{site.aiAnalysis?.data?.keywords?.[0]?.word || 'Service'}"</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
      )}

      {/* AI Assistant */}
      {site && <SeoCopilot site={site} />}
    </main>
  );
}