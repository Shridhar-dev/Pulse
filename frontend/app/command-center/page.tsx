'use client'
import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export default function CommandCenter() {
  const container = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: "power4.out", duration: 1 } });

    // 1. Initial Page Reveal
    tl.from(".header-content", { y: 30, opacity: 0, stagger: 0.2 })
      .from(".stat-card", { 
        y: 40, 
        opacity: 0, 
        stagger: 0.15,
        clearProps: "all" 
      }, "-=0.6")

    // 2. Number Counter Animation (24.8M)
    const targetValue = 24892104;
    const counterObj = { value: 0 };
    gsap.to(counterObj, {
      value: targetValue,
      duration: 3,
      delay: 0.5,
      ease: "expo.out",
      onUpdate: () => {
        if (counterRef.current ) {
          counterRef.current.innerHTML = Math.floor(counterObj.value).toLocaleString();
        }
      }
    });

    // 3. SVG Graph "Drawing" Animation
    gsap.from(".graph-line", {
      strokeDasharray: 1200,
      strokeDashoffset: 1200,
      duration: 2.5,
      delay: 1,
      ease: "power2.inOut"
    });

    // 4. Node Matrix Stagger (The grid of squares)
    gsap.from(".node-square", {
      scale: 0,
      opacity: 0,
      stagger: {
        each: 0.01,
        from: "random",
        grid: [6, 8]
      },
      duration: 0.8,
      delay: 1.2,
      ease: "back.out(2)"
    });

    // 5. Terminal Log Stagger
    gsap.from(".log-line", {
      x: -10,
      opacity: 0,
      stagger: 0.1,
      duration: 0.5,
      delay: 1.5
    });

  }, { scope: container });

  return (
    <div ref={container} className="flex-1 flex flex-col min-w-0 bg-surface-container-lowest relative text-on-surface h-screen overflow-hidden antialiased">
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-[1600px] mx-auto space-y-8">
          
          <div className="flex items-end justify-between mb-12">
            <div className="header-content">
              <h1 className="text-[3.5rem] leading-none font-headline font-bold tracking-[-0.02em] text-primary">System Overlook</h1>
              <p className="text-on-surface-variant font-body text-body-md mt-4 max-w-xl">Real-time telemetry and execution matrices for global infrastructure. Pulse rate is nominal.</p>
            </div>
            <div className="header-content flex items-center gap-3 text-label-sm font-label uppercase tracking-widest text-on-surface-variant">
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container shadow-[0_0_8px_rgba(0,133,91,0.4)]"></span>
                Live Sync
              </span>
              <span className="text-surface-dim">|</span>
              <span>UTC 14:02:45</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[minmax(280px,auto)]">
            
            {/* 1. Total Tasks Executed */}
            <div className="stat-card col-span-1 md:col-span-4 bg-surface-container-low rounded-lg p-8 flex flex-col justify-between relative overflow-hidden group">
              <div className="flex justify-between items-start">
                <h3 className="text-label-sm font-label uppercase tracking-wider text-on-surface-variant">Total Tasks Executed</h3>
                <span className="material-symbols-outlined text-[20px] text-surface-tint">memory</span>
              </div>
              <div className="mt-auto z-10">
                <div ref={counterRef} className="font-mono text-[4rem] leading-none tracking-tight text-primary font-medium">
                  0
                </div>
                <div className="flex items-center gap-2 mt-4 font-body text-body-md">
                  <span className="text-tertiary-fixed font-medium flex items-center">
                    <span className="material-symbols-outlined text-[16px] mr-1">trending_up</span>
                    +2.4%
                  </span>
                  <span className="text-on-surface-variant text-sm">vs last hour</span>
                </div>
              </div>
              {/* Background decorative circle */}
              <div className="absolute -right-12 -bottom-12 w-64 h-64 border border-outline-variant/20 rounded-full opacity-50 pointer-events-none group-hover:scale-110 transition-transform duration-700 ease-out"></div>
            </div>

            {/* 2. Tasks / Sec Graph */}
            <div className="stat-card col-span-1 md:col-span-8 bg-surface-container-low rounded-lg p-8 flex flex-col relative overflow-hidden">
              <div className="flex justify-between items-start mb-8 z-10">
                <h3 className="text-label-sm font-label uppercase tracking-wider text-on-surface-variant">Tasks / Sec</h3>
                <div className="flex gap-4">
                  <span className="text-xs font-mono text-on-surface-variant">Avg: 4.2k</span>
                  <span className="text-xs font-mono text-primary font-medium">Peak: 6.8k</span>
                </div>
              </div>
              <div className="flex-1 relative w-full h-full min-h-[180px]">
                <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 200">
                  <defs>
                    <linearGradient id="line-gradient" x1="0%" x2="100%" y1="0%" y2="0%">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.1"></stop>
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity="1"></stop>
                    </linearGradient>
                  </defs>
                  
                  {/* Grid Lines */}
                  {[50, 100, 150].map(y => (
                    <line key={y} stroke="currentColor" strokeDasharray="4 4" strokeOpacity="0.1" strokeWidth="1" x1="0" x2="1000" y1={y} y2={y} className="text-on-surface" />
                  ))}
                  
                  {/* The Line Graph */}
                  <path 
                    className="graph-line"
                    d="M0,180 C50,180 80,120 120,130 C160,140 190,80 240,60 C290,40 320,110 380,90 C440,70 470,160 520,140 C570,120 600,50 650,40 C700,30 740,90 800,100 C860,110 900,50 950,30 L1000,20" 
                    fill="none" 
                    stroke="url(#line-gradient)" 
                    strokeWidth="3"
                    strokeDasharray="1200"
                    strokeDashoffset="0"
                  />
                </svg>
              </div>
            </div>

            {/* 3. Kafka Terminal Feed */}
            <div className="stat-card col-span-1 md:col-span-6 bg-surface-container-low rounded-lg p-6 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-label-sm font-label uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                  Kafka Offsets Feed
                </h3>
                <button className="text-xs font-mono text-surface-tint hover:text-primary">Pause</button>
              </div>
              <div className="flex-1 bg-surface-container-lowest rounded-DEFAULT border border-outline-variant/10 p-4 font-mono text-[0.8rem] leading-relaxed overflow-hidden relative">
                <div className="space-y-1">
                  {[
                    { time: "14:02:40", tag: "INFO", msg: "Offset committed: topic=events-prod p=4 offset=948271" },
                    { time: "14:02:41", tag: "INFO", msg: "Offset committed: topic=auth-logs p=1 offset=22841" },
                    { time: "14:02:42", tag: "WARN", msg: "Rebalance triggered: group=consumer-metrics-v2", error: true },
                    { time: "14:02:44", tag: "INFO", msg: "Partitions assigned: topic=metrics-raw p=0,1,2,3" },
                    { time: "14:02:45", tag: "INFO", msg: "Offset committed: topic=events-prod p=4 offset=948285" }
                  ].map((log, i) => (
                    <div key={i} className="log-line flex gap-4 opacity-70">
                      <span className="w-16 text-right text-surface-dim">[{log.time}]</span>
                      <span className={log.error ? "text-error" : "text-tertiary"}>{log.tag}</span>
                      <span className="text-on-surface truncate">{log.msg}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. Azure Node Matrix */}
            <div className="stat-card col-span-1 md:col-span-6 bg-surface-container-low rounded-lg p-6 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-label-sm font-label uppercase tracking-wider text-on-surface-variant">Azure Node Matrix</h3>
                <div className="flex gap-3 text-xs font-mono text-on-surface-variant">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-tertiary-container"></span> 42</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-error"></span> 1</span>
                </div>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <div className="grid grid-cols-8 gap-2 w-full max-w-md">
                  {Array.from({length: 48}).map((_, i) => {
                    const isError = i === 11;
                    const isDim = [2, 17, 26, 30, 39].includes(i);
                    const bg = isError ? 'bg-error' : isDim ? 'bg-surface-dim' : 'bg-tertiary-container';
                    return (
                      <div 
                        key={i} 
                        className={`node-square aspect-square rounded-[2px] cursor-pointer relative group ${bg} transition-all hover:scale-125 hover:z-20`}
                      >
                        {isError && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 p-2 bg-inverse-surface text-inverse-on-surface text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                            NODE_ERR_503: Latency spike
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}