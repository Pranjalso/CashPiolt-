import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, setToken, setUnauthorizedHandler, tokenStore } from './api';

export type Role = 'OWNER' | 'ACCOUNTANT' | 'EMPLOYEE' | 'VIEWER';
type Me = { user: { id: number; name: string; email: string }; role: Role; business: any; businesses: any[] };
type Ctx = { me: Me | null; loading: boolean; login: (e: string, p: string) => Promise<void>; logout: () => Promise<void>;
  switchBusiness: (id: number) => Promise<void>; refresh: () => Promise<void> };

const AuthCtx = createContext<Ctx>(null as any);
export const useAuth = () => useContext(AuthCtx);
export const canWrite = (r?: Role) => r === 'OWNER' || r === 'ACCOUNTANT';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => { setMe(await api<Me>('/api/auth/me')); }, []);
  const logout = useCallback(async () => { await tokenStore.clear(); setToken(null); setMe(null); }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => { logout(); });
    (async () => {
      const t = await tokenStore.get();
      if (t) { setToken(t); try { await refresh(); } catch { await logout(); } }
      setLoading(false);
    })();
  }, [refresh, logout]);

  const login = async (email: string, password: string) => {
    const r = await api<{ token: string }>('/api/auth/login', 'POST', { email, password });
    setToken(r.token); await tokenStore.set(r.token); await refresh();
  };
  const switchBusiness = async (org_id: number) => {
    const r = await api<{ token: string }>('/api/auth/switch', 'POST', { org_id });
    setToken(r.token); await tokenStore.set(r.token); await refresh();
  };
  return <AuthCtx.Provider value={{ me, loading, login, logout, switchBusiness, refresh }}>{children}</AuthCtx.Provider>;
}
