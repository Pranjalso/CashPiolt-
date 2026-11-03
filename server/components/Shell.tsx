'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SessionBox from './SessionBox';

type NavSection = [string, [string, string][]];

export default function Shell({
  businesses,
  currentOrgId,
  userName,
  userRole,
  nav,
  children
}: {
  businesses: any[];
  currentOrgId: number;
  userName: string;
  userRole: string;
  nav: NavSection[];
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile sidebar on route transition
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <div className="app">
      {/* Mobile Top Header */}
      <header className="mobile-header no-print">
        <button
          type="button"
          className="mobile-hamburger"
          aria-label="Toggle navigation menu"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
        <div className="brand" style={{ padding: '0 8px' }}>
          Cash<span>Pilot</span>
        </div>
        <div style={{ width: 36 }} />
      </header>

      {/* Backdrop overlay for mobile menu */}
      {mobileMenuOpen && (
        <div
          className="mobile-backdrop no-print"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar (Desktop Sticky + Mobile Drawer) */}
      <aside className={`side ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="brand">Cash<span>Pilot</span></div>
        <SessionBox businesses={businesses} current={currentOrgId} name={userName} role={userRole} />
        {nav.map(([h, links]) => (
          <div key={h}>
            <h6>{h}</h6>
            {links.map(([href, t]) => (
              <Link
                key={href}
                href={href}
                className={pathname === href || (href !== '/' && pathname.startsWith(href.split('?')[0])) ? 'active-nav' : ''}
              >
                {t}
              </Link>
            ))}
          </div>
        ))}
      </aside>

      {/* Main Content Area */}
      <main className="main">{children}</main>
    </div>
  );
}

