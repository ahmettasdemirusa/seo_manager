'use client';

import React, { useEffect, useState, useRef } from 'react';

const LOGS = [
    "Initializing neural handshake sequence...",
    "Resolving DNS via encrypted proxy...",
    "Establishing secure channel (TLS 1.3)...",
    "Connected to host: [TARGET_LOCKED]",
    "Bypassing Cloudflare challenge...",
    "Injecting headless agent (Chrome/122)...",
    "Fetching DOM structure...",
    "Analyzing critical render path...",
    "Extracting meta tags & headers...",
    "Checking robots.txt policies...",
    "Mapping sitemap coordinates...",
    "Downloading assets (CSS/JS/IMG)...",
    "Running lighthouse audits (Mobile)...",
    "Calculating Cumulative Layout Shift...",
    "Measuring Largest Contentful Paint...",
    "Detecting broken links...",
    "Scanning for memory leaks...",
    "Compiling SEO vectors...",
    "Optimizing final payload...",
    "Report generation complete."
];

export default function HackerTerminal() {
    const [lines, setLines] = useState<string[]>([]);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let i = 0;
        
        const addLine = () => {
            if (i < LOGS.length) {
                setLines(prev => [...prev, `> ${LOGS[i]}`]);
                i++;
                // Rastgele gecikme: 100ms ile 600ms arası (daha doğal akış)
                const delay = Math.floor(Math.random() * 500) + 100;
                setTimeout(addLine, delay);
            }
        };

        addLine();

        return () => {}; // Cleanup gerekirse buraya
    }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [lines]);

    return (
        <div className="bg-[#030014] font-mono text-xs p-5 rounded-xl border border-cyan-500/30 text-cyan-400 h-64 overflow-y-auto shadow-[0_0_40px_rgba(6,182,212,0.15)] relative">
            {/* Scanlines Effect */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 pointer-events-none bg-[length:100%_2px,3px_100%] opacity-50"></div>
            
            <div className="space-y-1.5 relative z-20">
                {lines.map((line, i) => (
                    <div key={i} className="animate-in fade-in slide-in-from-left duration-300 break-words drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]">
                        <span className="text-indigo-400 mr-2 opacity-70">[{new Date().toLocaleTimeString().split(' ')[0]}]</span>
                        <span className="text-cyan-300">{line}</span>
                    </div>
                ))}
                <div ref={bottomRef} className="animate-pulse text-cyan-400 font-bold drop-shadow-[0_0_8px_rgba(34,211,238,1)]">_</div>
            </div>
        </div>
    );
}
