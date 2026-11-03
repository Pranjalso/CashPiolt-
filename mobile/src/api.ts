import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const KEY = 'cashpilot_token';

// Token kept in the device keychain / keystore (localStorage on web preview)
export const tokenStore = {
  get: async () => (Platform.OS === 'web' ? globalThis.localStorage?.getItem(KEY) ?? null : SecureStore.getItemAsync(KEY)),
  set: async (t: string) => (Platform.OS === 'web' ? globalThis.localStorage?.setItem(KEY, t) : SecureStore.setItemAsync(KEY, t)),
  clear: async () => (Platform.OS === 'web' ? globalThis.localStorage?.removeItem(KEY) : SecureStore.deleteItemAsync(KEY)),
};

let token: string | null = null;
let onUnauthorized: () => void = () => {};
export const setToken = (t: string | null) => { token = t; };
export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn; };

export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }

/** Same REST API as the web app, authenticated with "Authorization: Bearer <token>" */
export async function api<T = any>(path: string, method = 'GET', body?: unknown): Promise<T> {
  let r: Response;
  try {
    r = await fetch(API_URL + path, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, `Cannot reach server at ${API_URL}. Check internet / server address.`);
  }
  const data = await r.json().catch(() => ({}));
  if (r.status === 401 && token) onUnauthorized();
  if (!r.ok) throw new ApiError(r.status, data.error ?? `Request failed (${r.status})`);
  return data as T;
}
