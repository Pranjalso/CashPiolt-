'use client';
import { apiCall } from '@/lib/client';

export default function SessionBox({
  businesses,
  current,
  name,
  role,
}: {
  businesses: any[];
  current: number;
  name: string;
  role: string;
}) {
  return (
    <div className="session-box">
      {/* Organization Switcher Dropdown */}
      <div className="session-select-wrap">
        <svg
          className="session-org-icon"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 17V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v12" />
          <path d="M7 7h1M12 7h1M7 11h1M12 11h1M9 17v-4h2v4" />
        </svg>
        <select
          value={current}
          onChange={async (e) => {
            await apiCall('/api/auth/switch', 'POST', { org_id: Number(e.target.value) });
            location.href = '/';
          }}
          aria-label="Select organization"
        >
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {/* User Information Row */}
      <div className="user-profile-badge">
        <div className="user-avatar-pill">
          {name ? name.charAt(0).toUpperCase() : 'U'}
        </div>
        <div className="user-details">
          <div className="user-name" title={name}>
            {name}
          </div>
          <div className="user-role-tag">{role}</div>
        </div>
      </div>

      {/* Full-width Spaced Sign Out Button */}
      <button
        type="button"
        className="sign-out-btn"
        title="Sign out of your session"
        onClick={async () => {
          await apiCall('/api/auth/logout', 'POST');
          location.href = '/login';
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        <span>Sign out</span>
      </button>
    </div>
  );
}
