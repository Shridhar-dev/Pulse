"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'

export default function NavBar() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Nexus' },
    { href: '/command-center', label: 'Command Center' },
    { href: '/registry', label: 'Registry' },
    // { href: '/topology-engine', label: 'Topology Engine' },
    { href: '/schedule', label: 'Schedule' },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full flex justify-between items-center px-8 py-4 max-w-full bg-white border-b-[.25px] border-gray-200">
      <div className="flex items-center gap-12">
        <span className="text-xl font-bold tracking-tighter text-zinc-900 font-headline">Pulse</span>
      </div>

      <ul className="hidden md:flex items-center gap-8 font-headline tracking-tight text-sm font-medium">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <li key={link.href}>
              <Link 
                href={link.href} 
                className={`block transition-all duration-200 pb-1 hover:text-zinc-900 ${
                  isActive 
                    ? "text-zinc-900 border-b-2 border-zinc-900 opacity-100" 
                    : "text-zinc-500 opacity-80"
                }`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center gap-6">
        <Link href="/settings-config" className="text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center">
          <span className="material-symbols-outlined text-[20px]">settings</span>
        </Link>
        <div>
          <Show when="signed-out">
            <SignInButton />
            <SignUpButton>
              <button>Sign Up</button>
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
