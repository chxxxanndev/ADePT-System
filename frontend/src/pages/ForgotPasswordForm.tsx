import { useState } from 'react';
import type { View } from '../types/auth';
import { AlertBanner } from '../components/AlertBanner';
import { LockDisclaimer } from '../components/LockDisclaimer';
import sealImg from '../assets/seal.png';
import logoImg from '../assets/logo.png';

interface ForgotPasswordFormProps {
    active: boolean;
    loading: boolean;
    onForgotPassword: (email: string) => Promise<{ success: boolean; message: string }>;
    navigateTo: (view: View) => void;
}

export function ForgotPasswordForm({ active, loading, onForgotPassword, navigateTo }: ForgotPasswordFormProps) {
    const [email, setEmail] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            setErrorMsg('Please enter your email address.');
            return;
        }
        setErrorMsg(null);
        setSuccessMsg(null);

        const result = await onForgotPassword(email);
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
                <h2 className="form-title">Forgot Password?</h2>
                <p className="form-subtitle">Enter your email address and we'll send you instructions to reset your password.</p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="form-label" htmlFor="forgotEmail">Email Address</label>
                    <input
                        type="email"
                        id="forgotEmail"
                        className="form-input"
                        placeholder="Enter your email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? 'Sending...' : 'Send Reset Instructions'}
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