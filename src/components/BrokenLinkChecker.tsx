'use client';

import React, { useState } from 'react';

interface BrokenLinkCheckerProps {
  url: string;
}

interface LinkStatus {
  url: string;
  status: 'pending' | 'ok' | 'broken' | 'redirect';
  code?: number;
}

export default function BrokenLinkChecker({ url }: BrokenLinkCheckerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [links, setLinks] = useState<LinkStatus[]>([]);
  const [progress, setProgress] = useState(0);

  const startScan = async () => {
    setIsScanning(true);
    setLinks([]);
    setProgress(0);

    try {
        // Step 1: Fetch all links from the page via API
        const res = await fetch('/api/scan-links', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        const data = await res.json();
        
        if (data.links && data.links.length > 0) {
            // Initialize link list
            const initialLinks = data.links.map((l: string) => ({ url: l, status: 'pending' }));
            setLinks(initialLinks);

            // Step 2: Check each link (in batches to be nice)
            const batchSize = 5;
            for (let i = 0; i < initialLinks.length; i += batchSize) {
                const batch = initialLinks.slice(i, i + batchSize);
                
                // Parallel check
                const results = await Promise.all(batch.map(async (link: any) => {
                    try {
                        const checkRes = await fetch('/api/check-link', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ url: link.url })
                        });
                        const checkData = await checkRes.json();
                        return {
                            url: link.url,
                            status: checkData.ok ? 'ok' : 'broken',
                            code: checkData.status
                        };
                    } catch (e) {
                        return { url: link.url, status: 'broken', code: 0 };
                    }
                }));

                // Update state
                setLinks(prev => {
                    const next = [...prev];
                    results.forEach((r: any) => {
                        const idx = next.findIndex(n => n.url === r.url);
                        if (idx !== -1) next[idx] = r;
                    });
                    return next;
                });
                
                setProgress(Math.round(((i + batch.length) / initialLinks.length) * 100));
            }
        }
    } catch (e) {
        console.error("Scan failed", e);
    } finally {
        setIsScanning(false);
        setProgress(100);
    }
  };

  const brokenCount = links.filter(l => l.status === 'broken').length;

  return (
    <div className="glass-panel p-6 rounded-2xl">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">🚑 Broken Link Doctor</h3>
      
      {!isScanning && links.length === 0 ? (
        <div className="text-center py-8">
            <p className="text-zinc-400 mb-4">Scan your page for dead links (404s) that hurt SEO.</p>
            <button onClick={startScan} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium shadow-lg shadow-indigo-500/20">
                Start Health Check
            </button>
        </div>
      ) : (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-zinc-400">{isScanning ? 'Scanning...' : 'Scan Complete'}</span>
                <span className="text-sm font-bold text-white">{progress}%</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>
            
            <div className="flex gap-4 text-sm mt-4 pb-2 border-b border-white/10">
                <div className="text-emerald-400">✅ {links.filter(l => l.status === 'ok').length} Healthy</div>
                <div className="text-red-400">❌ {brokenCount} Broken</div>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1 pr-2 font-mono text-xs">
                {links.map((link, i) => (
                    <div key={i} className="flex justify-between items-center p-2 rounded hover:bg-white/5 border border-transparent hover:border-white/5">
                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-zinc-300 truncate max-w-[70%] hover:underline">
                            {link.url}
                        </a>
                        {link.status === 'pending' && <span className="text-zinc-500">...</span>}
                        {link.status === 'ok' && <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">200 OK</span>}
                        {link.status === 'broken' && <span className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded border border-red-500/20">{link.code || 'ERR'}</span>}
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
}
