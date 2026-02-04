'use client';

import React, { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useLanguage } from '@/context/LanguageContext';

// Dynamically import ForceGraph2D to avoid SSR issues
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

interface Node {
  id: string;
  name: string;
  val: number;
  color?: string;
  group: 'page' | 'external' | 'resource';
}

interface Link {
  source: string;
  target: string;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

interface LinkVisualizerProps {
  links: {
    internal: number;
    external: number;
    total: number;
    dofollow?: number;
  };
  sitemapData?: {
    urls?: string[];
    sitemapUrl?: string;
  };
  domain: string;
}

export default function LinkVisualizer({ links, sitemapData, domain }: LinkVisualizerProps) {
  const { t } = useLanguage();
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Generate simulated graph data based on the stats provided
    // In a real app, this would come from a full crawl
    const nodes: Node[] = [];
    const graphLinks: Link[] = [];

    // Root Node (Home)
    const rootId = 'root';
    nodes.push({ 
        id: rootId, 
        name: domain, 
        val: 20, 
        color: '#6366f1', // Indigo
        group: 'page'
    });

    // Generate Internal Nodes (Simulated based on count)
    // We limit visual nodes to avoid browser crash on huge sites
    const internalCount = Math.min(links.internal || 5, 20); 
    const externalCount = Math.min(links.external || 5, 15);

    // Create Internal Page Nodes
    for (let i = 0; i < internalCount; i++) {
        const id = `int_${i}`;
        nodes.push({
            id,
            name: sitemapData?.urls?.[i] ? new URL(sitemapData.urls[i]).pathname : `/page-${i+1}`,
            val: 10,
            color: '#34d399', // Emerald
            group: 'page'
        });
        graphLinks.push({ source: rootId, target: id });
        
        // Randomly interconnect some internal pages
        if (i > 0 && Math.random() > 0.7) {
            graphLinks.push({ source: id, target: `int_${i-1}` });
        }
    }

    // Create External Link Nodes
    for (let i = 0; i < externalCount; i++) {
        const id = `ext_${i}`;
        nodes.push({
            id,
            name: `External Site ${i+1}`,
            val: 5,
            color: '#ec4899', // Pink
            group: 'external'
        });
        // Connect to random internal page or root
        const source = Math.random() > 0.5 ? rootId : `int_${Math.floor(Math.random() * internalCount)}`;
        graphLinks.push({ source, target: id });
    }

    setData({ nodes, links: graphLinks });
  }, [links, sitemapData, domain]);

  useEffect(() => {
    if (containerRef.current) {
        setDimensions({
            width: containerRef.current.offsetWidth,
            height: 500
        });
    }
    
    const handleResize = () => {
        if (containerRef.current) {
            setDimensions({
                width: containerRef.current.offsetWidth,
                height: 500
            });
        }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div ref={containerRef} className="glass-panel p-6 rounded-2xl relative overflow-hidden h-[600px] flex flex-col">
        <div className="flex justify-between items-center mb-4 z-10 relative">
            <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">🕸️ Site Network Graph</h3>
                <p className="text-zinc-400 text-xs">Visualizing connection structure (Simulated View)</p>
            </div>
            <div className="flex gap-4 text-xs">
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#6366f1]"></span>
                    <span className="text-zinc-300">Home</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#34d399]"></span>
                    <span className="text-zinc-300">Internal Page</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#ec4899]"></span>
                    <span className="text-zinc-300">External Link</span>
                </div>
            </div>
        </div>

        <div className="flex-1 bg-black/30 rounded-xl border border-white/5 overflow-hidden cursor-move relative">
            <ForceGraph2D
                width={dimensions.width}
                height={500}
                graphData={data}
                nodeLabel="name"
                nodeColor="color"
                nodeRelSize={6}
                linkColor={() => '#ffffff20'}
                backgroundColor="rgba(0,0,0,0)"
                enableNodeDrag={true}
                cooldownTicks={100}
                onNodeClick={(node) => {
                    // Zoom to node functionality could go here
                }}
            />
            <div className="absolute bottom-4 left-4 p-3 bg-black/80 backdrop-blur rounded-lg border border-white/10 text-xs text-zinc-400 max-w-xs pointer-events-none">
                <strong className="text-white block mb-1">Graph Stats:</strong>
                Nodes: {data.nodes.length} | Connections: {data.links.length}
            </div>
        </div>
    </div>
  );
}
