'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, CalendarDays, History, Settings } from 'lucide-react';
import './BottomNav.css';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/', label: 'Journal', icon: CalendarDays },
  { href: '/history', label: 'History', icon: History },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (href) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <nav className="bottom-nav show-mobile-only">
      <div className="bottom-nav-inner">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`bottom-nav-item ${active ? 'active' : ''}`}
            >
              <div className="bottom-nav-icon-wrap">
                <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
                {active && <span className="bottom-nav-active-dot" />}
              </div>
              <span className="bottom-nav-label">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
