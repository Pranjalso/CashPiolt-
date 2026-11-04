'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SessionBox from './SessionBox';

type NavSection = [string, [string, string][]];

// Render contextual SVG icon based on route href
function NavIcon({ href }: { href: string }) {
  const base = href.split('?')[0];
  const strokeProps = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.9',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  if (base === '/') {
    // Dashboard / Overview
    return (
      <svg viewBox="0 0 24 24" width="17" height="17" {...strokeProps}>
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    );
  }

  if (base === '/reports') {
    // Reports & Forecast
    return (
      <svg viewBox="0 0 24 24" width="17" height="17" {...strokeProps}>
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
        <path d="M4 20h16" />
      </svg>
    );
  }

  if (base === '/transactions') {
    // Cash book transactions
    return (
      <svg viewBox="0 0 24 24" width="17" height="17" {...strokeProps}>
        <path d="M7 16V4m0 0L3 8m4-4l4 4" />
        <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    );
  }

  if (base === '/accounts') {
    // Accounts & Balances
    return (
      <svg viewBox="0 0 24 24" width="17" height="17" {...strokeProps}>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    );
  }

  if (base === '/recurring') {
    // Recurring
    return (
      <svg viewBox="0 0 24 24" width="17" height="17" {...strokeProps}>
        <path d="M21.5 2v6h-6" />
        <path d="M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-1.19" />
      </svg>
    );
  }

  if (href.includes('RECEIVABLE')) {
    // Receivables (Money coming in)
    return (
      <svg viewBox="0 0 24 24" width="17" height="17" {...strokeProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v8m-4-4l4 4 4-4" />
      </svg>
    );
  }

  if (href.includes('PAYABLE')) {
    // Payables (Money to pay)
    return (
      <svg viewBox="0 0 24 24" width="17" height="17" {...strokeProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 16V8m-4 4l4-4 4 4" />
      </svg>
    );
  }

  if (base === '/claims' || base === '/claims/new') {
    // Claims
    return (
      <svg viewBox="0 0 24 24" width="17" height="17" {...strokeProps}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    );
  }

  if (base === '/budgets') {
    // Budgets
    return (
      <svg viewBox="0 0 24 24" width="17" height="17" {...strokeProps}>
        <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
        <path d="M22 12A10 10 0 0 0 12 2v10z" />
      </svg>
    );
  }

  if (base === '/parties') {
    // Customers & Vendors
    return (
      <svg viewBox="0 0 24 24" width="17" height="17" {...strokeProps}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }

  if (base === '/categories') {
    // Categories
    return (
      <svg viewBox="0 0 24 24" width="17" height="17" {...strokeProps}>
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
    );
  }

  if (base === '/settings') {
    // Settings
    return (
      <svg viewBox="0 0 24 24" width="17" height="17" {...strokeProps}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    );
  }

  // Fallback
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" {...strokeProps}>
      <circle cx="12" cy="12" r="8" />
    </svg>
  );
}

export default function Shell({
  businesses,
  currentOrgId,
  userName,
  userRole,
  nav,
  children,
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
          <div className="brand-icon">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          <div className="brand-text">Cash<span>Pilot</span></div>
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
        <div className="brand">
          <div className="brand-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          <div className="brand-text">Cash<span>Pilot</span></div>
        </div>

        <SessionBox
          businesses={businesses}
          current={currentOrgId}
          name={userName}
          role={userRole}
        />

        <div className="nav-sections">
          {nav.map(([h, links]) => (
            <div key={h} className="nav-group">
              <h6>{h}</h6>
              {links.map(([href, t]) => {
                const isActive =
                  pathname === href ||
                  (href !== '/' && pathname.startsWith(href.split('?')[0]));
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`nav-link ${isActive ? 'active-nav' : ''}`}
                  >
                    <span className="nav-icon-wrap">
                      <NavIcon href={href} />
                    </span>
                    <span className="nav-text">{t}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main">{children}</main>
    </div>
  );
}
