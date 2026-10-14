'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, CalendarDays, History, Settings, Plus, Lock } from 'lucide-react';
import { logout } from '@/lib/auth';
import './Sidebar.css';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/', label: 'Journal', icon: CalendarDays },
  { href: '/history', label: 'History', icon: History },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const isAddTradePage = pathname === '/add-trade' || pathname.startsWith('/edit-trade');

  return (
    <>
      {/* Mobile Top Header */}
      <header className="mobile-header">
        <Link href="/" className="mobile-brand">
          <img 
            src="/LogoD_Horizontal Merah.png" 
            alt="Dexornit Logo" 
            className="mobile-brand-logo-img"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/logo.png';
            }}
          />
        </Link>

        <div className="flex items-center gap-8">
          {!isAddTradePage && (
            <Link href="/add-trade" className="mobile-quick-add">
              <Plus size={15} />
              <span>Add Trade</span>
            </Link>
          )}
          <button 
            type="button" 
            onClick={logout} 
            className="btn btn-ghost btn-sm mobile-lock-btn" 
            title="Lock Journal"
          >
            <Lock size={16} />
          </button>
        </div>
      </header>

      {/* Desktop / Tablet Sidebar */}
      <aside className="sidebar">
        <Link href="/" className="sidebar-logo">
          <img 
            src="/LogoD_Horizontal Merah.png" 
            alt="Dexornit Logo" 
            className="sidebar-logo-img"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/logo.png';
            }}
          />
        </Link>

        <nav className="sidebar-nav">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`sidebar-link ${isActive(href) ? 'active' : ''}`}
            >
              <Icon size={20} />
              <span className="sidebar-link-text">{label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <Link href="/add-trade" className="sidebar-cta-btn mb-8">
            <Plus size={18} />
            <span className="sidebar-link-text">New Trade</span>
          </Link>
          
          <button
            type="button"
            onClick={logout}
            className="sidebar-lock-btn"
            title="Lock Journal"
          >
            <Lock size={16} />
            <span className="sidebar-link-text">Lock Journal</span>
          </button>
        </div>
      </aside>
    </>
  );
}
