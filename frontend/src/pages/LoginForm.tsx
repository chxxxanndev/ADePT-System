import { useState, useEffect } from 'react';
import type { View } from '../types/auth';
import { AlertBanner } from '../components/AlertBanner';
import { PasswordInput } from '../components/PasswordInput';
import { LockDisclaimer } from '../components/LockDisclaimer';
import sealImg from '../assets/seal.png';
import logoImg from '../assets/logo.png';

interface LoginFormProps {
    active: boolean;
    loading: boolean;
    onLogin: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
    navigateTo: (view: View) => void;
    initialUsername?: string;
}

export function LoginForm({ active, loading, onLogin, navigateTo, initialUsername }: LoginFormProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    useEffect(() => {
        if (initialUsername) setUsername(initialUsername);
    }, [initialUsername]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !password) {
            setErrorMsg('Please enter both username and password.');
            return;
        }
        setErrorMsg(null);
        setSuccessMsg(null);

        const result = await onLogin(username, password);
        if (result.success) {
            setSuccessMsg(result.message);
        } else {
            setErrorMsg(result.message);
        }
    };

    return (
        <div className={`form-content-wrapper ${active ? 'active' : ''}`}>
            <div className="page-brand">
                <img src={sealImg} alt="Zamboanga del Norte Seal" className="page-brand-logo" />
                <img src={logoImg} alt="ADePT Logo" className="page-brand-logo" />
            </div>

            <div>
                {errorMsg && <AlertBanner type="error" message={errorMsg} />}
                {successMsg && <AlertBanner type="success" message={successMsg} />}
            </div>

            <div className="form-header-area">
                <h2 className="form-title">Welcome Back!</h2>
                <p className="form-subtitle">Please sign in using your office credentials to access the ADePT System.</p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="form-label" htmlFor="username">Username</label>
                    <input
                        type="text"
                        id="username"
                        className="form-input"
                        placeholder="Enter your username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>

                <div className="form-group">
                    <label className="form-label" htmlFor="password">Password</label>
                    <PasswordInput id="password" value={password} onChange={setPassword} placeholder="Enter your password" />
                </div>

                <span className="forgot-password-link" onClick={() => navigateTo('forgot')}>
                    Forgot Password?
                </span>

                <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? 'Signing In...' : 'Sign In'}
                </button>

                <div className="form-footer-actions">
                    Don't have an account?{' '}
                    <span className="footer-link" onClick={() => navigateTo('signup')}>
                        Sign Up here
                    </span>
                </div>
            </form>

            <LockDisclaimer />
        </div>
    );
}