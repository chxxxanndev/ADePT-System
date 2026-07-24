import { useState, useEffect } from 'react';
import type { View } from './types/auth';
import { AlertBanner } from './components/AlertBanner';
import { PasswordInput } from './components/PasswordInput';
import { LockDisclaimer } from './components/LockDisclaimer';
import sealImg from './assets/seal.png';
import logoImg from './assets/logo.png';

interface LoginResult {
    success: boolean;
    message: string;
    reactivatable?: boolean;
    daysRemaining?: number;
}

interface LoginFormProps {
    active: boolean;
    loading: boolean;
    onLogin: (username: string, password: string) => Promise<LoginResult>;
    onReactivate: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
    navigateTo: (view: View) => void;
    initialUsername?: string;
}

export function LoginForm({ active, loading, onLogin, onReactivate, navigateTo, initialUsername }: LoginFormProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Reactivation confirmation prompt
    const [showReactivatePrompt, setShowReactivatePrompt] = useState(false);
    const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
    const [reactivating, setReactivating] = useState(false);

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

        if (result.reactivatable) {
            setDaysRemaining(result.daysRemaining ?? null);
            setShowReactivatePrompt(true);
            return;
        }

        if (result.success) {
            setSuccessMsg(result.message);
        } else {
            setErrorMsg(result.message);
        }
    };

    const handleConfirmReactivate = async () => {
        setReactivating(true);
        try {
            const result = await onReactivate(username, password);
            if (result.success) {
                setSuccessMsg(result.message);
                setShowReactivatePrompt(false);
            } else {
                setErrorMsg(result.message);
                setShowReactivatePrompt(false);
            }
        } finally {
            setReactivating(false);
        }
    };

    const handleCancelReactivate = () => {
        setShowReactivatePrompt(false);
        setErrorMsg('Sign-in cancelled. Your account remains disabled.');
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

                <span className="forgot-password-link" onClick={() => navigateTo('forgotPassword')}>
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

            {showReactivatePrompt && (
                <div className="as-modal-overlay" onClick={handleCancelReactivate}>
                    <div
                        className="as-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="reactivate-modal-title"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="as-modal-header">
                            <h3 id="reactivate-modal-title">Account Disabled</h3>
                        </div>

                        <div className="as-modal-body">
                            <p>
                                This account was disabled
                                {daysRemaining !== null && ` (${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left to reactivate)`}.
                                {' '}Are you sure you want to log in again? Doing so will cancel the account disable.
                            </p>
                        </div>

                        <div className="as-modal-actions">
                            <button type="button" className="as-btn as-btn-discard" onClick={handleCancelReactivate} disabled={reactivating}>
                                Cancel
                            </button>
                            <button type="button" className="as-btn as-btn-save" onClick={handleConfirmReactivate} disabled={reactivating}>
                                {reactivating ? 'Reactivating…' : 'Yes, Log In'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}