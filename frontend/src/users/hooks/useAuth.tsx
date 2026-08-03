import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { User, MockUser } from '../../auth-folder/types/auth';
import { supabase } from '../../lib/supabaseClient';
import { addAdminAuditEntry } from '../../admin/services/auditLogService';
import { API_ROOT } from '../../config';

const BASE_URL = API_ROOT;

// Module-level singleton — ensures the session restore below runs at most
// ONCE per page load, no matter how many times this effect fires (e.g.
// React StrictMode's intentional double-invoke in dev). Two concurrent
// setSession() calls on the same client can race and leave getSession()
// returning nothing right after — this is what caused the notification/
// metadata 401s that only "fixed themselves" after a manual retry.
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
                        // Token is stale (e.g. after an outage or expiry) — clear it so
                        // the app drops to the login screen instead of firing 401s.
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

    // NOTE: mockDb intentionally stays on localStorage — it's just the
    // offline-demo-mode fallback account list, not a live session, so
    // there's no security reason to wipe it when the tab closes.
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

    // Keep sessionStorage tokens in sync with Supabase's session, AND restore
    // the client's session on load via the module-level singleton above.
    // sessionReady only flips true once that restore attempt has actually
    // resolved (successfully or by clearing a stale token) — this is the
    // ONLY place that drives sessionReady on initial load. Do not add a
    // second setSession() call anywhere else in a mount-time effect.
    //
    // SECURITY: session data lives in sessionStorage (not localStorage) so
    // closing the tab/browser clears it — staff are forced back to the
    // login screen next time the app is opened, instead of staying signed
    // in indefinitely. Supabase's own client storage is likewise set to
    // sessionStorage in supabaseClient.ts; both must stay in sync.
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

    // Realtime role/admin-level sync: when an admin promotes/demotes this
    // account (or changes its admin level), the backend broadcasts on the
    // shared "staff-role-updates" channel. On a hit we re-fetch the profile
    // so the role change takes effect in THIS open session instantly —
    // App.tsx routes on currentUser.role, so a promoted staff member lands
    // on the admin pages without logging out first. The staff id is kept in
    // a ref so the subscription can stay mounted for the whole session
    // without re-reading (potentially stale) state in its closure.
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

    // Re-fetches the account profile and applies it to the session when the
    // role or admin level actually changed (compared to what the session
    // currently believes). Used by the realtime broadcast AND as a focus
    // fallback so a missed broadcast still self-corrects. When `notify` is
    // true and a change is detected, a popup tells the staff member what
    // happened — e.g. "You have been promoted to Admin (High access)".
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

    // 1) Realtime trigger: the promoting admin's backend broadcasts on this
    //    channel right after the role change is committed.
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

    // 2) Focus fallback: if the realtime broadcast was missed (tab hidden,
    //    connection hiccup), coming back to the tab re-checks the profile.
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
                    // Establish the Supabase session FIRST — Dashboard (and its
                    // notification/metadata fetches) must not mount until the
                    // client actually has the token to attach to requests.
                    await supabase.auth.setSession({
                        access_token: data.token,
                        refresh_token: data.refreshToken,
                    });

                    sessionStorage.setItem('adept_token', data.token);
                    sessionStorage.setItem('adept_refresh_token', data.refreshToken);
                    sessionStorage.setItem('adept_user', JSON.stringify(data.user));

                    setCurrentUser(data.user); // only now does Dashboard get permission to mount
                    setSessionReady(true);
                    setRoleNotice(null); // stale notice must not resurface after a fresh sign-in

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
        // Await the audit entry BEFORE signing out: signOut() clears the
        // Supabase session synchronously, so a fire-and-forget POST racing
        // it could go out token-less and land a 401 from the backend.
        // Bounded with a timeout so a slow/unreachable backend can never
        // stall the logout.
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
