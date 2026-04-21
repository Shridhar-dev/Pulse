'use client'

import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export default function SettingsConfig() {
  const container = useRef(null);

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: "power4.out", duration: 1 } });

    // 1. Sidebar Entrance (Slide from right)
    tl.from(".sidebar-right", { 
      x: 100, 
      opacity: 0, 
      duration: 1.2 
    })
    .from(".sidebar-item", { 
      y: 20, 
      opacity: 0, 
      stagger: 0.1 
    }, "-=0.8")

    // 2. Main Content Header
    .from(".settings-title", { 
      y: 40, 
      opacity: 0, 
      duration: 1.2 
    }, "-=1")

    // 3. Section Reveal (Identity, Topography, etc.)
    .from(".settings-section", {
      y: 30,
      opacity: 0,
      stagger: 0.2,
      clearProps: "all"
    }, "-=0.8")

    // 4. Infrastructure Cards (Mini stagger within the section)
    .from(".infra-card", {
      scale: 0.9,
      opacity: 0,
      stagger: 0.1,
      ease: "back.out(1.7)"
    }, "-=0.5")

    // 5. Input Line Underline Animation
    .from(".input-line", {
      scaleX: 0,
      transformOrigin: "left center",
      stagger: 0.1,
      duration: 1.5
    }, "-=1");

  }, { scope: container });

  return (
    <div ref={container} className="flex flex-1 overflow-hidden h-[calc(100vh-65px)] bg-surface-container-lowest">
      
      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto bg-surface-container-lowest relative">
        <div className="max-w-4xl w-full mx-auto px-12 py-16 flex flex-col gap-16">
          <header>
            <h2 className="settings-title font-headline text-[3.5rem] leading-none tracking-[-0.02em] text-primary">Settings</h2>
          </header>

          {/* 1. Identity Section */}
          <section className="settings-section flex flex-col gap-6">
            <h3 className="font-headline text-2xl font-medium text-primary tracking-tight">Identity</h3>
            <div className="bg-surface-container-lowest p-8 rounded-lg shadow-sm border border-outline-variant/10 flex gap-10 items-start">
              <div className="flex flex-col items-center gap-4">
                <div className="w-24 h-24 rounded-full bg-surface-container-low flex items-center justify-center overflow-hidden relative group cursor-pointer border border-outline-variant/10">
                  <img alt="Profile" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fit=crop&w=200&h=200" />
                  <div className="absolute inset-0 bg-primary/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-white">upload</span>
                  </div>
                </div>
                <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Update</span>
              </div>
              <div className="flex-1 flex flex-col gap-6">
                <div className="flex flex-col gap-1 relative group">
                  <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant group-focus-within:text-primary transition-colors">Full Name</label>
                  <input className="w-full bg-transparent border-0 border-b border-outline-variant/20 px-0 py-2 text-primary font-body text-sm focus:ring-0 focus:border-primary transition-colors" type="text" defaultValue="Elena Rostova" />
                  <div className="input-line absolute bottom-0 left-0 w-full h-1px bg-primary scale-x-0"></div>
                </div>
                <div className="flex flex-col gap-1 relative group">
                  <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant group-focus-within:text-primary transition-colors">Work Email</label>
                  <input className="w-full bg-transparent border-0 border-b border-outline-variant/20 px-0 py-2 text-primary font-body text-sm focus:ring-0 focus:border-primary transition-colors" type="email" defaultValue="elena.rostova@pulse.dev" />
                  <div className="input-line absolute bottom-0 left-0 w-full h-px bg-primary scale-x-0"></div>
                </div>
              </div>
            </div>
          </section>

          {/* 2. Topography Section */}
          <section className="settings-section flex flex-col gap-6">
            <h3 className="font-headline text-2xl font-medium text-primary tracking-tight">Active Topography</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: "public", label: "Azure Region", val: "US-East-1" },
                { icon: "schema", label: "Kafka Version", val: "3.5.1" },
                { icon: "view_stream", label: "Partitions", val: "3" }
              ].map((item, i) => (
                <div key={i} className="infra-card bg-surface-container-low p-6 rounded-lg flex flex-col justify-between aspect-4/3 hover:shadow-lg hover:shadow-primary/5 transition-all hover:-translate-y-1">
                  <span className="material-symbols-outlined text-on-surface-variant">{item.icon}</span>
                  <div>
                    <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">{item.label}</p>
                    <p className="font-mono text-primary text-sm font-bold">{item.val}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 3. Security Section */}
          <section className="settings-section flex flex-col gap-6">
            <h3 className="font-headline text-2xl font-medium text-primary tracking-tight">Security Credentials</h3>
            <div className="bg-surface-container-lowest p-8 rounded-lg shadow-sm border border-outline-variant/10 flex flex-col gap-6">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-body text-base font-semibold text-primary">Gemini API Configuration</h4>
                  <p className="font-body text-sm text-on-surface-variant mt-1">BYOK active for telemetry inference.</p>
                </div>
                <span className="bg-tertiary/10 text-tertiary font-mono text-[10px] px-2 py-1 rounded border border-tertiary/20">PRODUCTION</span>
              </div>
              <div className="bg-surface-container-low p-4 rounded-md flex items-center justify-between group cursor-pointer hover:bg-surface-container-high transition-colors">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-on-surface-variant text-[18px]">key</span>
                  <code className="font-mono text-xs text-primary">sk-gemini-***************************8f9a</code>
                </div>
                <span className="material-symbols-outlined text-[18px] opacity-0 group-hover:opacity-100 transition-opacity">content_copy</span>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* RIGHT SIDEBAR: Gemini SRE Assistant */}
      {/* <aside className="sidebar-right hidden xl:flex flex-col p-6 h-full w-80 bg-surface-container-lowest border-l border-outline-variant/10 z-20 shrink-0">
        <div className="sidebar-item mb-8">
          <h2 className="font-headline font-bold text-lg text-tertiary flex items-center gap-2">
            <span className="material-symbols-outlined animate-spin-[3s]">auto_awesome</span>
            Gemini SRE
          </h2>
          <p className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant mt-2">Operational Intelligence</p>
        </div>
        
        <div className="flex-1 flex flex-col gap-8">
          <div className="sidebar-item flex flex-col gap-2">
            <label className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Inference Model</label>
            <div className="relative group">
              <select className="w-full appearance-none bg-surface-container-low border border-outline-variant/10 text-primary text-sm rounded-DEFAULT py-2.5 px-3 focus:border-tertiary transition-colors">
                <option>Gemini 1.5 Pro</option>
                <option>Gemini 1.5 Flash</option>
              </select>
              <span className="material-symbols-outlined absolute right-2 top-2.5 pointer-events-none group-hover:translate-y-0.5 transition-transform">expand_more</span>
            </div>
          </div>

          <div className="sidebar-item flex flex-col gap-2">
            <label className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Telemetry Access</label>
            <div className="p-3 bg-surface-container-low rounded-DEFAULT border border-tertiary/30">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-tertiary"></div>
                <span className="font-body text-sm font-medium">Full Cluster View</span>
              </div>
              <p className="text-[11px] text-on-surface-variant">Model can analyze all cluster logs.</p>
            </div>
          </div>
        </div>

        <div className="sidebar-item mt-auto pt-6 border-t border-outline-variant/10 flex items-center justify-between">
          <span className="font-mono text-[10px] text-on-surface-variant">Status: Online</span>
          <div className="w-2 h-2 rounded-full bg-tertiary shadow-[0_0_8px_rgba(0,133,91,0.6)] animate-pulse"></div>
        </div>
      </aside> */}
    </div>
  );
}