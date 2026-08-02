import { useState } from 'react';
import type { View } from '../types/auth';
import { AlertBanner } from '../components/AlertBanner';
import { LockDisclaimer } from '../components/LockDisclaimer';
import sealImg from '../assets/seal.png';
import logoImg from '../assets/logo.png';

interface OtpFormProps {
    active: boolean;
    loading: boolean;
    email: string;
    onVerify: (email: string, token: string) => Promise<{ success: boolean; message: string }>;
    onResend: (email: string) => Promise<{ success: boolean; message: string }>;
    navigateTo: (view: View) => void;
}

export function OtpForm({ active, loading, email, onVerify, onResend, navigateTo }: OtpFormProps) {
    const [code, setCode] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [resending, setResending] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code) {
            setErrorMsg('Please enter the code sent to your email.');
            return;
        }
        setErrorMsg(null);
        setSuccessMsg(null);

        const result = await onVerify(email, code);
        if (result.success) {
            setSuccessMsg(result.message);
            setTimeout(() => navigateTo('login'), 2000);
        } else {
            setErrorMsg(result.message);
        }
    };

    const handleResend = async () => {
        setResending(true);
        setErrorMsg(null);
        setSuccessMsg(null);
        const result = await onResend(email);
        if (result.success) setSuccessMsg(result.message);
        else setErrorMsg(result.message);
        setResending(false);
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
                <h2 className="form-title">Verify Your Email</h2>
                <p className="form-subtitle">
                    We sent a verification code to <strong>{email}</strong>. Enter it below to continue.
                </p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="form-label" htmlFor="otpCode">Verification Code</label>
                    <input
                        type="text"
                        id="otpCode"
                        className="form-input"
                        placeholder="Enter 6-digit code"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        inputMode="numeric"
                        maxLength={6}
                        required
                    />
                </div>

                <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? 'Verifying...' : 'Verify Email'}
                </button>

                <div className="form-footer-actions">
                    Didn't get a code?{' '}
                    <span className="footer-link" onClick={handleResend}>
                        {resending ? 'Sending...' : 'Resend code'}
                    </span>
                </div>
            </form>

            <LockDisclaimer />
        </div>
    );
}