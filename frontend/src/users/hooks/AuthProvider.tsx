import type { ReactNode } from 'react';
import { useAuthState, AuthContext } from './useAuth';

export function AuthProvider({ children }: { children: ReactNode }) {
    const authState = useAuthState();
    return <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>;
}
