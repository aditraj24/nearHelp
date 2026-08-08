'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import PageLoader from './PageLoader';

interface AuthGuardProps {
  children: ReactNode;
  /** Admin-only pages redirect non-admins back to the dashboard. */
  requireAdmin?: boolean;
}

/**
 * Client-side route protection. Replaces the `<Route element={user ? … : <Navigate/>}>`
 * checks that lived in the old React Router `App.jsx`.
 */
export function AuthGuard({ children, requireAdmin = false }: AuthGuardProps) {
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const router = useRouter();

  const allowed = Boolean(user) && (!requireAdmin || user?.role === 'admin');

  useEffect(() => {
    if (!hasHydrated) return;
    if (!user) {
      router.replace('/login');
    } else if (requireAdmin && user.role !== 'admin') {
      router.replace('/dashboard');
    }
  }, [hasHydrated, user, requireAdmin, router]);

  if (!hasHydrated) return <PageLoader text="Restoring your session..." />;
  if (!allowed) return <PageLoader text="Redirecting..." />;

  return <>{children}</>;
}

/**
 * Inverse of AuthGuard — keeps signed-in users off /login and /register.
 */
export function GuestGuard({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const router = useRouter();

  useEffect(() => {
    if (hasHydrated && user) {
      router.replace('/dashboard');
    }
  }, [hasHydrated, user, router]);

  if (!hasHydrated) return <PageLoader text="Restoring your session..." />;
  if (user) return <PageLoader text="Redirecting to your dashboard..." />;

  return <>{children}</>;
}
