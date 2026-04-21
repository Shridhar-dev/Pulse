'use client'

import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export default function TopologyMap() {
  const container = useRef(null);

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: "power4.out", duration: 1 } });

    // 1. Initial Reveal of Header
    tl.from(".header-element", {
      y: 30,
      opacity: 0,
      stagger: 0.2,
    })

    // 2. The Connecting Flow Line (Drawing it out)
    .from(".flow-line", {
      scaleX: 0,
      transformOrigin: "left center",
      duration: 1.5,
      ease: "expo.inOut"
    }, "-=0.5")

    // 3. Staggered Node Entrance
    .from(".topo-node", {
      y: 40,
      opacity: 0,
      stagger: 0.15,
      scale: 0.9,
      clearProps: "all"
    }, "-=1")

    // 4. Footer Stats Slide Up
    .from(".footer-stat", {
      y: 20,
      opacity: 0,
      stagger: 0.1
    }, "-=0.5");

    // 5. Continuous Flow Animation (Signal Pulse)
    // We create a "moving pulse" on the flow line gradient
    gsap.to(".flow-line", {
      backgroundPosition: "200% center",
      duration: 3,
      repeat: -1,
      ease: "none",
    });

    // 6. Active Node Pulse
    gsap.to(".active-ping", {
      scale: 1.5,
      opacity: 0,
      repeat: -1,
      duration: 1.5,
      ease: "power2.out"
    });

  }, { scope: container });

  const nodes = [
    { icon: "person", label: "User", sub: "ID: EXT-01", id: "user" },
    { icon: "router", label: "Gateway", sub: "INGRESS_V2", id: "gateway" },
    { icon: "hub", label: "Kafka Broker", sub: "PARTITION_04", id: "kafka", active: true, large: true },
    { icon: "memory", label: "Consumer", sub: "WORKER_X86", id: "consumer", active: true },
    { icon: "database", label: "Destination", sub: "PG_CLUSTER", id: "dest" }
  ];

  return (
    <main ref={container} className="pt-24 xl:ml-80 min-h-screen bg-surface-container-lowest p-8 lg:p-16 flex flex-col relative z-0 overflow-hidden">
      
      {/* Background Flow Line with Animated Gradient */}
      <div 
        className="flow-line absolute top-[55%] left-0 w-full h-[2px] z-0 hidden lg:block"
        style={{
          background: "linear-gradient(90deg, transparent 0%, var(--primary) 50%, transparent 100%)",
          backgroundSize: "200% 100%",
          opacity: 0.15
        }}
      ></div>

      <header className="mb-24 max-w-4xl">
        <div className="header-element flex items-center gap-3 mb-6">
          <div className="relative">
             <div className="w-2 h-2 rounded-full bg-tertiary-container shadow-[0_0_12px_rgba(0,133,91,0.6)]"></div>
             <div className="active-ping absolute inset-0 rounded-full bg-tertiary-container"></div>
          </div>
          <span className="font-mono text-xs text-on-surface-variant uppercase tracking-[0.2em]">Live Telemetry</span>
        </div>
        <h1 className="header-element font-headline text-[3.5rem] leading-none tracking-tight text-primary mb-4">
          Topology Map
        </h1>
        <p className="header-element font-body text-[1.125rem] text-on-surface-variant max-w-2xl font-medium">
          'Exactly-Once' Data Pipeline Configuration & Execution State
        </p>
      </header>

      <section className="relative w-full max-w-6xl mx-auto mt-12 flex-1 flex items-center justify-center">
        <div className="flex flex-col lg:flex-row items-center justify-between w-full gap-12 lg:gap-4 relative z-10">
          
          {nodes.map((node, i) => (
            <React.Fragment key={node.id}>
              {/* Node Column */}
              <div className="topo-node group flex flex-col items-center gap-4 w-40 relative">
                
                {/* Active Indicator */}
                {node.active && (
                   <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-tertiary-container shadow-[0_0_12px_rgba(0,133,91,0.5)] z-20"></div>
                )}

                {/* Icon Box */}
                <div className={`
                  ${node.large ? 'w-24 h-24' : 'w-20 h-20'} 
                  rounded-xl bg-surface-container-low border border-outline-variant/5 
                  flex items-center justify-center transition-all duration-500 
                  group-hover:-translate-y-2 group-hover:shadow-2xl group-hover:shadow-primary/10 
                  group-hover:border-primary/20 relative z-10
                `}>
                  <span className={`material-symbols-outlined ${node.large ? 'text-4xl' : 'text-3xl'} text-primary font-light`}>
                    {node.icon}
                  </span>
                </div>

                {/* Labeling */}
                <div className="text-center">
                  <h3 className="font-body text-sm font-semibold text-primary mb-1">{node.label}</h3>
                  <p className={`
                    font-mono text-[0.6875rem] uppercase tracking-widest 
                    ${node.active ? 'text-tertiary-fixed bg-surface-container-low px-2 py-1 rounded-sm' : 'text-on-surface-variant'}
                  `}>
                    {node.sub}
                  </p>
                </div>
              </div>

              {/* Mobile Arrows */}
              {i < nodes.length - 1 && (
                <div className="lg:hidden text-outline-variant/40 animate-bounce">
                  <span className="material-symbols-outlined">arrow_downward</span>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </section>

      <footer className="mt-32 max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-12 border-t border-outline-variant/10 pt-12">
        {[
          { label: "Throughput", val: "45,912 msg/s" },
          { label: "Latency (P99)", val: "12.4 ms" },
          { label: "System Status", val: "STABLE_EXACTLY_ONCE", isStatus: true }
        ].map((stat, i) => (
          <div key={i} className="footer-stat flex flex-col gap-2">
            <span className="font-mono text-[0.6875rem] text-on-surface-variant uppercase tracking-widest">{stat.label}</span>
            {stat.isStatus ? (
              <span className="font-mono text-sm text-tertiary-fixed mt-1 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                {stat.val}
              </span>
            ) : (
              <span className="font-headline text-2xl text-primary">{stat.val}</span>
            )}
          </div>
        ))}
      </footer>
    </main>
  );
}