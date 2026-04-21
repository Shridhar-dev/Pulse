'use client'
import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';  

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function NexusLanding() {
  const containerRef = useRef(null);

  useEffect(() => {
    // 1. Initialize Lenis
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), 
    });

    // 2. Sync ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);
    const tickerRaf = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(tickerRaf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.destroy();
      gsap.ticker.remove(tickerRaf);
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, []);

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: "power4.out", duration: 1.2 } });

    // Hero Animation
    tl.from(".hero-badge", { y: -20, opacity: 0, duration: 0.8 })
      .from(".hero-title", { y: 40, opacity: 0, stagger: 0.2 }, "-=0.6")
      .from(".hero-desc", { y: 20, opacity: 0 }, "-=0.8")
      .from(".hero-btns", { y: 20, opacity: 0 }, "-=1")
      .from(".hero-img", { y: 40, opacity: 0, duration: 1.5 }, "-=0.8");

    // Bento Grid Anim
    gsap.from(".bento-card", {
      scrollTrigger: {
        trigger: ".bento-grid",
        start: "top 80%",
        toggleActions: "play none none none"
      },
      y: 60,
      opacity: 0,
      stagger: 0.2,
    });

    // Content Block Anim
    gsap.from(".feature-row", {
      scrollTrigger: {
        trigger: ".feature-list",
        start: "top 80%",
      },
      x: -40,
      opacity: 0,
      stagger: 0.2,
    });

    ScrollTrigger.refresh();
  }, { scope: containerRef });

  return (
    <main ref={containerRef} className="pt-32">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 text-center">
        <span className="hero-badge inline-flex items-center px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed text-[12px] font-semibold tracking-[0.05em] mb-6">
          Announcing Pulse Engine v2.0
        </span>
        <h1 className="hero-title font-bold text-[48px] leading-[1.1] tracking-tight text-on-surface mb-6 max-w-3xl mx-auto">
          Precision at Scale.
        </h1>
        <p className="hero-desc text-[16px] leading-[1.6] text-on-surface-variant max-w-2xl mx-auto mb-10">
          Infrastructure event coordination for high-throughput systems. Guaranteed exactly-once delivery at over 10,000 transactions per second with sub-millisecond latency.
        </p>
        <div className="hero-btns flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
          <button className="w-full sm:w-auto px-8 py-4 bg-primary text-on-primary font-semibold text-[16px] rounded-lg shadow-lg shadow-primary/20 hover:opacity-95 transition-all">
            Get Started
          </button>
          <button className="w-full sm:w-auto px-8 py-4 bg-surface-container border border-outline-variant text-on-surface text-[16px] rounded-lg hover:bg-surface-container-high transition-all">
            Read Documentation
          </button>
        </div>
        <div className="hero-img relative max-w-6xl mx-auto">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-secondary/30 rounded-xl blur-2xl opacity-20"></div>
          <div className="relative rounded-xl border border-outline-variant bg-white p-2 shadow-2xl">
            <img 
              alt="Pulse Dashboard Interface" 
              className="rounded-lg w-full h-auto object-cover border border-outline-variant" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuC0sSGOF6ZpWv1m20B7TWZB6c1iAxim7dc6QdumTqaOQcNut7p1amfLVWjL56DAa8dKxj9pHmxr-R6gw12slVznfBGIBeOSZE8fWeCBOmyoYO8I-Zm6fR5EGML7ZRKuwZNA2ljebEhbS2ihBFJyJoX4Wk9PlLPCfiaOCBYyMWYCpCeqUenwtX-uZNzu98rsYlaVtP6tI_t4EZFZ5Nd96EhgUJ-QBJ_I8hN0AwJ2Zt3ZqjI1taJYDvSYJ1BEkGTCw27XkaFJwWj_4g"
            />
          </div>
        </div>
      </section>

      {/* Trusted By */}
      <section className="py-24 border-y border-outline-variant mt-24 bg-surface-container-lowest">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-[12px] font-semibold tracking-[0.05em] text-on-surface-variant mb-12 uppercase">
            TRUSTED BY INDUSTRY LEADERS IN INFRASTRUCTURE
          </p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            <img className="h-8" alt="minimalist tech logo" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBLEnPe6UIzF7rZIcsazzLyBPybOxvikmcRcCwVwk2VSyAnk4eaDkxv8AY6khWTo4C9Stx7HQ6smhWtSOzGmYX81BQhkJeU2IDRM8AodMMgyXpXNF2io3UAmnl7Jd1i53eJiQj_pgvgzYWSBVRtoK_8Lpbjo81ukT6mMatH604UHuTeGYCQ0GLzDwTbJniGrlP6dJ68uQYsazTAA4cLj3Yw2qNtyUDkq-EXL2TeZNtX6DGyKkMLy9rqAhszaF7-Q5kR2gTvzIfbhA"/>
            <img className="h-8" alt="modern startup logo" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDIfsViVH_2P9XzB8nf7P_ddPUgPCQ5BUW6negsg1OI_i3aeHQNeFGpeUqUllNeT0UpEQgk38KP4mz2UPqneq5B8pi-rO11CIIwp1pFxXNNHocHX1yTMZOwxjlX2U3xlsthqn-Ru52vvoWpiqHDDyfScn8PDNgFMe39rLvpXIOgjyoFWB9Rr4zlFFa2LpKsSr1OjE-mUroX40vDuYiL5cWLlmudyCQR97g_t3IHOW0SbOCJduGiPKeAZgcvQSzEHNrwXV4BApLlog"/>
            <img className="h-8" alt="abstract brand mark" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAJIp0xvJpb28tU_bUvEFZAMVqiL0Cla6X3MOLMprjRkDYhuvfFg5GuEx4PQjHjDbcuM90bStpXBJE-XuNNcmB5gBHsge7Ign03R6ggbJP9JxZ_VyhNV5b6wxITFbDZYpsu5m0UFsYnuZg-XuubqCmIhEwdqyqlTXTRpNGHMD-NOkM5dRw8uBEW-xiXb8l1lLNTPXIJRpKtdhbvqnFu_7kmV_E0aYnvQxAoIV9EubQcyhLrMiKRyqZjli9bXqvkz7wnb3LVkYOvzw"/>
            <img className="h-8" alt="geometric technology logo" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCkTAi4b5Q1F3tqMDSDAhLsaNOROoPEaHJArTMCFdEpOPrXqDW6PWFScZhmoPCbm6kCZShgr9SMj2wEOOz0uaC2kvxw81lO7edw1s9k_fVtCDGabevGStnOkMDh8gAS1bAPSLrJzfUFp3OuInxXfQ5Z350gHaEtx5HpCWv4uFflN2KhtJWqahTC8u-HZkKHpDAzhZnHs4--PXbXZcEwopwYYvx1HB5uFvWFWJ25ee0hlEhQduvobY4gF4vg_fmg6N6Cvce3baNjgw"/>
            <img className="h-8" alt="minimalist saas logo" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBfKpBVKQo2RR1hedCcPtHl8akuk9h87q_J9aU5WCDR8BBBqcy5BsKa7DmzxfL91V663qTs6cCxsIEG5FSC2y0C1iBQRpx9pamWkIck5N-8DVC_i_nhJ1KIkiiGMKy5WcMLF5iVLnkJbOzpszQIkVJO8x_ky2BX_XOJGiH3vGLPHZTh_EpOYlAGo9Hrcm1PGkm5AN5OtRXKUIwnQaYb_-F59ggti9dTcrr-j0j7ty7oeDCC_7ytWP5OSdaZTzK7EwHz-z9E8RbSXg"/>
          </div>
        </div>
      </section>

      {/* Bento Grid Features */}
      <section className="py-[80px] max-w-7xl mx-auto px-6">
        <div className="bento-grid grid grid-cols-12 gap-6">
          {/* Large Card: Exactly-Once Journey */}
          <div className="bento-card col-span-12 lg:col-span-8 p-[24px] rounded-xl border border-outline-variant bg-white relative overflow-hidden group">
            <div className="relative z-10">
              <span className="text-primary text-[12px] font-semibold tracking-[0.05em] uppercase">CORE ARCHITECTURE</span>
              <h3 className="font-semibold text-[32px] leading-[1.2] mt-2 mb-4 tracking-[-0.02em]">Exactly-Once Journey</h3>
              <p className="text-on-surface-variant max-w-md">Trace every event from ingress to consumer with cryptographic certainty. No duplicates, no dropped packets.</p>
              
              <div className="mt-12 flex items-center justify-between gap-4 p-8 bg-surface-container-low rounded-lg border border-outline-variant/30">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-white border border-outline-variant flex items-center justify-center mb-2">
                    <span className="material-symbols-outlined text-primary">person</span>
                  </div>
                  <span className="text-[12px] font-semibold uppercase">User</span>
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-primary to-secondary"></div>
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-white border border-outline-variant flex items-center justify-center mb-2">
                    <span className="material-symbols-outlined text-primary">hub</span>
                  </div>
                  <span className="text-[12px] font-semibold uppercase">Gateway</span>
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-secondary to-primary-container"></div>
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-white border border-outline-variant flex items-center justify-center mb-2">
                    <span className="material-symbols-outlined text-primary">terminal</span>
                  </div>
                  <span className="text-[12px] font-semibold uppercase">Kafka</span>
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-primary-container to-secondary-container"></div>
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-white border border-outline-variant flex items-center justify-center mb-2">
                    <span className="material-symbols-outlined text-primary">check_circle</span>
                  </div>
                  <span className="text-[12px] font-semibold uppercase">Consumer</span>
                </div>
              </div>
            </div>
          </div>

          {/* Small Card: 10k+ TPS */}
          <div className="bento-card col-span-12 md:col-span-6 lg:col-span-4 p-[24px] rounded-xl border border-outline-variant bg-white">
            <span className="text-primary text-[12px] font-semibold tracking-[0.05em] uppercase">PERFORMANCE</span>
            <h3 className="font-semibold text-[32px] leading-[1.2] mt-2 mb-4 tracking-[-0.02em]">10k+ TPS</h3>
            <p className="text-on-surface-variant mb-8">Unrivaled throughput across geo-distributed clusters.</p>
            <div className="flex items-end justify-between h-32 gap-1 px-4">
              <div className="w-full bg-surface-container-highest rounded-t-sm" style={{height: '40%'}}></div>
              <div className="w-full bg-surface-container-highest rounded-t-sm" style={{height: '60%'}}></div>
              <div className="w-full bg-primary rounded-t-sm" style={{height: '90%'}}></div>
              <div className="w-full bg-surface-container-highest rounded-t-sm" style={{height: '70%'}}></div>
              <div className="w-full bg-primary-container rounded-t-sm" style={{height: '100%'}}></div>
              <div className="w-full bg-surface-container-highest rounded-t-sm" style={{height: '80%'}}></div>
              <div className="w-full bg-secondary rounded-t-sm" style={{height: '95%'}}></div>
            </div>
          </div>

          {/* Small Card: Idempotency Engine */}
          <div className="bento-card col-span-12 md:col-span-6 lg:col-span-4 p-[24px] rounded-xl border border-outline-variant bg-white">
            <span className="text-primary text-[12px] font-semibold tracking-[0.05em] uppercase">RELIABILITY</span>
            <h3 className="font-semibold text-[32px] leading-[1.2] mt-2 mb-4 tracking-[-0.02em]">Idempotency Engine</h3>
            <p className="text-on-surface-variant mb-6">Automated state reconciliation for every transaction.</p>
            <div className="flex items-center justify-center py-6">
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" style={{animationDuration: '3s'}}></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary" style={{fontSize: '32px'}}>sync</span>
                </div>
              </div>
            </div>
          </div>

          {/* Wide Card: Global Topology */}
          <div className="bento-card col-span-12 lg:col-span-8 p-[24px] rounded-xl border border-outline-variant bg-white overflow-hidden">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="md:w-1/3">
                <span className="text-primary text-[12px] font-semibold tracking-[0.05em] uppercase">DISTRIBUTION</span>
                <h3 className="font-semibold text-[32px] leading-[1.2] mt-2 mb-4 tracking-[-0.02em]">Global Topology</h3>
                <p className="text-on-surface-variant">Edge-caching nodes in 42 regions worldwide for 10ms global latency.</p>
              </div>
              <div className="md:w-2/3 h-48 bg-surface-container rounded-lg relative overflow-hidden">
                <img alt="World map with nodes" className="w-full h-full object-cover opacity-40" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC_b4J1a9h47nlcBXi0CRelPE42anhDYU099GCzmKcnmTvAgAz14K8w1U0pASngXVdJwv4nDU3cG3Y5XiPEth1-_ttJCA8UCfl8a_jvRIhdPRPGFbE5p6PYuGT4PIEstZupWR0F_R6vhQzJoDk1IcIleZMMQy5CEKmbMSU0MbuiQjbjczkNgNM6wrz8PbAiwQU177lq0QKI6r_eIoGU6FeTT-GgkAs6HPXqWvNDcFslLeU6LPRW8Y1D79Ii8sjBBH-u9pFMF4HiJw"/>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 bg-primary rounded-full animate-pulse shadow-[0_0_10px_rgba(70,72,212,0.8)]"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Engineered for Builders Section */}
      <section className="py-[80px] bg-surface-container-low border-y border-outline-variant">
        <div className="feature-list max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-primary text-[12px] font-semibold tracking-[0.05em] uppercase">DEVELOPER FIRST</span>
            <h2 className="font-semibold text-[32px] leading-[1.2] mt-4 mb-8 tracking-[-0.02em]">Engineered for Builders</h2>
            <ul className="space-y-8">
              <li className="feature-row flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white border border-outline-variant flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary">sdk</span>
                </div>
                <div>
                  <h4 className="font-semibold text-[24px] mb-1">Native SDKs</h4>
                  <p className="text-on-surface-variant text-[14px]">First-class support for TypeScript, Go, Rust, and Python with zero dependencies.</p>
                </div>
              </li>
              <li className="feature-row flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white border border-outline-variant flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary">monitoring</span>
                </div>
                <div>
                  <h4 className="font-semibold text-[24px] mb-1">Observability</h4>
                  <p className="text-on-surface-variant text-[14px]">Built-in OpenTelemetry integration for deep trace visibility into your event flows.</p>
                </div>
              </li>
              <li className="feature-row flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white border border-outline-variant flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary">settings_backup_restore</span>
                </div>
                <div>
                  <h4 className="font-semibold text-[24px] mb-1">Automated Failover</h4>
                  <p className="text-on-surface-variant text-[14px]">Multi-region active-active clusters with zero-downtime maintenance windows.</p>
                </div>
              </li>
            </ul>
          </div>
          <div className="rounded-xl bg-[#030712] p-1 shadow-2xl overflow-hidden bento-card">
            <div className="flex items-center gap-2 px-4 py-3 bg-[#111827] border-b border-gray-800">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/20"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/20"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/20"></div>
              </div>
              <span className="text-[13px] font-mono text-gray-400 ml-2">pulse.config.ts</span>
            </div>
            <div className="p-6 font-mono text-[13px] text-indigo-300 overflow-x-auto leading-[1.5]">
              <pre><code><span className="text-purple-400">import</span> {'{'} defineConfig {'}'} <span className="text-purple-400">from</span> <span className="text-green-400">'@pulse/sdk'</span>;

