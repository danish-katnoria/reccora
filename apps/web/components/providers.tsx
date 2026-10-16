'use client';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError, errorMessage, onSessionLost } from '@/lib/client-api';
import type { AuthUser, CreatorSummary, Paginated, Product } from '@/lib/types';

interface Toast { id: number; text: string; tone: 'ok' | 'error' }

interface AppState {
  user: AuthUser | null;
  ready: boolean;
  setUser: (u: AuthUser | null) => void;
  reloadUser: () => Promise<AuthUser | null>;
  logout: () => Promise<void>;
  libraryReady: boolean;
  savedIds: Set<string>;
  followingHandles: Set<string>;
  toggleSave: (productId: string) => Promise<boolean | null>;
  toggleFollow: (handle: string) => Promise<{ isFollowing: boolean; followerCount: number } | null>;
  toast: (text: string, tone?: 'ok' | 'error') => void;
}

const Ctx = createContext<AppState | null>(null);
export const useApp = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside <Providers>');
  return v;
};

async function loadAll<T>(path: string): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; page <= 20; page++) {
    const res = await api<Paginated<T>>(`${path}?limit=50&page=${page}`);
    out.push(...res.items);
    if (!res.meta.hasMore) break;
  }
  return out;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [followingHandles, setFollowingHandles] = useState<Set<string>>(new Set());
  const [libraryReady, setLibraryReady] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextToast = useRef(1);
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  const toast = useCallback((text: string, tone: 'ok' | 'error' = 'ok') => {
    const id = nextToast.current++;
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const reloadUser = useCallback(async () => {
    try {
      const r = await fetch('/api/auth/session', { cache: 'no-store' });
      if (!r.ok) throw new ApiError(r.status, 'Could not load session');
      const { user: u } = (await r.json()) as { user: AuthUser | null };
      setUser(u);
      return u;
    } catch (e) {
      if (!(e instanceof ApiError) || e.status !== 401) console.warn('Could not load session', e);
      setUser(null);
      return null;
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => { void reloadUser(); }, [reloadUser]);

  // Per-user library (saved products + followed creators), loaded once per session and kept in sync optimistically.
  useEffect(() => {
    setLibraryReady(false);
    if (!user) { setSavedIds(new Set()); setFollowingHandles(new Set()); return; }
    let cancelled = false;
    void Promise.all([loadAll<Product>('/saved/products'), loadAll<CreatorSummary>('/me/following')])
      .then(([p, f]) => {
        if (cancelled) return;
        setSavedIds(new Set(p.map((x) => x.id)));
        setFollowingHandles(new Set(f.map((x) => x.handle)));
        setLibraryReady(true);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [user]);

  // An expired session (refresh rejected) logs the user out locally and sends them to sign in again.
  useEffect(() => onSessionLost(() => {
    setUser((u) => {
      if (u) toast('Your session expired. Please sign in again.', 'error');
      return null;
    });
    if (/^\/(saved|profile|creator)/.test(pathRef.current)) router.replace(`/login?next=${encodeURIComponent(pathRef.current)}`);
  }), [router, toast]);

  const needLogin = useCallback((why: string) => {
    toast(why, 'error');
    router.push(`/login?next=${encodeURIComponent(pathRef.current)}`);
  }, [router, toast]);

  const toggleSave = useCallback(async (productId: string) => {
    if (!user) { needLogin('Sign in to save products'); return null; }
    const was = savedIds.has(productId);
    const apply = (on: boolean) => setSavedIds((s) => { const n = new Set(s); if (on) n.add(productId); else n.delete(productId); return n; });
    apply(!was);
    try {
      await api(`/saved/products/${productId}`, { method: was ? 'DELETE' : 'PUT' });
      toast(was ? 'Removed from saved' : 'Saved to your list');
      return !was;
    } catch (e) {
      apply(was);
      toast(errorMessage(e), 'error');
      return null;
    }
  }, [user, savedIds, needLogin, toast]);

  const toggleFollow = useCallback(async (handle: string) => {
    if (!user) { needLogin('Sign in to follow creators'); return null; }
    const was = followingHandles.has(handle);
    const apply = (on: boolean) => setFollowingHandles((s) => { const n = new Set(s); if (on) n.add(handle); else n.delete(handle); return n; });
    apply(!was);
    try {
      const r = await api<{ isFollowing: boolean; followerCount: number }>(`/creators/${handle}/follow`, { method: was ? 'DELETE' : 'POST' });
      toast(was ? `Unfollowed @${handle}` : `Following @${handle}`);
      return r;
    } catch (e) {
      apply(was);
      toast(errorMessage(e), 'error');
      return null;
    }
  }, [user, followingHandles, needLogin, toast]);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    setUser(null);
    router.replace('/');
    router.refresh();
  }, [router]);

  const value = useMemo<AppState>(() => ({ user, ready, setUser, reloadUser, logout, libraryReady, savedIds, followingHandles, toggleSave, toggleFollow, toast }), [user, ready, reloadUser, logout, libraryReady, savedIds, followingHandles, toggleSave, toggleFollow, toast]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`rise pointer-events-auto rounded-full px-5 py-2.5 text-sm font-medium shadow-lift ${t.tone === 'error' ? 'bg-bad text-white' : 'bg-ink text-white'}`}>{t.text}</div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
