import type { ReactNode } from 'react';
import { useAuthState, AuthContext } from './useAuth';

/**
 * Wrap your whole app in this ONCE (in main.tsx). Every component that calls
 * useAuth() below will then share this exact same state instance — so
 * updateCurrentUser() called from ANY page (Settings, Admin Settings, etc.)
 * immediately reflects everywhere else too (header, sidebar, other pages),
 * instead of each component silently keeping its own disconnected copy.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
    const authState = useAuthState();
    return <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>;
}
