'use client'

import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export default function TopologyEngine() {
  const containerRef = useRef(null);
  const pathsRef = useRef([]);

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.8 } });

    // 1. Header & Sidebar Entrance
    tl.from(".nav-item", { x: -20, opacity: 0, stagger: 0.1 })
      .from(".main-header", { y: 20, opacity: 0 }, "-=0.5")

    // 2. Animate SVG Flow Lines (Drawing the circuit)
    .from(".flow-path", {
      strokeDasharray: 1000,
      strokeDashoffset: 1000,
      duration: 2,
      ease: "power2.inOut"
    }, "-=0.5")

    // 3. Staggered Layer Entrance
    .from(".layer-header", { opacity: 0, x: -10, stagger: 0.3 }, "-=1.5")
    .from(".topology-card", { 
      scale: 0.95, 
      opacity: 0, 
      stagger: 0.1,
      clearProps: "all" 
    }, "-=1")

    // 4. Jitter Monitor Bar Animation
    .from(".jitter-bar", {
      scaleY: 0,
      stagger: 0.05,
      transformOrigin: "bottom",
      duration: 1,
      ease: "elastic.out(1, 0.5)"
    }, "-=0.5");

    // 5. Continuous Flow Animation (Small particles moving along paths)
    gsap.to(".flow-path", {
      strokeDashoffset: -20,
      repeat: -1,
      duration: 1,
      ease: "none"
    });

  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="flex flex-1 overflow-hidden h-[calc(100vh-65px)] bg-surface-container-lowest">
      
      {/* Sidebar */}
      {/* <aside className="bg-surface-container-lowest backdrop-blur-md text-on-surface font-body text-xs font-medium h-full w-64 border-r border-outline-variant/10 flex flex-col gap-2 p-4 pt-8 shrink-0 relative z-10">
        <div className="nav-item mb-8 px-2">
          <div className="text-lg font-headline font-bold text-primary mb-1">Gemini</div>
          <div className="text-[0.6875rem] text-primary-fixed uppercase tracking-wider">SRE Assistant</div>
        </div>
        {['auto_awesome', 'insights', 'history', 'menu_book'].map((icon, i) => (
          <a key={i} className="nav-item text-on-surface-variant hover:bg-surface-container p-3 rounded-sm flex items-center gap-3 transition-colors" href="#">
            <span className="material-symbols-outlined text-[18px]">{icon}</span>
            {['AI Assistant', 'Insights', 'History', 'Docs'][i]}
          </a>
        ))}
      </aside> */}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-12">
        <header className="main-header mb-16">
          <h1 className="text-[3.5rem] font-headline font-semibold tracking-[-0.02em] leading-tight text-primary mb-4">Topology Map</h1>
          <p className="text-[1.125rem] font-body text-primary-fixed max-w-2xl">Distributed flow analysis and real-time locking visualization.</p>
        </header>

        <div className="grid grid-cols-12 gap-12">
          <div className="col-span-8 space-y-12 relative min-h-[600px]">
            {/* Background Flow Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              <path className="flow-path stroke-primary/20 stroke-[1px] fill-none" d="M 150 100 L 150 200 L 400 200 L 400 300" strokeDasharray="10 5" />
              <path className="flow-path stroke-primary/20 stroke-[1px] fill-none" d="M 650 100 L 650 200 L 400 200" strokeDasharray="10 5" />
            </svg>

            {/* Ingestion Layer */}
            <section className="relative z-10">
              <div className="layer-header text-[0.6875rem] font-label uppercase tracking-wider text-primary-fixed mb-6 border-b border-surface-container-high pb-2">Ingestion Layer</div>
              <div className="grid grid-cols-2 gap-6">
                {[
                  { name: "Edge Ingest A", id: "a7f9-22", t: "4.2k", l: "12ms" },
                  { name: "Edge Ingest B", id: "b1c4-88", t: "3.8k", l: "14ms" }
                ].map((node, i) => (
                  <div key={i} className="topology-card bg-surface-container-lowest border border-outline-variant/10 p-6 rounded hover:border-primary/40 transition-colors cursor-pointer group">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-headline text-[1.125rem] font-medium group-hover:text-primary transition-colors">{node.name}</h3>
                      <span className="font-mono text-[0.6875rem] text-primary-fixed">{node.id}</span>
                    </div>
                    <div className="space-y-2 font-mono text-xs">
                      <div className="flex justify-between"><span>Throughput</span><span>{node.t} req/s</span></div>
                      <div className="flex justify-between"><span>Latency</span><span>{node.l}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Partitions Layer */}
            <section className="relative z-10 pt-12">
              <div className="layer-header text-[0.6875rem] font-label uppercase tracking-wider text-primary-fixed mb-6 border-b border-surface-container-high pb-2">Kafka Partitions</div>
              <div className="topology-card bg-surface-container-lowest border border-outline-variant/10 p-8 rounded flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="font-headline text-[1.5rem] font-medium">task_events_main</span>
                  <span className="font-mono text-[0.6875rem] text-primary-fixed">replication_factor: 3</span>
                </div>
                <div className="flex gap-2">
                  {[0, 1, 2, 3].map(p => (
                    <div key={p} className={`w-12 h-16 bg-surface-container-low flex items-center justify-center border-b-2 ${p === 3 ? 'border-error opacity-40' : 'border-tertiary-container'}`}>
                      <span className="font-mono text-[0.6875rem]">P{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Consumers */}
            <section className="relative z-10 pt-12">
              <div className="layer-header text-[0.6875rem] font-label uppercase tracking-wider text-primary-fixed mb-6 border-b border-surface-container-high pb-2">Active Consumers</div>
              <div className="grid grid-cols-3 gap-6">
                {['alpha', 'beta', 'gamma'].map((w, i) => (
                  <div key={i} className="topology-card bg-surface-container-lowest border border-outline-variant/10 p-5 rounded">
                    <div className="flex justify-between items-center mb-6">
                      <div className="font-mono text-[0.875rem] bg-surface-container-low px-2 py-1 rounded-sm">worker-{w}</div>
                      <span className={`material-symbols-outlined text-[16px] ${i === 2 ? 'text-error' : 'text-tertiary-container'}`}>
                        {i === 2 ? 'warning' : 'lock'}
                      </span>
                    </div>
                    <div className="w-full bg-surface-container-high h-1 rounded-full overflow-hidden">
                      <div className={`h-full ${i === 2 ? 'bg-error' : 'bg-tertiary-container'}`} style={{ width: i === 1 ? '30%' : '80%' }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Side Panel: Jitter Monitor */}
          <div className="col-span-4 space-y-8">
            <div className="bg-surface-container-low p-8 rounded h-full flex flex-col">
              <div className="mb-8">
                <h2 className="font-headline text-[1.5rem] font-medium mb-2">Jitter Monitor</h2>
                <p className="text-[0.875rem] text-primary-fixed">Thundering Herd Mitigation</p>
              </div>
              <div className="flex-1 flex flex-col justify-center">
                <div className="relative h-48 w-full border-b border-surface-container-highest mb-4 flex items-end justify-between px-2">
                  {[20, 45, 80, 100, 75, 50, 35, 15].map((h, i) => (
                    <div 
                      key={i} 
                      className={`jitter-bar w-[10%] rounded-t-sm ${h > 80 ? 'bg-tertiary-container' : 'bg-primary'}`} 
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4 font-mono">
                  <div>
                    <div className="text-[0.6875rem] text-primary-fixed uppercase mb-1">Tasks Dist.</div>
                    <div className="text-[1.125rem]">10,042</div>
                  </div>
                  <div>
                    <div className="text-[0.6875rem] text-primary-fixed uppercase mb-1">Window</div>
                    <div className="text-[1.125rem]">150ms</div>
                  </div>
                </div>
              </div>
              <button className="mt-8 w-full border border-outline-variant/40 text-primary py-3 rounded-sm text-[0.875rem] font-medium hover:bg-white/5 transition-colors">
                Adjust Jitter Seed
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}