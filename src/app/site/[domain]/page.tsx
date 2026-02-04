import React from 'react';

export default function SiteDetails({ params }: { params: { domain: string } }) {
  // Mock data for now - in real app, fetch from DB/API
  const site = {
    domain: decodeURIComponent(params.domain),
    score: 72,
    issues: [
      { type: 'critical', message: 'Missing Meta Description', fix: 'Add a summary of your page content in <meta name="description"> tag.' },
      { type: 'warning', message: 'H1 is generic ("Welcome")', fix: 'Change H1 to include your main keyword, e.g., "Ahmet Tasdemir - SEO Expert"' }
    ]
  };

  return (
    <main className="p-8 max-w-7xl mx-auto space-y-8">
      <header>
        <a href="/" className="text-zinc-400 hover:text-white mb-4 inline-block">← Back to Dashboard</a>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{site.domain}</h1>
          <div className="px-4 py-2 bg-indigo-600 rounded-lg font-bold text-white">
            Score: {site.score}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Issues List */}
        <section className="glass-panel p-6 rounded-2xl space-y-6">
          <h2 className="text-xl font-semibold text-white">Identified Issues</h2>
          {site.issues.map((issue, i) => (
            <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-center gap-3 mb-2">
                <span className={`w-2 h-2 rounded-full ${issue.type === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`} />
                <span className={`text-sm font-medium uppercase ${issue.type === 'critical' ? 'text-red-400' : 'text-amber-400'}`}>
                  {issue.type}
                </span>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">{issue.message}</h3>
              <div className="bg-black/30 p-3 rounded-lg text-sm text-zinc-400">
                <span className="text-indigo-400 font-bold">AI Suggestion:</span> {issue.fix}
              </div>
              <button className="mt-3 w-full py-2 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg transition-colors text-sm font-medium">
                Auto-Fix with AI ✨
              </button>
            </div>
          ))}
        </section>

        {/* Live Preview / Editor Placeholder */}
        <section className="glass-panel p-6 rounded-2xl flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-white/10 rounded-full mx-auto flex items-center justify-center text-3xl">👀</div>
            <p className="text-zinc-500">Live Site Preview & Editor Coming Soon</p>
          </div>
        </section>
      </div>
    </main>
  );
}
