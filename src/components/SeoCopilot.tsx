'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Site } from '@/types';

interface Message {
    role: 'user' | 'ai';
    text: string;
}

export default function SeoCopilot({ site }: { site: Site }) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'ai', text: `Hello! I've analyzed ${site.domain}. Ask me anything about your SEO score or how to fix the ${site.issues} issues I found! 🧠` }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim()) return;
        
        const userMsg = input;
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setInput('');
        setLoading(true);

        try {
            const res = await fetch('/api/copilot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    message: userMsg, 
                    siteData: site,
                    history: messages.slice(-4) // Keep context light
                })
            });
            const data = await res.json();
            setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'ai', text: "Connection error. Try again." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none no-print">
            
            {/* Chat Window */}
            {isOpen && (
                <div className="pointer-events-auto w-[350px] h-[500px] bg-black/80 backdrop-blur-xl border border-indigo-500/30 rounded-2xl shadow-[0_0_50px_rgba(99,102,241,0.2)] flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300 mb-4">
                    {/* Header */}
                    <div className="p-4 border-b border-white/10 bg-indigo-600/10 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
                                🤖
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-sm">SEO Copilot</h3>
                                <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                    Online
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white">✕</button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-700">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                                    m.role === 'user' 
                                    ? 'bg-indigo-600 text-white rounded-br-none' 
                                    : 'bg-white/10 text-zinc-200 rounded-bl-none border border-white/5'
                                }`}>
                                    {m.text}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white/10 p-3 rounded-2xl rounded-bl-none border border-white/5 flex gap-1">
                                    <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce delay-100"></span>
                                    <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce delay-200"></span>
                                </div>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <div className="p-3 border-t border-white/10 bg-black/40">
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Ask about SEO..."
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 focus:bg-white/10 transition-all"
                            />
                            <button 
                                onClick={handleSend}
                                disabled={loading || !input.trim()}
                                className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl disabled:opacity-50 transition-colors"
                            >
                                ➤
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toggle Button (Floating) */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="pointer-events-auto w-14 h-14 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 shadow-[0_0_20px_rgba(99,102,241,0.5)] flex items-center justify-center text-2xl hover:scale-110 transition-transform duration-300 border border-white/20"
            >
                {isOpen ? '✕' : '🤖'}
            </button>
        </div>
    );
}
