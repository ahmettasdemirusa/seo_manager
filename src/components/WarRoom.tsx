'use client';

import React, { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';

// SSR Sorununu önlemek için dynamic import
const Globe = dynamic(() => import('react-globe.gl'), { ssr: false });

// Küresel Şehirler
const CITIES = [
  { name: 'New York', lat: 40.7128, lng: -74.0060, color: '#6366f1' }, // Indigo (USA)
  { name: 'San Francisco', lat: 37.7749, lng: -122.4194, color: '#ec4899' }, // Pink (USA)
  { name: 'Georgia, US', lat: 32.1656, lng: -82.9001, color: '#f59e0b' }, // Amber (USA)
  { name: 'Sao Paulo', lat: -23.5505, lng: -46.6333, color: '#22c55e' }, // Green (Brazil)
  { name: 'Istanbul', lat: 41.0082, lng: 28.9784, color: '#ef4444' }, // Red (Turkey)
  { name: 'Bangkok', lat: 13.7563, lng: 100.5018, color: '#f59e0b' }, // Amber (Thailand)
  { name: 'Mexico City', lat: 19.4326, lng: -99.1332, color: '#10b981' }, // Green (Mexico)
  { name: 'Toronto', lat: 43.65107, lng: -79.347015, color: '#06b6d4' } // Cyan (Canada)
];

// Hedef (Ortalama bir merkez, Atlantik okyanusu üzeri görsel denge için)
// Görsellik için hedefi merkeze yakın bir yere koyuyoruz
const TARGET = { name: 'Target Server', lat: 38.9072, lng: -77.0369 }; // Washington DC civarı

export default function WarRoom({ isScanning }: { isScanning: boolean }) {
  const globeEl = useRef<any>(null);
  const [arcs, setArcs] = useState<any[]>([]);
  const [pings, setPings] = useState<any[]>([]);

  const [active, setActive] = useState(true);

  useEffect(() => {
    // Globe yüklendiğinde ve ref hazır olduğunda ayarları yap
    const interval = setInterval(() => {
      if (globeEl.current) {
        globeEl.current.pointOfView({ lat: 20, lng: 0, altitude: 2.8 });
        globeEl.current.controls().autoRotate = true;
        globeEl.current.controls().autoRotateSpeed = 0.6;
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Sürekli veri akışı (Simülasyon)
    const newArcs = CITIES.map(city => ({
        startLat: city.lat,
        startLng: city.lng,
        endLat: TARGET.lat,
        endLng: TARGET.lng,
        color: [city.color, '#ffffff'],
        dashLength: 0.4,
        dashGap: 0.2,
        dashInitialGap: Math.random(),
        dashAnimateTime: 1500 + Math.random() * 500
    }));
    setArcs(newArcs);

    const interval = setInterval(() => {
        const newPings = CITIES.map(city => ({
          ...city,
          ping: Math.floor(Math.random() * 120) + 30 + 'ms',
          status: Math.random() > 0.9 ? 'LAG' : 'OK'
        }));
        setPings(newPings);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-[400px] bg-black/40 rounded-2xl overflow-hidden border border-white/10 glass-panel shadow-2xl">
      {/* HUD Header */}
      <div className="absolute top-4 left-4 z-20">
        <div className="bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-lg flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <div>
                <h3 className="text-white font-bold text-xs tracking-widest uppercase">Global Latency</h3>
                <p className="text-[10px] text-zinc-400">STATUS: MONITORING</p>
            </div>
        </div>
      </div>

      {/* Live Ping Data List (Always Visible) */}
      <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2 w-48">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 text-right">Real-time Metrics</div>
          {pings.map((p, i) => (
            <div key={i} className="flex items-center justify-between bg-black/80 backdrop-blur-md px-3 py-2 rounded-lg border border-white/5 shadow-lg transition-all hover:border-indigo-500/30 group">
              <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full shadow-[0_0_8px]" style={{ backgroundColor: p.color, boxShadow: `0 0 8px ${p.color}` }}></span>
                  <span className="text-xs text-zinc-300 font-medium group-hover:text-white transition-colors">{p.name}</span>
              </div>
              <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-white font-bold tracking-tight">{p.ping}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${p.status === 'OK' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400 animate-pulse'}`}>
                    {p.status}
                  </span>
              </div>
            </div>
          ))}
      </div>

      {/* Grid Overlay for Cyberpunk feel */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none z-10"></div>
      
      {/* 3D Globe */}
      <Globe
        ref={globeEl}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        // Cities
        labelsData={[...CITIES, { ...TARGET, color: '#ffffff', name: '' }]}
        labelLat={(d: any) => d.lat}
        labelLng={(d: any) => d.lng}
        labelText={(d: any) => d.name}
        labelSize={1.5}
        labelDotRadius={0.5}
        labelColor={(d: any) => d.color}
        labelResolution={2}
        // Arcs (Lines)
        arcsData={arcs}
        arcColor="color"
        arcDashLength="dashLength"
        arcDashGap="dashGap"
        arcDashInitialGap="dashInitialGap"
        arcDashAnimateTime="dashAnimateTime"
        arcStroke={0.5}
        // Atmosphere
        atmosphereColor="#6366f1"
        atmosphereAltitude={0.15}
        width={800} // Container will clip, this is just internal render size
        height={400}
      />
    </div>
  );
}
