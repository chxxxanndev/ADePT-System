import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { User, MockUser } from '../../auth-folder/types/auth';
import { supabase } from '../../lib/supabaseClient';
import { addAdminAuditEntry } from '../../admin/services/auditLogService';
import { API_ROOT } from '../../config';

const BASE_URL = API_ROOT;

let sessionInitPromise: Promise<void> | null = null;

function initSessionOnce(): Promise<void> {
    if (!sessionInitPromise) {
        sessionInitPromise = (async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                const token = sessionStorage.getItem('adept_token');
                const refreshToken = sessionStorage.getItem('adept_refresh_token');
                if (token && refreshToken) {
                    try {
                        await supabase.auth.setSession({ access_token: token, refresh_token: refreshToken });
                    } catch {
                        sessionStorage.removeItem('adept_token');
                        sessionStorage.removeItem('adept_refresh_token');
                        sessionStorage.removeItem('adept_user');
                    }
                }
            }
        })();
    }
    return sessionInitPromise;
}

function useAuthState() {
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        const saved = sessionStorage.getItem('adept_user');
        return saved ? JSON.parse(saved) : null;
    });

    const [sessionReady, setSessionReady] = useState(false);
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
                const res = await fetch(`${BASE_URL}/api/health`);
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

    useEffect(() => {
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                sessionStorage.setItem('adept_token', session.access_token);
                sessionStorage.setItem('adept_refresh_token', session.refresh_token);
            } else {
                sessionStorage.removeItem('adept_token');
                sessionStorage.removeItem('adept_refresh_token');
            }
        });

        initSessionOnce().then(() => {
            setSessionReady(true);
        });

        return () => subscription.unsubscribe();
    }, []);

    const currentUserRef = useRef(currentUser);
    useEffect(() => {
        currentUserRef.current = currentUser;
    }, [currentUser]);

    const [roleNotice, setRoleNotice] = useState<{
        title: string;
        message: string;
        variant: 'promoted' | 'demoted' | 'level' | 'role';
    } | null>(null);

    const dismissRoleNotice = () => setRoleNotice(null);

    const applyFreshProfile = useCallback(async ({ notify = false }: { notify?: boolean } = {}) => {
        const prev = currentUserRef.current;
        if (!prev?.staffId) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) return;
            const res = await fetch(`${BASE_URL}/api/account/profile`, {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (!res.ok) return;
            const { data: profile } = await res.json();
            if (!profile?.role) return;

            const nextUser: User = {
                ...prev,
                firstName: profile.firstName ?? prev.firstName,
                middleInitial: profile.middleInitial ?? prev.middleInitial,
                lastName: profile.lastName ?? prev.lastName,
                email: profile.email ?? prev.email,
                username: profile.username ?? prev.username,
                role: profile.role,
                roleName: profile.roleName,
                adminLevel: profile.adminLevel ?? null,
                avatarUrl: profile.avatarUrl ?? prev.avatarUrl,
                position: profile.position ?? prev.position,
                suffix: profile.suffix ?? prev.suffix,
            };

            const roleChanged = nextUser.role !== prev.role;
            const levelChanged = nextUser.role === 'ADMIN' && nextUser.adminLevel !== prev.adminLevel;
            if (!roleChanged && !levelChanged) return;

            const levelLabel = nextUser.adminLevel === 'HIGH'
                ? 'High'
                : nextUser.adminLevel === 'MEDIUM'
                    ? 'Medium'
                    : 'Low';

            if (notify) {
                if (nextUser.role === 'ADMIN' && roleChanged) {
                    setRoleNotice({
                        variant: 'promoted',
                        title: 'You have been promoted to Admin',
                        message: `Your account now has ${levelLabel} admin access. Sign in again to continue as an admin.`,
                    });
                } else if (nextUser.role === 'OFFICE_STAFF' && roleChanged) {
                    setRoleNotice({
                        variant: 'demoted',
                        title: 'Admin access removed',
                        message: 'Your account has been demoted to Office Staff. Sign in again to continue on the staff dashboard.',
                    });
                } else if (roleChanged) {
                    setRoleNotice({
                        variant: 'role',
                        title: 'Role updated',
                        message: `Your account role is now ${profile.roleName || nextUser.role}. Sign in again to continue.`,
                    });
                } else {
                    setRoleNotice({
                        variant: 'level',
                        title: 'Admin access level updated',
                        message: `Your admin access level is now ${levelLabel}. Sign in again to continue.`,
                    });
                }
            }

            sessionStorage.setItem('adept_user', JSON.stringify(nextUser));
            currentUserRef.current = nextUser;
            setCurrentUser(nextUser);
        } catch {
            // Profile refresh failed — keep the current session as-is.
        }
    }, []);

    useEffect(() => {
        const channel = supabase
            .channel('staff-role-updates')
            .on('broadcast', { event: 'role-updated' }, (payload: { payload?: { staffId?: string } }) => {
                if (payload?.payload?.staffId !== currentUserRef.current?.staffId) return;
                void applyFreshProfile({ notify: true });
            })
            .subscribe();

        return () => {
            void supabase.removeChannel(channel);
        };
    }, [applyFreshProfile]);

    useEffect(() => {
        const onFocus = () => void applyFreshProfile({ notify: true });
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, [applyFreshProfile]);

    const login = async (
        username: string,
        password: string
    ): Promise<{ success: boolean; message: string; reactivatable?: boolean; daysRemaining?: number }> => {
        setLoading(true);
        try {
            if (backendHealthy) {
                const res = await fetch(`${BASE_URL}/api/auth/login`, {
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
                    await supabase.auth.setSession({
                        access_token: data.token,
                        refresh_token: data.refreshToken,
                    });

                    sessionStorage.setItem('adept_token', data.token);
                    sessionStorage.setItem('adept_refresh_token', data.refreshToken);
                    sessionStorage.setItem('adept_user', JSON.stringify(data.user));

                    setCurrentUser(data.user); 
                    setSessionReady(true);
                    setRoleNotice(null); 

                    addAdminAuditEntry({ type: 'login', description: 'logged in' }).catch(() => { });
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
                                middleInitial: user.middleInitial,
                                lastName: user.lastName,
                                email: user.email,
                                username: user.username,
                                role: userIndex === 0 ? 'SUPER_ADMIN' : 'OFFICE_STAFF',
                                suffix: user.suffix,
                            };
                            sessionStorage.setItem('adept_user', JSON.stringify(userObj));
                            setCurrentUser(userObj);
                            setSessionReady(true);
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
            sessionStorage.setItem('adept_user', JSON.stringify(updated));
            return updated;
        });
    };

    const reactivateAccount = async (
        username: string,
        password: string
    ): Promise<{ success: boolean; message: string }> => {
        setLoading(true);
        try {
            const res = await fetch(`${BASE_URL}/api/auth/reactivate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await res.json();

            if (res.ok) {
                await supabase.auth.setSession({
                    access_token: data.token,
                    refresh_token: data.refreshToken,
                });
                sessionStorage.setItem('adept_token', data.token);
                sessionStorage.setItem('adept_refresh_token', data.refreshToken);
                sessionStorage.setItem('adept_user', JSON.stringify(data.user));
                setCurrentUser(data.user);
                setSessionReady(true);
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
        middleInitial?: string;
        lastName: string;
        email: string;
        username: string;
        password: string;
        suffix?: string;
    }): Promise<{ success: boolean; message: string }> => {
        setLoading(true);
        try {
            if (backendHealthy) {
                const res = await fetch(`${BASE_URL}/api/auth/register`, {
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
                const res = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
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

    const logout = async () => {
        try {
            await Promise.race([
                addAdminAuditEntry({ type: 'logout', description: 'logged out' }),
                new Promise((resolve) => setTimeout(resolve, 2500)),
            ]);
        } catch {
            // backend unreachable — proceed with local sign-out anyway
        }

        sessionStorage.removeItem('adept_user');
        sessionStorage.removeItem('adept_token');
        sessionStorage.removeItem('adept_refresh_token');
        setRoleNotice(null); // the notice belongs to the previous session only
        await supabase.auth.signOut();
        setCurrentUser(null);
    };

    return {
        currentUser,
        sessionReady,
        updateCurrentUser,
        backendHealthy,
        loading,
        login,
        reactivateAccount,
        signUp,
        forgotPassword,
        logout,
        roleNotice,
        dismissRoleNotice,
    };
}

type AuthContextValue = ReturnType<typeof useAuthState>;

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth must be used within an <AuthProvider>. Wrap your app root (App.tsx) in <AuthProvider>.');
    }
    return ctx;
}

export { useAuthState, AuthContext };
