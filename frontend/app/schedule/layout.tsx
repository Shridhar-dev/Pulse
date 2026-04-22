'use client'

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function ScheduleLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const tabs = [
    { href: '/schedule', label: 'HTTP / Webhook', icon: 'http' },
    { href: '/schedule/bulk', label: 'Bulk Builder', icon: 'layers' },
    { href: '/schedule/github', label: 'Docker / GitHub', icon: 'terminal' },
    // { href: '/schedule/code', label: 'Code Runner', icon: 'code_blocks' },
  ];

  return (
    <div className="flex flex-col flex-1 h-[calc(100vh-65px)] bg-surface-container-lowest">
      {/* Sub-navigation Tab Bar */}
      <div className="w-full border-b border-outline-variant/10 bg-surface-container-low/50 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-12 flex justify-between items-center">
          <div className="flex gap-8">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex items-center gap-2 py-4 px-2 border-b-2 transition-all font-body text-sm font-medium ${
                    isActive 
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant/30'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {tab.icon}
                  </span>
                  {tab.label}
                </Link>
              );
            })}
          </div>
          <div className="text-[10px] uppercase font-mono tracking-widest text-outline-variant">
            Job Scheduling Matrix
          </div>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
