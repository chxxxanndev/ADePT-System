import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User, MockUser } from '../../auth-folder/types/auth';
import { supabase } from '../../lib/supabaseClient';
import { addAdminAuditEntry } from '../../admin/services/auditLogService';

const API_BASE_URL = 'http://localhost:5000';

// ─── The actual auth logic — UNCHANGED from before, just renamed and no ───────
// ─── longer exported directly. Only the AuthProvider below calls this,   ───────
// ─── so there is exactly ONE instance of this state for the whole app.   ───────
function useAuthState() {
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        const saved = localStorage.getItem('adept_user');
        return saved ? JSON.parse(saved) : null;
    });

    const [mockDb, setMockDb] = useState<MockUser[]>(() => {
        const saved = localStorage.getItem('adept_mock_db');
        if (saved) return JSON.parse(saved);
        return [
            {
                firstName: 'Mommy',
                lastName: 'Dionisia',
                email: 'provincialassessor@gmail.com',
                username: 'admin',
                password: 'Password123!',
            },
        ];
    });

    useEffect(() => {
        localStorage.setItem('adept_mock_db', JSON.stringify(mockDb));
    }, [mockDb]);

    const [backendHealthy, setBackendHealthy] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const checkHealth = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/health`);
                if (res.ok) {
                    const data = await res.json();
                    setBackendHealthy(true);
                    console.log(`Connected to backend in ${data.mode} mode.`);
                } else {
                    setBackendHealthy(false);
                }
            } catch {
                setBackendHealthy(false);
            }
        };
        checkHealth();
    }, []);

    // Keep localStorage tokens in sync with Supabase's session (auto-refresh
    // updates the internal tokens, but we need to persist the new ones so
    // page reloads work with a fresh token instead of a stale/expired one).
    useEffect(() => {
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                localStorage.setItem('adept_token', session.access_token);
                localStorage.setItem('adept_refresh_token', session.refresh_token);
            } else {
                localStorage.removeItem('adept_token');
                localStorage.removeItem('adept_refresh_token');
            }
        });

        // Restore the browser's Supabase session on page load/refresh — the React
        // state above is rehydrated from localStorage automatically, but the
        // supabase-js client's own session is not, and Realtime subscriptions
        // (the notification bell) need that session to pass RLS checks.
        const token = localStorage.getItem('adept_token');
        const refreshToken = localStorage.getItem('adept_refresh_token');
        if (token && refreshToken) {
            supabase.auth.setSession({ access_token: token, refresh_token: refreshToken });
        }

        return () => subscription.unsubscribe();
    }, []);

    const login = async (
        username: string,
        password: string
    ): Promise<{ success: boolean; message: string; reactivatable?: boolean; daysRemaining?: number }> => {
        setLoading(true);
        try {
            if (backendHealthy) {
                const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password }),
                });
                const data = await res.json();

                if (data.reactivatable) {
                    return {
                        success: false,
                        reactivatable: true,
                        daysRemaining: data.daysRemaining,
                        message: data.message,
                    };
                }

                if (res.ok) {
                    localStorage.setItem('adept_token', data.token);
                    localStorage.setItem('adept_refresh_token', data.refreshToken);
                    localStorage.setItem('adept_user', JSON.stringify(data.user));
                    setCurrentUser(data.user);
                    await supabase.auth.setSession({
                        access_token: data.token,
                        refresh_token: data.refreshToken,
                    });
                    addAdminAuditEntry({ type: 'login', description: 'logged in' }).catch(() => {});
                    return { success: true, message: 'Successfully signed in.' };
                }
                return { success: false, message: data.error || 'Invalid credentials.' };
            } else {
                return await new Promise((resolve) => {
                    setTimeout(() => {
                        const userIndex = mockDb.findIndex(
                            (u) =>
                                (u.username === username || u.email === username) &&
                                u.password === password
                        );
                        if (userIndex !== -1) {
                            const user = mockDb[userIndex];
                            const userObj: User = {
                                id: 'mock-id',
                                staffId: 'mock-staff-id',
                                firstName: user.firstName,
                                lastName: user.lastName,
                                email: user.email,
                                username: user.username,
                                role: userIndex === 0 ? 'SUPER_ADMIN' : 'OFFICE_STAFF',
                            };
                            localStorage.setItem('adept_user', JSON.stringify(userObj));
                            setCurrentUser(userObj);
                            resolve({ success: true, message: 'Successfully signed in (Standalone Demo Mode).' });
                        } else {
                            resolve({ success: false, message: 'Invalid username/email or password.' });
                        }
                    }, 600);
                });
            }
        } catch {
            return { success: false, message: 'Network error. Failed to reach auth server.' };
        } finally {
            setLoading(false);
        }
    };

    const updateCurrentUser = (patch: Partial<User>) => {
        setCurrentUser((prev) => {
            if (!prev) return prev;
            const updated = { ...prev, ...patch };
            localStorage.setItem('adept_user', JSON.stringify(updated));
            return updated;
        });
    };

    const reactivateAccount = async (
        username: string,
        password: string
    ): Promise<{ success: boolean; message: string }> => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/reactivate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await res.json();

            if (res.ok) {
                localStorage.setItem('adept_token', data.token);
                localStorage.setItem('adept_refresh_token', data.refreshToken);
                localStorage.setItem('adept_user', JSON.stringify(data.user));
                setCurrentUser(data.user);
                await supabase.auth.setSession({
                    access_token: data.token,
                    refresh_token: data.refreshToken,
                });
                return { success: true, message: data.message || 'Account reactivated.' };
            }
            return { success: false, message: data.error || 'Failed to reactivate account.' };
        } catch {
            return { success: false, message: 'Network error. Failed to reach auth server.' };
        } finally {
            setLoading(false);
        }
    };

    const signUp = async (form: {
        firstName: string;
        lastName: string;
        email: string;
        username: string;
        password: string;
    }): Promise<{ success: boolean; message: string }> => {
        setLoading(true);
        try {
            if (backendHealthy) {
                const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(form),
                });
                const data = await res.json();
                if (res.ok) {
                    return { success: true, message: 'Registration successful! You can now sign in.' };
                }
                return { success: false, message: data.error || 'Registration failed.' };
            } else {
                return await new Promise((resolve) => {
                    setTimeout(() => {
                        const exists = mockDb.some(
                            (u) => u.username === form.username || u.email === form.email
                        );
                        if (exists) {
                            resolve({ success: false, message: 'Username or Email already registered.' });
                            return;
                        }
                        setMockDb((prev) => [...prev, form]);
                        resolve({ success: true, message: 'Registration successful! You can now sign in.' });
                    }, 800);
                });
            }
        } catch {
            return { success: false, message: 'Network error. Failed to reach registration server.' };
        } finally {
            setLoading(false);
        }
    };

    const forgotPassword = async (email: string): Promise<{ success: boolean; message: string }> => {
        setLoading(true);
        try {
            if (backendHealthy) {
                const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email }),
                });
                const data = await res.json();
                return { success: data.success, message: data.message };
            } else {
                return await new Promise((resolve) => {
                    setTimeout(() => {
                        resolve({
                            success: true,
                            message: 'Password reset instructions have been sent (Standalone Demo Mode).',
                        });
                    }, 800);
                });
            }
        } catch {
            return { success: false, message: 'Network error. Failed to reach auth server.' };
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        // Fire-and-forget, and BEFORE signOut() — once the session is cleared
        // the bearer token this needs is gone. A failed write here should
        // never block the user from actually logging out.
        addAdminAuditEntry({ type: 'logout', description: 'logged out' }).catch(() => {});
    
        localStorage.removeItem('adept_user');
        localStorage.removeItem('adept_token');
        localStorage.removeItem('adept_refresh_token');
        supabase.auth.signOut();
        setCurrentUser(null);
    };

    return {
        currentUser,
        updateCurrentUser,
        backendHealthy,
        loading,
        login,
        reactivateAccount,
        signUp,
        forgotPassword,
        logout,
    };
}

// ─── Context wiring ────────────────────────────────────────────────────────────
type AuthContextValue = ReturnType<typeof useAuthState>;

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Wrap your whole app in this ONCE (in App.tsx). Every component that calls
 * useAuth() below will then share this exact same state instance — so
 * updateCurrentUser() called from ANY page (Settings, Admin Settings, etc.)
 * immediately reflects everywhere else too (header, sidebar, other pages),
 * instead of each component silently keeping its own disconnected copy.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
    const authState = useAuthState();
    return <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>;
}

/**
 * Same name, same import path as before — every existing
 * `import { supabase } from '../../lib/supabaseClient';
import { addAdminAuditEntry } from '../../admin/services/auditLogService';` across your codebase
 * keeps working with ZERO changes. It now pulls from the shared context
 * instead of creating an isolated state instance.
 */
export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth must be used within an <AuthProvider>. Wrap your app root (App.tsx) in <AuthProvider>.');
    }
    return ctx;
}