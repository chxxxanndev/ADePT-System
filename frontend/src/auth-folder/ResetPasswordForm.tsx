import { useState, useEffect } from 'react';
import type { View } from './types/auth';
import { PasswordInput } from './components/PasswordInput';
import { AlertBanner } from './components/AlertBanner';
import { LockDisclaimer } from './components/LockDisclaimer';
import { supabase } from './services/supabaseClient';
import sealImg from './assets/seal.png';
import logoImg from './assets/logo.png';

interface ResetPasswordFormProps {
    active: boolean;
    navigateTo: (view: View) => void;
}

export function ResetPasswordForm({ active, navigateTo }: ResetPasswordFormProps) {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [sessionReady, setSessionReady] = useState(false);

    useEffect(() => {
        // Supabase automatically parses the access token from the URL hash
        // when the recovery link is clicked. We just need to confirm a session exists.
        supabase.auth.getSession().then(({ data }) => {
            if (data.session) {
                setSessionReady(true);
            } else {
                setErrorMsg('Invalid or expired reset link. Please request a new one.');
            }
        });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setSuccessMsg(null);

        if (!password || !confirmPassword) {
            setErrorMsg('Please fill in both password fields.');
            return;
        }
        if (password.length < 6) {
            setErrorMsg('Password must be at least 6 characters long.');
            return;
        }
        if (password !== confirmPassword) {
            setErrorMsg('Passwords do not match.');
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.updateUser({ password });
        setLoading(false);

        if (error) {
            setErrorMsg(error.message);
        } else {
            setSuccessMsg('Password updated successfully! You can now sign in.');
            setTimeout(() => navigateTo('login'), 2000);
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
                <h2 className="form-title">Reset Password</h2>
                <p className="form-subtitle">Enter your new password below.</p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="form-label" htmlFor="newPassword">New Password</label>
                    <PasswordInput
                        id="newPassword"
                        value={password}
                        onChange={setPassword}
                        placeholder="Enter new password"
                        disabled={!sessionReady}
                        autoComplete="new-password"
                        required
                    />
                </div>

                <div className="form-group">
                    <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
                    <PasswordInput
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={setConfirmPassword}
                        placeholder="Re-enter new password"
                        disabled={!sessionReady}
                        autoComplete="new-password"
                        required
                    />
                </div>

                <button type="submit" className="submit-btn" disabled={loading || !sessionReady}>
                    {loading ? 'Updating...' : 'Update Password'}
                </button>

                <div className="form-footer-actions">
                    Remember your password?{' '}
                    <span className="footer-link" onClick={() => navigateTo('login')}>
                        Sign In here
                    </span>
                </div>
            </form>

            <LockDisclaimer />
        </div>
    );
}