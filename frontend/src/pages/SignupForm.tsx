import { useState } from 'react';
import type { View } from '../types/auth';
import { AlertBanner } from '../components/AlertBanner';
import { PasswordInput } from '../components/PasswordInput';
import { LockDisclaimer } from '../components/LockDisclaimer';
import sealImg from '../assets/seal.png';
import logoImg from '../assets/logo.png';

interface SignupFormProps {
    active: boolean;
    loading: boolean;
    onSignUp: (form: {
        firstName: string;
        lastName: string;
        email: string;
        username: string;
        password: string;
    }) => Promise<{ success: boolean; message: string }>;
    navigateTo: (view: View) => void;
    prefillUsername: (username: string) => void;
}

export function SignupForm({ active, loading, onSignUp, navigateTo, prefillUsername }: SignupFormProps) {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setSuccessMsg(null);

        if (!firstName || !lastName || !email || !username || !password) {
            setErrorMsg('All fields are required.');
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

        const result = await onSignUp({ firstName, lastName, email, username, password });
        if (result.success) {
            setSuccessMsg(result.message);
            prefillUsername(username);
            setTimeout(() => navigateTo('login'), 2000);
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
                <h2 className="form-title">Sign up to create account</h2>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label" htmlFor="firstName">First Name</label>
                        <input
                            type="text"
                            id="firstName"
                            className="form-input"
                            placeholder="Juan"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="lastName">Last Name</label>
                        <input
                            type="text"
                            id="lastName"
                            className="form-input"
                            placeholder="Dela Cruz"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label" htmlFor="signupEmail">Email Address</label>
                    <input
                        type="email"
                        id="signupEmail"
                        className="form-input"
                        placeholder="JuanDelaCruz@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                <div className="form-group">
                    <label className="form-label" htmlFor="signupUsername">Username</label>
                    <input
                        type="text"
                        id="signupUsername"
                        className="form-input"
                        placeholder="Enter your username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>

                <div className="form-group">
                    <label className="form-label" htmlFor="signupPassword">Password</label>
                    <PasswordInput id="signupPassword" value={password} onChange={setPassword} />
                </div>

                <div className="form-group">
                    <label className="form-label" htmlFor="signupConfirmPassword">Confirm Password</label>
                    <PasswordInput id="signupConfirmPassword" value={confirmPassword} onChange={setConfirmPassword} />
                </div>

                <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? 'Registering...' : 'Sign Up'}
                </button>

                <div className="form-footer-actions">
                    Already have an account?{' '}
                    <span className="footer-link" onClick={() => navigateTo('login')}>
                        Sign In here
                    </span>
                </div>
            </form>

            <LockDisclaimer />
        </div>
    );
}