'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { checkIsAuthenticated, touchSessionActivity, logout } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';

export default function AuthGuard({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const lastTouchRef = useRef(Date.now());

  // Initial auth verification on navigation
  useEffect(() => {
    const isAuth = checkIsAuthenticated();
    setIsAuthenticated(isAuth);
    setChecking(false);

    if (!isAuth && pathname !== '/login') {
      router.replace('/login');
    }
  }, [pathname, router]);

  // Periodic inactivity check (checks every 15 seconds)
  useEffect(() => {
    if (pathname === '/login') return;

    const interval = setInterval(() => {
      const isStillValid = checkIsAuthenticated();
      if (!isStillValid) {
        logout('expired');
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [pathname]);

  // User activity tracker (throttled to once every 20 seconds)
  useEffect(() => {
    if (pathname === '/login') return;

    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastTouchRef.current > 20000) {
        lastTouchRef.current = now;
        touchSessionActivity();
      }
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(ev => window.addEventListener(ev, handleUserActivity, { passive: true }));

    // Record initial touch
    touchSessionActivity();

    return () => {
      events.forEach(ev => window.removeEventListener(ev, handleUserActivity, { passive: true }));
    };
  }, [pathname]);

  // If on login page, just render children without sidebar/nav
  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (checking || !isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)'
      }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
