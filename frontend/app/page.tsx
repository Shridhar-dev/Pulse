'use client'
import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register ScrollTrigger plugin
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function NexusLanding() {
  const containerRef = useRef(null);
  const svgPathRef = useRef(null);

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: "power4.out", duration: 1.2 } });

    // 1. Hero Entrance Animation
    tl.from(".hero-badge", { y: -20, opacity: 0, duration: 0.8 })
      .from(".hero-title", { y: 40, opacity: 0, stagger: 0.2 }, "-=0.6")
      .from(".hero-desc", { y: 20, opacity: 0 }, "-=0.8")
      .from(".hero-btns", { y: 20, opacity: 0 }, "-=1");

    // 2. Animate the SVG Background Path (Drawing effect)
    gsap.fromTo(svgPathRef.current, 
      { strokeDasharray: 1000, strokeDashoffset: 1000 }, 
      { strokeDashoffset: 0, duration: 3, ease: "power2.inOut", delay: 0.5 }
    );

    // 3. Bento Grid Scroll Animations
    gsap.from(".bento-card", {
      scrollTrigger: {
        trigger: ".bento-grid",
        start: "top 80%",
        toggleActions: "play none none none"
      },
      y: 60,
      opacity: 0,
      stagger: 0.2,
      duration: 1,
      ease: "expo.out"
    });

    // 4. Gauge Animation (Triggers when scrolled into view)
    gsap.from(".gauge-path", {
      scrollTrigger: {
        trigger: ".gauge-path",
        start: "top 90%",
      },
      strokeDasharray: 250,
      strokeDashoffset: 250,
      duration: 2,
      delay: 0.5,
      ease: "power2.out"
    });

  }, { scope: containerRef });

  return (
    <main ref={containerRef} className="w-full flex flex-col items-center overflow-hidden bg-surface-container-lowest">
      <section className="relative w-full max-w-7xl mx-auto px-8 pt-32 pb-48 flex flex-col items-center text-center">
        
        {/* Background SVG with Animation Ref */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] pointer-events-none -z-10 overflow-hidden flex justify-center items-start pt-20 opacity-40">
          <svg fill="none" height="400" viewBox="0 0 800 400" width="800">
            <path 
              ref={svgPathRef}
              d="M0 200 L 250 200 L 300 100 L 350 300 L 400 50 L 450 350 L 500 150 L 550 200 L 800 200" 
              stroke="#c6c6c6" 
              strokeDasharray="4 4" 
              strokeWidth="1"
            />
            <circle className="animate-pulse" cx="400" cy="50" fill="#00855b" r="6" />
          </svg>
        </div>

        <div className="hero-badge inline-flex items-center gap-2 px-3 py-1 bg-surface-container-low rounded-full mb-8">
          <span className="w-2 h-2 rounded-full bg-tertiary-container relative">
            <span className="absolute inset-0 rounded-full bg-tertiary-container opacity-50 animate-ping"></span>
          </span>
          <span className="text-xs font-label uppercase tracking-widest text-on-surface-variant font-medium">System Online</span>
        </div>

        <h1 className="hero-title text-[4.5rem] leading-[1.05] tracking-tight font-headline font-bold text-primary max-w-4xl mb-6">
          Precision at Scale.
        </h1>
        
        <p className="hero-desc text-lg text-on-surface-variant max-w-2xl font-body leading-relaxed mb-12">
          Infrastructure intelligence engineered for the absolute edge. Ensure <span className="text-primary font-semibold">Exactly-Once Delivery</span> and process over <span className="text-primary font-semibold">10k+ TPS</span> with zero latency overhead.
        </p>

        <div className="hero-btns flex items-center gap-4">
          <button className="bg-primary text-on-primary px-6 py-3 rounded text-sm font-semibold hover:scale-105 active:scale-95 transition-transform tracking-wide">
            Initialize Pulse
          </button>
          <button className="bg-transparent text-primary px-6 py-3 rounded text-sm font-medium ring-1 ring-outline-variant/30 hover:bg-surface-container transition-colors tracking-wide">
            Read Documentation
          </button>
        </div>
      </section>

      {/* Bento Grid Section */}
      <section className="w-full bg-surface-container-low py-24 px-8 relative">
        <div className="absolute top-0 left-0 w-full h-px bg-outline-variant/10"></div>
        <div className="max-w-7xl mx-auto bento-grid">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Feature 1: Exactly-Once */}
            <div className="bento-card col-span-1 md:col-span-2 bg-surface-container-lowest rounded-lg p-10 flex flex-col justify-between border border-outline-variant/5 hover:border-primary/20 transition-colors">
              <div className="mb-12">
                <span className="material-symbols-outlined text-primary mb-4 text-[28px]">verified</span>
                <h3 className="font-headline text-2xl font-semibold tracking-tight text-primary mb-2">Exactly-Once Delivery</h3>
                <p className="text-on-surface-variant font-body text-sm max-w-md leading-relaxed">
                  Our bespoke idempotency engine guarantees message delivery precisely one time. No duplicates, no drops.
                </p>
              </div>
              <div className="bg-surface-bright rounded p-6 ring-1 ring-outline-variant/10 font-mono text-sm text-on-surface-variant">
                <div className="flex justify-between items-center mb-4 border-b border-outline-variant/10 pb-2">
                  <span className="text-xs uppercase tracking-widest text-secondary">Transaction Log</span>
                  <span className="text-tertiary-container flex items-center gap-1">Verified</span>
                </div>
                <div className="space-y-2 opacity-80">
                  <div className="flex"><span className="text-secondary w-8">01</span><span className="text-primary">await</span> pulse.commit({'{'}</div>
                  <div className="flex"><span className="text-secondary w-8">02</span>  idempotencyKey: <span className="text-tertiary">'req_9A4f2B'</span>,</div>
                  <div className="flex"><span className="text-secondary w-8">03</span>  level: <span className="text-tertiary">'EXACTLY_ONCE'</span></div>
                  <div className="flex"><span className="text-secondary w-8">04</span>{'}'});</div>
                </div>
              </div>
            </div>

            {/* Feature 2: High Throughput */}
            <div className="bento-card col-span-1 bg-surface-container-lowest rounded-lg p-10 flex flex-col justify-between border border-outline-variant/5">
              <div>
                <span className="material-symbols-outlined text-primary mb-4 text-[28px]">speed</span>
                <h3 className="font-headline text-2xl font-semibold tracking-tight text-primary mb-2">10k+ TPS</h3>
                <p className="text-on-surface-variant font-body text-sm leading-relaxed mb-8">
                  Sustained throughput capabilities built for hyper-growth.
                </p>
              </div>
              <div className="w-full flex flex-col items-center justify-center py-8 relative">
                <svg className="w-full h-auto max-w-[200px] overflow-visible" viewBox="0 0 100 50">
                  <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#f0f1f1" strokeLinecap="round" strokeWidth="8"></path>
                  <path className="gauge-path drop-shadow-[0_0_8px_rgba(0,133,91,0.3)]" d="M 10 50 A 40 40 0 0 1 70 20" fill="none" stroke="#00855b" strokeLinecap="round" strokeWidth="8"></path>
                </svg>
                <div className="absolute bottom-4 flex flex-col items-center">
                  <span className="font-headline text-3xl font-bold text-primary tracking-tighter">12,408</span>
                  <span className="font-label text-[10px] uppercase tracking-widest text-secondary mt-1">Req / Sec</span>
                </div>
              </div>
            </div>

            {/* Feature 3: Global Topology */}
            <div className="bento-card col-span-1 md:col-span-3 bg-surface-container-lowest rounded-lg p-10 flex flex-col md:flex-row items-center justify-between gap-12 border border-outline-variant/5">
              <div className="md:w-1/3">
                <h3 className="font-headline text-2xl font-semibold tracking-tight text-primary mb-3">Global Topology</h3>
                <p className="text-on-surface-variant font-body text-sm leading-relaxed mb-6">
                  Distributed globally, managed centrally. Pulse operates across 34 regions.
                </p>
                <button className="text-primary font-medium text-sm flex items-center gap-1 group">
                  View Node Registry 
                  <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </button>
              </div>
              <div className="md:w-2/3 w-full h-[300px] rounded bg-surface-container relative overflow-hidden group">
                <div className="absolute inset-0 bg-primary/5 group-hover:bg-transparent transition-colors duration-500 z-10"></div>
                <img alt="Global network" className="w-full h-full object-cover opacity-80 grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700" src="https://images.unsplash.com/photo-1557821314-4a50ad4449b7?auto=format&fit=crop&q=80&w=1000" />
              </div>
            </div>

          </div>
        </div>
      </section>
    </main>
  );
}