import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  /**
   * False until zustand has read localStorage. Route guards must wait for this,
   * otherwise the first client render (which has no persisted state yet) would
   * bounce a signed-in user straight to /login.
   */
  hasHydrated: boolean;
  setAuth: (user: User | null) => void;
  logout: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      hasHydrated: false,
      setAuth: (user) => set({ user }),
      logout: () => set({ user: null }),
      setHasHydrated: (value) => set({ hasHydrated: value })
    }),
    {
      name: 'nearhelp-auth',
      partialize: (state) => ({ user: state.user }) as unknown as AuthState,
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      }
    }
  )
);
