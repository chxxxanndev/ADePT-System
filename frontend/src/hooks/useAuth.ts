import { useState, useEffect } from 'react';
import type { User, MockUser } from '../types/auth';

const API_BASE_URL = 'http://localhost:5000';

export function useAuth() {
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        const saved = localStorage.getItem('adept_user');
        return saved ? JSON.parse(saved) : null;
    });

    const [mockDb, setMockDb] = useState<MockUser[]>(() => {
        const saved = localStorage.getItem('adept_mock_db');
        if (saved) return JSON.parse(saved);
        return [
            {
                firstName: 'Juan',
                lastName: 'Dela Cruz',
                email: 'JuanDelaCruz@gmail.com',
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

    const login = async (
        username: string,
        password: string
    ): Promise<{ success: boolean; message: string }> => {
        setLoading(true);
        try {
            if (backendHealthy) {
                const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password }),
                });
                const data = await res.json();
                if (res.ok) {
                    localStorage.setItem('adept_token', data.token);
                    localStorage.setItem('adept_user', JSON.stringify(data.user));
                    setCurrentUser(data.user);
                    return { success: true, message: 'Successfully signed in.' };
                }
                return { success: false, message: data.error || 'Invalid credentials.' };
            } else {
                return await new Promise((resolve) => {
                    setTimeout(() => {
                        const user = mockDb.find(
                            (u) =>
                                (u.username === username || u.email === username) &&
                                u.password === password
                        );
                        if (user) {
                            const userObj: User = {
                                id: 'mock-id',
                                firstName: user.firstName,
                                lastName: user.lastName,
                                email: user.email,
                                username: user.username,
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

    const forgotPassword = async (_email: string): Promise<{ success: boolean; message: string }> => {
        setLoading(true);
        return new Promise((resolve) => {
            setTimeout(() => {
                setLoading(false);
                resolve({
                    success: true,
                    message: 'Password reset instructions have been sent to your email.',
                });
            }, 800);
        });
    };

    const logout = () => {
        localStorage.removeItem('adept_user');
        localStorage.removeItem('adept_token');
        setCurrentUser(null);
    };

    return {
        currentUser,
        backendHealthy,
        loading,
        login,
        signUp,
        forgotPassword,
        logout,
    };
}