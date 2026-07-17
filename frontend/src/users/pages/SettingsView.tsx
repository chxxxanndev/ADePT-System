import { useState } from 'react';
import type { UserProfile } from '../types/dashboard';
import '../styles/SettingsView.css';

interface SettingsViewProps {
    user: UserProfile;
    onSave?: (updated: { fullName: string; username: string; email: string }) => void;
}

const CameraIcon = ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
    </svg>
);

const EditIcon = ({ size = 15 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z" />
    </svg>
);

function getInitials(name: string) {
    return name
        .trim()
        .split(/\s+/)
        .map((part) => part[0] || '')
        .join('')
        .slice(0, 2)
        .toUpperCase();
}

export function SettingsView({ user, onSave }: SettingsViewProps) {
    const [fullName, setFullName] = useState(user.name);
    const [username, setUsername] = useState(
        user.name.toLowerCase().replace(/\s+/g, '-')
    );
    const [email, setEmail] = useState(user.email);
    const [accountDisabled, setAccountDisabled] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    const showToast = (message: string) => {
        setToast(message);
        window.setTimeout(() => setToast(null), 2500);
    };

    const markDirty = () => setIsDirty(true);

    const handleDiscard = () => {
        setFullName(user.name);
        setUsername(user.name.toLowerCase().replace(/\s+/g, '-'));
        setEmail(user.email);
        setIsDirty(false);
        showToast('Changes discarded');
    };

    const handleSave = () => {
        onSave?.({ fullName, username, email });
        setIsDirty(false);
        showToast('Profile updated');
    };

    return (
        <div className="settings-page">
            <div className="settings-heading">
                <h1 className="settings-title">Account settings</h1>
                <p className="settings-subtitle">Manage your profile, login details, and account security.</p>
            </div>

            <div className="settings-hero">
                <div className="settings-hero-left">
                    <div className="settings-hero-avatar">{getInitials(fullName)}</div>
                    <div className="settings-hero-info">
                        <p className="settings-hero-name">{fullName}</p>
                        <p className="settings-hero-meta">
                            {email} <span className="settings-hero-dot">&bull;</span> {user.role}
                        </p>
                    </div>
                </div>
                <button type="button" className="settings-photo-btn">
                    <CameraIcon />
                    Change photo
                </button>
            </div>

            <div className="settings-section-heading">
                <h2>Profile information</h2>
                <p>This is shown on your public profile.</p>
            </div>

            <div className="settings-card">
                <div className="settings-field">
                    <label htmlFor="fullName">Full name</label>
                    <div className="settings-input-wrap">
                        <input
                            id="fullName"
                            type="text"
                            value={fullName}
                            placeholder="e.g. Juan Dela Cruz"
                            onChange={(e) => { setFullName(e.target.value); markDirty(); }}
                        />
                        <EditIcon />
                    </div>
                </div>

                <div className="settings-field">
                    <label htmlFor="username">Username</label>
                    <div className="settings-input-wrap">
                        <input
                            id="username"
                            type="text"
                            value={username}
                            placeholder="e.g. ju-an"
                            onChange={(e) => { setUsername(e.target.value); markDirty(); }}
                        />
                        <EditIcon />
                    </div>
                    <p className="settings-field-hint">Used for login and your public profile URL.</p>
                </div>

                <div className="settings-field">
                    <label htmlFor="email">Email</label>
                    <div className="settings-input-wrap settings-input-wrap--action">
                        <input
                            id="email"
                            type="email"
                            value={email}
                            placeholder="e.g. juan@gmail.com"
                            readOnly
                        />
                        <button
                            type="button"
                            className="settings-inline-btn"
                            onClick={() => showToast('Verification link sent to your inbox')}
                        >
                            Update email
                        </button>
                    </div>
                </div>

                <div className="settings-field settings-field--last">
                    <label htmlFor="password">Password</label>
                    <div className="settings-input-wrap settings-input-wrap--action">
                        <input id="password" type="password" value="••••••••••" readOnly />
                        <button
                            type="button"
                            className="settings-inline-btn"
                            onClick={() => showToast('Password change form opened')}
                        >
                            Change password
                        </button>
                    </div>
                    <p className="settings-field-hint">Last changed 3 months ago.</p>
                </div>
            </div>

            <div className="settings-actions">
                <button type="button" className="settings-btn settings-btn--ghost" onClick={handleDiscard} disabled={!isDirty}>
                    Discard changes
                </button>
                <button type="button" className="settings-btn settings-btn--primary" onClick={handleSave} disabled={!isDirty}>
                    Save changes
                </button>
            </div>

            <div className="settings-section-heading settings-section-heading--tight">
                <h2>Account status</h2>
            </div>

            <div className="settings-status-card">
                <span>Disable account</span>
                <label className="settings-toggle">
                    <input
                        type="checkbox"
                        checked={accountDisabled}
                        onChange={(e) => {
                            setAccountDisabled(e.target.checked);
                            showToast(e.target.checked ? 'Account disabled' : 'Account re-enabled');
                        }}
                    />
                    <span className="settings-toggle-track">
                        <span className="settings-toggle-thumb" />
                    </span>
                </label>
            </div>

            {toast && <div className="settings-toast">{toast}</div>}
        </div>
    );
}