import { useState } from 'react';
import '../styles/AdminAccountSettings.css';
function CameraIcon({ size = 16 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
        </svg>
    );
}

function EditPencilIcon({ size = 14 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
    );
}

function ShieldIcon({ size = 16 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
    );
}
import type { User } from '../../auth-folder/types/auth';

interface AdminAccountSettingsFormData {
    fullName: string;
    username: string;
    email: string;
}

interface AdminAccountSettingsProps {
    user: User;
    onSave?: (data: AdminAccountSettingsFormData) => Promise<void> | void;
    onUpdateEmail?: () => void;
    onChangePassword?: () => void;
    onChangePhoto?: () => void;
    onDisableAccount?: (disabled: boolean) => Promise<void> | void;
}

function getInitials(fullName: string): string {
    return fullName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join('');
}

export function AdminAccountSettings({
    user,
    onSave,
    onUpdateEmail,
    onChangePassword,
    onChangePhoto,
    onDisableAccount,
}: AdminAccountSettingsProps) {
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    const roleLabel = user.role === 'SUPER_ADMIN' ? 'Super Admin' : user.role === 'OFFICE_STAFF' ? 'Office Staff' : user.role || 'Super Admin';

    const [form, setForm] = useState<AdminAccountSettingsFormData>({
        fullName,
        username: user.username || user.email?.split('@')[0] || '',
        email: user.email || '',
    });
    const [saving, setSaving] = useState(false);
    const [accountDisabled, setAccountDisabled] = useState(false);
    const [togglingStatus, setTogglingStatus] = useState(false);

    const set = (field: keyof AdminAccountSettingsFormData, value: string) =>
        setForm((prev) => ({ ...prev, [field]: value }));

    const isDirty =
        form.fullName !== fullName ||
        form.username !== (user.username || user.email?.split('@')[0] || '') ||
        form.email !== (user.email || '');

    const handleDiscard = () => {
        setForm({
            fullName,
            username: user.username || user.email?.split('@')[0] || '',
            email: user.email || '',
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave?.(form);
        } finally {
            setSaving(false);
        }
    };

    const handleToggleDisable = async () => {
        const next = !accountDisabled;
        setTogglingStatus(true);
        try {
            await onDisableAccount?.(next);
            setAccountDisabled(next);
        } finally {
            setTogglingStatus(false);
        }
    };

    return (
        <div className="aas-page">

            {/* Page heading */}
            <div className="aas-page-header">
                <h1 className="aas-page-title">Account settings</h1>
                <span className="aas-page-subtitle">
                    Manage your profile, login details, and account security.
                </span>
            </div>

            {/* Profile banner */}
            <div className="aas-profile-banner">
                <div className="aas-profile-identity">
                    <div className="aas-avatar-circle">
                        {(user as any).avatarUrl ? (
                            <img src={(user as any).avatarUrl} alt={fullName} />
                        ) : (
                            getInitials(fullName)
                        )}
                    </div>
                    <div className="aas-profile-text">
                        <span className="aas-profile-name">{fullName}</span>
                        <span className="aas-profile-meta">
                            {user.email}
                            <span className="aas-profile-meta-dot" />
                            <span className="aas-role-chip">{roleLabel.toUpperCase()}</span>
                        </span>
                    </div>
                </div>
                <button type="button" className="aas-change-photo-btn" onClick={onChangePhoto}>
                    <CameraIcon />
                    Change Photo
                </button>
            </div>

            {/* Profile information */}
            <div>
                <div className="aas-section-header">
                    <h2 className="aas-section-title">Profile Information</h2>
                    <span className="aas-section-subtitle">This is shown on your public profile.</span>
                </div>

                <div className="aas-info-card">
                    <div className="aas-field">
                        <label className="aas-field-label" htmlFor="aas-full-name">Full Name</label>
                        <div className="aas-input-wrap">
                            <input
                                id="aas-full-name"
                                className="aas-input"
                                placeholder="e.g. Juan Dela Cruz"
                                value={form.fullName}
                                onChange={(e) => set('fullName', e.target.value)}
                            />
                            <span className="aas-input-edit-icon"><EditPencilIcon /></span>
                        </div>
                    </div>

                    <div className="aas-field">
                        <label className="aas-field-label" htmlFor="aas-username">Username</label>
                        <div className="aas-input-wrap">
                            <input
                                id="aas-username"
                                className="aas-input"
                                placeholder="e.g. Ju-An"
                                value={form.username}
                                onChange={(e) => set('username', e.target.value)}
                            />
                            <span className="aas-input-edit-icon"><EditPencilIcon /></span>
                        </div>
                        <span className="aas-field-hint">Used for login and your public profile URL.</span>
                    </div>

                    <div className="aas-field">
                        <label className="aas-field-label" htmlFor="aas-email">Email</label>
                        <div className="aas-field-row">
                            <div className="aas-input-wrap">
                                <input
                                    id="aas-email"
                                    className="aas-input"
                                    placeholder="e.g. Juan@gmail.com"
                                    value={form.email}
                                    onChange={(e) => set('email', e.target.value)}
                                />
                            </div>
                            <button type="button" className="aas-inline-btn" onClick={onUpdateEmail}>
                                Update email
                            </button>
                        </div>
                    </div>

                    <div className="aas-field">
                        <label className="aas-field-label" htmlFor="aas-password">Password</label>
                        <div className="aas-field-row">
                            <div className="aas-input-wrap">
                                <input
                                    id="aas-password"
                                    className="aas-input"
                                    type="password"
                                    readOnly
                                    value="••••••••"
                                />
                            </div>
                            <button type="button" className="aas-inline-btn" onClick={onChangePassword}>
                                Change Password
                            </button>
                        </div>
                    </div>
                </div>

                <div className="aas-card-actions" style={{ marginTop: 16 }}>
                    <button
                        type="button"
                        className="aas-btn aas-btn-discard"
                        onClick={handleDiscard}
                        disabled={!isDirty || saving}
                    >
                        Discard Changes
                    </button>
                    <button
                        type="button"
                        className="aas-btn aas-btn-save"
                        onClick={handleSave}
                        disabled={!isDirty || saving}
                    >
                        {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {/* Account status */}
            <div>
                <div className="aas-section-header">
                    <h2 className="aas-section-title">Account Status</h2>
                </div>

                <div className="aas-status-row">
                    <span className="aas-status-label">
                        <ShieldIcon />
                        Disable Account
                    </span>
                    <button
                        type="button"
                        className={`aas-toggle ${accountDisabled ? 'is-on' : ''}`}
                        onClick={handleToggleDisable}
                        disabled={togglingStatus}
                        aria-pressed={accountDisabled}
                        aria-label="Disable account"
                    >
                        <span className="aas-toggle-knob" />
                    </button>
                </div>
                {accountDisabled && (
                    <div className="aas-status-warning">
                        Your account is disabled. You won't be able to log in until it's re-enabled by an administrator.
                    </div>
                )}
            </div>

        </div>
    );
}