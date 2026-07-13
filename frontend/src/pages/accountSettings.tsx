import { useState } from 'react';
import type { AccountUser, AccountSettingsFormData } from '../types/accountSettings';
import { CameraIcon, EditPencilIcon, ShieldIcon } from '../components/icons';
import '../styles/accountSettings.css';

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────
interface AccountSettingsProps {
    user: AccountUser;
    onSave: (data: AccountSettingsFormData) => Promise<void> | void;
    onUpdateEmail: () => void;
    onChangePassword: () => void;
    onChangePhoto: () => void;
    onDisableAccount: (disabled: boolean) => Promise<void> | void;
}

function getInitials(fullName: string): string {
    return fullName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join('');
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────
export function AccountSettings({
    user,
    onSave,
    onUpdateEmail,
    onChangePassword,
    onChangePhoto,
    onDisableAccount,
}: AccountSettingsProps) {
    const [form, setForm] = useState<AccountSettingsFormData>({
        fullName: user.fullName,
        username: user.username,
        email: user.email,
    });
    const [saving, setSaving] = useState(false);
    const [accountDisabled, setAccountDisabled] = useState(false);
    const [togglingStatus, setTogglingStatus] = useState(false);

    const set = (field: keyof AccountSettingsFormData, value: string) =>
        setForm((prev) => ({ ...prev, [field]: value }));

    const isDirty =
        form.fullName !== user.fullName ||
        form.username !== user.username ||
        form.email !== user.email;

    const handleDiscard = () => {
        setForm({ fullName: user.fullName, username: user.username, email: user.email });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(form);
        } finally {
            setSaving(false);
        }
    };

    const handleToggleDisable = async () => {
        const next = !accountDisabled;
        setTogglingStatus(true);
        try {
            await onDisableAccount(next);
            setAccountDisabled(next);
        } finally {
            setTogglingStatus(false);
        }
    };

    return (
        <div className="as-page">

            {/* ── Page heading ── */}
            <div className="as-page-header">
                <h1 className="as-page-title">Account settings</h1>
                <span className="as-page-subtitle">
                    Manage your profile, login details, and account security.
                </span>
            </div>

            {/* ── Profile banner ── */}
            <div className="as-profile-banner">
                <div className="as-profile-identity">
                    <div className="as-avatar-circle">
                        {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.fullName} />
                        ) : (
                            getInitials(user.fullName)
                        )}
                    </div>
                    <div className="as-profile-text">
                        <span className="as-profile-name">{user.fullName}</span>
                        <span className="as-profile-meta">
                            {user.email}
                            <span className="as-profile-meta-dot" />
                            <span className="as-role-chip">{user.role}</span>
                        </span>
                    </div>
                </div>
                <button type="button" className="as-change-photo-btn" onClick={onChangePhoto}>
                    <CameraIcon />
                    Change Photo
                </button>
            </div>

            {/* ── Profile information ── */}
            <div>
                <div className="as-section-header">
                    <h2 className="as-section-title">Profile Information</h2>
                    <span className="as-section-subtitle">This is shown on your public profile.</span>
                </div>

                <div className="as-info-card">
                    <div className="as-field">
                        <label className="as-field-label" htmlFor="as-full-name">Full Name</label>
                        <div className="as-input-wrap">
                            <input
                                id="as-full-name"
                                className="as-input"
                                placeholder="e.g. Juan Dela Cruz"
                                value={form.fullName}
                                onChange={(e) => set('fullName', e.target.value)}
                            />
                            <span className="as-input-edit-icon"><EditPencilIcon /></span>
                        </div>
                    </div>

                    <div className="as-field">
                        <label className="as-field-label" htmlFor="as-username">Username</label>
                        <div className="as-input-wrap">
                            <input
                                id="as-username"
                                className="as-input"
                                placeholder="e.g. Ju-An"
                                value={form.username}
                                onChange={(e) => set('username', e.target.value)}
                            />
                            <span className="as-input-edit-icon"><EditPencilIcon /></span>
                        </div>
                        <span className="as-field-hint">Used for login and your public profile URL.</span>
                    </div>

                    <div className="as-field">
                        <label className="as-field-label" htmlFor="as-email">Email</label>
                        <div className="as-field-row">
                            <div className="as-input-wrap">
                                <input
                                    id="as-email"
                                    className="as-input"
                                    placeholder="e.g. Juan@gmail.com"
                                    value={form.email}
                                    onChange={(e) => set('email', e.target.value)}
                                />
                            </div>
                            <button type="button" className="as-inline-btn" onClick={onUpdateEmail}>
                                Update email
                            </button>
                        </div>
                    </div>

                    <div className="as-field">
                        <label className="as-field-label" htmlFor="as-password">Password</label>
                        <div className="as-field-row">
                            <div className="as-input-wrap">
                                <input
                                    id="as-password"
                                    className="as-input"
                                    type="password"
                                    readOnly
                                    value="••••••••"
                                />
                            </div>
                            <button type="button" className="as-inline-btn" onClick={onChangePassword}>
                                Change Password
                            </button>
                        </div>
                        {user.lastPasswordChange && (
                            <span className="as-field-footnote">last changed {user.lastPasswordChange}</span>
                        )}
                    </div>
                </div>

                <div className="as-card-actions" style={{ marginTop: 16 }}>
                    <button
                        type="button"
                        className="as-btn as-btn-discard"
                        onClick={handleDiscard}
                        disabled={!isDirty || saving}
                    >
                        Discard Changes
                    </button>
                    <button
                        type="button"
                        className="as-btn as-btn-save"
                        onClick={handleSave}
                        disabled={!isDirty || saving}
                    >
                        {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {/* ── Account status ── */}
            <div>
                <div className="as-section-header">
                    <h2 className="as-section-title">Account Status</h2>
                </div>

                <div className="as-status-row">
                    <span className="as-status-label">
                        <ShieldIcon />
                        Disable Account
                    </span>
                    <button
                        type="button"
                        className={`as-toggle ${accountDisabled ? 'is-on' : ''}`}
                        onClick={handleToggleDisable}
                        disabled={togglingStatus}
                        aria-pressed={accountDisabled}
                        aria-label="Disable account"
                    >
                        <span className="as-toggle-knob" />
                    </button>
                </div>
                {accountDisabled && (
                    <div className="as-status-warning">
                        Your account is disabled. You won't be able to log in until it's re-enabled by an administrator.
                    </div>
                )}
            </div>

        </div>
    );
}