<span className="text-purple-400">export default</span> <span className="text-yellow-400">defineConfig</span>({'{'}
  <span className="text-gray-400">// Precision event routing</span>
  <span className="text-indigo-400">cluster</span>: <span className="text-green-400">'us-east-1-production'</span>,
  <span className="text-indigo-400">throughput</span>: {'{'}
    <span className="text-indigo-400">maxTps</span>: <span className="text-orange-400">12000</span>,
    <span className="text-indigo-400">retryStrategy</span>: <span className="text-green-400">'exponential'</span>
  {'}'},
  <span className="text-indigo-400">security</span>: {'{'}
    <span className="text-indigo-400">encryption</span>: <span className="text-green-400">'AES-256-GCM'</span>,
    <span className="text-indigo-400">idempotencyKey</span>: <span className="text-green-400">'x-pulse-request-id'</span>
  {'}'},
  <span className="text-indigo-400">observability</span>: {'{'}
    <span className="text-indigo-400">tracing</span>: <span className="text-purple-400">true</span>,
    <span className="text-indigo-400">metrics</span>: <span className="text-green-400">'prometheus'</span>
  {'}'}
{'}'});</code></pre>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-[80px] text-center">
        <div className="bento-card max-w-4xl mx-auto px-6 py-20 rounded-3xl bg-primary text-on-primary relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-secondary opacity-20 blur-3xl -mr-48 -mt-48"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white opacity-10 blur-3xl -ml-48 -mb-48"></div>
          
          <h2 className="font-semibold text-[32px] leading-[1.2] tracking-[-0.02em] mb-6 relative z-10">Scale without friction.</h2>
          <p className="text-[16px] leading-[1.6] text-primary-fixed mb-10 max-w-xl mx-auto relative z-10">
            Join the thousands of developers building resilient event-driven architectures with Pulse.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
            <button className="w-full sm:w-auto px-10 py-4 bg-white text-primary font-semibold text-[16px] rounded-lg hover:bg-surface-container-lowest transition-all">
              Get Started for Free
            </button>
            <button className="w-full sm:w-auto px-10 py-4 bg-primary-container/50 border border-white/20 text-white font-semibold text-[16px] rounded-lg hover:bg-primary-container transition-all">
              Schedule a Demo
            </button>
          </div>
        </div>
      </section>

      {/* Footer component directly inside page for simplicity, as per plan. (marketing landing layout) */}
      <footer className="w-full border-t pt-12 pb-8 border-gray-100 dark:border-gray-900 bg-white dark:bg-gray-950 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 mb-16">
            <div className="col-span-2">
              <span className="text-lg font-bold tracking-tighter text-gray-900 dark:text-white mb-6 block">Pulse</span>
              <p className="text-sm text-gray-500 max-w-xs">Infrastructure-as-code for event coordination. Precise, scalable, and built for developers.</p>
            </div>
            <div>
              <h5 className="text-[12px] font-semibold tracking-[0.05em] uppercase text-gray-900 dark:text-white mb-4">Resources</h5>
              <ul className="space-y-3">
                <li><a className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors" href="#">Documentation</a></li>
                <li><a className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors" href="#">API Reference</a></li>
                <li><a className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors" href="#">Components</a></li>
              </ul>
            </div>
            <div>
              <h5 className="text-[12px] font-semibold tracking-[0.05em] uppercase text-gray-900 dark:text-white mb-4">Community</h5>
              <ul className="space-y-3">
                <li><a className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors" href="#">GitHub</a></li>
                <li><a className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors" href="#">Twitter</a></li>
                <li><a className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors" href="#">Discord</a></li>
              </ul>
            </div>
            <div>
              <h5 className="text-[12px] font-semibold tracking-[0.05em] uppercase text-gray-900 dark:text-white mb-4">Legal</h5>
              <ul className="space-y-3">
                <li><a className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors" href="#">Privacy Policy</a></li>
                <li><a className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors" href="#">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-gray-100 dark:border-gray-900 gap-4">
            <p className="text-sm text-gray-500">© 2024 Pulse Inc. Built for builders.</p>
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-2 text-xs text-gray-400">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                All Systems Operational
              </span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}