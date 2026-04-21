'use client'
import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export default function VaultSettings() {
  const containerRef = useRef(null);

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: "power4.out", duration: 1 } });

    // 1. Header Reveal
    tl.from(".vault-title", { 
      y: 30, 
      opacity: 0, 
      duration: 1.2 
    })
    .from(".vault-desc", { 
      y: 20, 
      opacity: 0 
    }, "-=0.8")

    // 2. Section Stagger
    .from(".vault-section", {
      y: 40,
      opacity: 0,
      stagger: 0.2,
      clearProps: "all" // Ensures Tailwind hover states work after animation
    }, "-=0.6")

    // 3. API Key reveal (simulating a "decrypting" slide)
    .from(".api-input-group", {
      width: 0,
      opacity: 0,
      duration: 1.5,
      ease: "expo.inOut"
    }, "-=1")

    // 4. List Items Stagger
    .from(".key-item", {
      x: -20,
      opacity: 0,
      stagger: 0.1,
      duration: 0.8
    }, "-=0.5");

  }, { scope: containerRef });

  return (
    <main ref={containerRef} className="pt-24 pb-16 px-6 md:px-12 max-w-6xl mx-auto flex gap-12">
      <div className="flex-1 space-y-16">
        <header>
          <h1 className="vault-title font-headline text-[3.5rem] leading-none tracking-[-0.02em] text-primary mb-4">
            The Vault
          </h1>
          <p className="vault-desc font-body text-[1.125rem] text-on-surface-variant max-w-2xl">
            Manage your API keys, authentication tokens, and infrastructure access credentials.
          </p>
        </header>

        {/* Gemini AI Access Section */}
        <section className="vault-section bg-surface-container-low p-1 rounded-md overflow-hidden">
          <div className="bg-surface-container-lowest p-8 rounded-DEFAULT">
            <div className="flex items-start justify-between mb-8">
              <div>
                <h2 className="font-body text-[1.125rem] font-semibold text-on-surface mb-1">Gemini AI Access</h2>
                <p className="font-body text-[0.875rem] text-on-surface-variant">Bring Your Own Key (BYOK) configuration.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container ring-4 ring-tertiary-container/20"></span>
                <span className="font-label text-[0.6875rem] uppercase tracking-wider text-tertiary-container font-medium">Active</span>
              </div>
            </div>
            
            <form className="space-y-6">
              <div className="space-y-2">
                <label className="font-label text-[0.6875rem] uppercase tracking-wider text-on-surface-variant block">API Key</label>
                <div className="api-input-group relative flex items-center overflow-hidden">
                  <span className="material-symbols-outlined absolute left-0 text-on-surface-variant text-[18px]">key</span>
                  <input 
                    className="w-full bg-transparent border-0 border-b border-outline-variant/20 py-2 pl-7 pr-10 font-mono text-[0.875rem] text-on-surface focus:ring-0 focus:border-primary transition-colors" 
                    readOnly={true} 
                    type="password" 
                    value="AIzaSyB................................" 
                  />
                  <button className="absolute right-0 text-on-surface-variant hover:text-primary transition-colors hover:scale-110 active:scale-90" type="button">
                    <span className="material-symbols-outlined text-[18px]">visibility</span>
                  </button>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button className="bg-surface-container hover:bg-surface-dim text-on-surface px-6 py-2 rounded-DEFAULT font-body text-[0.875rem] font-medium transition-all hover:-translate-y-0.5 active:translate-y-0" type="button">Rotate Key</button>
                <button className="bg-transparent border border-outline-variant/10 text-error hover:bg-error-container/20 px-6 py-2 rounded-DEFAULT font-body text-[0.875rem] font-medium transition-colors" type="button">Revoke</button>
              </div>
            </form>
          </div>
        </section>

        {/* Active Keys Section */}
        <section className="vault-section bg-surface-container-low p-1 rounded-md">
          <div className="bg-surface-container-lowest p-8 rounded-DEFAULT">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="font-body text-[1.125rem] font-semibold text-on-surface mb-1">Active Keys</h2>
                <p className="font-body text-[0.875rem] text-on-surface-variant">Tokens used for external integrations.</p>
              </div>
              <button className="bg-primary text-on-primary px-5 py-2 rounded-sm font-body text-[0.875rem] font-medium hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">add</span>
                Create Key
              </button>
            </div>
            
            <div className="space-y-0">
              {[
                { name: "Production Web App", key: "pk_live_********************8f92", date: "Oct 12, 2023" },
                { name: "Staging Environment", key: "pk_test_********************4a1b", date: "Jan 05, 2024" }
              ].map((item, i) => (
                <div key={i} className="key-item flex items-center justify-between py-5 border-b border-outline-variant/10 last:border-0 hover:bg-surface-container-low/30 transition-colors px-2 -mx-2 rounded-lg group">
                  <div>
                    <h3 className="font-body text-[0.875rem] font-medium text-on-surface group-hover:text-primary transition-colors">{item.name}</h3>
                    <p className="font-mono text-[0.6875rem] text-on-surface-variant mt-1">{item.key}</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="font-body text-[0.875rem] text-on-surface-variant">{item.date}</span>
                    <button className="text-on-surface-variant hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-[20px]">more_horiz</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}