"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClerkProvider, Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'

export default function NavBar() {
  const pathname = usePathname();
  const isMarketing = pathname === '/';

  const links = isMarketing ? [
    { href: '#', label: 'Products' },
    { href: '#', label: 'Solutions' },
    { href: '#', label: 'Developers' },
    { href: '#', label: 'Pricing' },
  ] : [
    { href: '/', label: 'Nexus' },
    { href: '/command-center', label: 'Command Center' },
    { href: '/registry', label: 'Registry' },
    { href: '/topology-engine', label: 'Topology Engine' },
  ];

  return (
    <nav className="fixed top-0 w-full border-b z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-gray-100 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        
        <div className="flex items-center gap-8">
          <span className="text-xl font-bold tracking-tighter text-gray-900 dark:text-white">Pulse</span>
          
          {!isMarketing && (
            <div className="relative hidden w-64 lg:block">
              <input 
                className="w-full bg-transparent border-0 border-b border-outline-variant/20 focus:border-primary focus:ring-0 pl-7 py-1 text-sm font-body text-on-surface placeholder:text-outline-variant transition-colors" 
                placeholder="Search infrastructure..." 
                type="text"
              />
            </div>
          )}

          <ul className="hidden md:flex items-center gap-6">
            {links.map((link) => {
              const isActive = pathname === link.href && !isMarketing;
              return (
                <li key={link.label}>
                  <Link 
                    href={link.href} 
                    className={`font-body text-[14px] transition-all duration-200 ${
                      isActive 
                        ? "" 
                        : isMarketing 
                          ? "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                          : "text-zinc-500 opacity-80 hover:text-zinc-900"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex items-center gap-4">
          {!isMarketing && (
            <>
              <button className="text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center relative">
                <span className="material-symbols-outlined text-[20px]">notifications</span>
              </button>
              <Link href="/settings-config" className="text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">settings</span>
              </Link>
            </>
          )}

          <Show when="signed-out">
            <SignInButton>
              <button className="font-body text-[14px] text-gray-600 hover:text-gray-900 px-4 py-2">
                Sign In
              </button>
            </SignInButton>
            <SignUpButton>
              <button className="font-body text-[14px] bg-primary text-on-primary px-5 py-2.5 rounded-lg font-medium hover:opacity-90 active:scale-[0.98] transition-all">
                Get Started
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </div>
    </nav>
  );
}
