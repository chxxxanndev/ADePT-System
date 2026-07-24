import { useState, useRef } from 'react';
import '../styles/AdminAccountSettings.css';
import { useAuth } from '../../users/hooks/useAuth';
import { PasswordInput } from '../../auth-folder/components/PasswordInput';
import * as accountService from '../services/adminAccountService';

function CameraIcon({ size = 16 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
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

function CloseIcon({ size = 16 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
}

function getInitials(fullName: string): string {
    return fullName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join('');
}

export function AdminAccountSettings() {
    const { currentUser, updateCurrentUser, logout } = useAuth();

    const fullName = `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim();
    const initialUsername = currentUser?.username || currentUser?.email?.split('@')[0] || '';
    const roleLabel = currentUser?.role === 'SUPER_ADMIN' ? 'Super Admin' : currentUser?.role === 'OFFICE_STAFF' ? 'Office Staff' : currentUser?.role || 'Super Admin';

    // --- 1. STAGED PROFILE STATE (requires Save Changes) ---
    const [form, setForm] = useState({
        fullName,
        username: initialUsername,
    });
    const [saving, setSaving] = useState(false);
    const isDirty = form.fullName !== fullName || form.username !== initialUsername;

    // --- 2. INSTANT STATES ---
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [emailDraft, setEmailDraft] = useState(currentUser?.email || '');
    const [isEditingEmail, setIsEditingEmail] = useState(false);
    const [emailSubmitting, setEmailSubmitting] = useState(false);
    const [togglingStatus, setTogglingStatus] = useState(false);

    // --- 3. MODAL & UI STATES ---
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showDisableConfirmModal, setShowDisableConfirmModal] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    const emailInputRef = useRef<HTMLInputElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const showToast = (message: string) => {
        setToast(message);
        window.setTimeout(() => setToast(null), 2500);
    };

    // --- HANDLERS ---

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            const result = await accountService.updateProfile(form.fullName, form.username);
            updateCurrentUser({
                firstName: result.first_name,
                lastName: result.last_name,
                username: result.username,
            });
            showToast('Profile updated successfully!');
        } catch (err: any) {
            showToast(err?.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const handleDiscard = () => {
        setForm({ fullName, username: initialUsername });
    };

    const handleEmailUpdate = async () => {
        if (!isEditingEmail) {
            setIsEditingEmail(true);
            requestAnimationFrame(() => emailInputRef.current?.focus());
            return;
        }
        setEmailSubmitting(true);
        try {
            const result = await accountService.updateEmail(emailDraft);
            updateCurrentUser({ email: result.email });
            setIsEditingEmail(false);
            showToast('Email updated successfully!');
        } catch (err: any) {
            showToast(err?.message || 'Failed to update email');
        } finally {
            setEmailSubmitting(false);
        }
    };

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingPhoto(true);
        try {
            const avatarUrl = await accountService.uploadPhoto(file);
            updateCurrentUser({ avatarUrl });
            showToast('Profile photo updated!');
        } catch (err: any) {
            showToast(err?.message || 'Failed to upload photo');
        } finally {
            setUploadingPhoto(false);
            e.target.value = '';
        }
    };

    const handleChangePassword = async (current: string, next: string) => {
        await accountService.changePassword(current, next);
    };

    const applyDisableStatus = async (next: boolean) => {
        setTogglingStatus(true);
        try {
            await accountService.setAccountStatus(next);
            setShowDisableConfirmModal(false);
            showToast(next ? 'Account disabled' : 'Account re-enabled');
            if (next) {
                logout();
            }
        } catch (err: any) {
            showToast(err?.message || 'Failed to update account status');
        } finally {
            setTogglingStatus(false);
        }
    };

    // --- Early return AFTER all hooks are declared ---
    if (!currentUser) return null;

    const accountDisabled = currentUser.status === 'DISABLED';

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
                        {currentUser.avatarUrl ? <img src={currentUser.avatarUrl} alt={fullName} /> : getInitials(fullName)}
                    </div>
                    <div className="aas-profile-text">
                        <span className="aas-profile-name">{fullName}</span>
                        <span className="aas-profile-meta">
                            {currentUser.email}
                            <span className="aas-profile-meta-dot" />
                            <span className="aas-role-chip">{roleLabel.toUpperCase()}</span>
                        </span>
                    </div>
                </div>
                <button
                    type="button"
                    className="aas-change-photo-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                >
                    <CameraIcon />
                    {uploadingPhoto ? 'Uploading…' : 'Change Photo'}
                </button>
                <input ref={fileInputRef} type="file" hidden accept="image/*" onChange={handlePhotoChange} />
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
                                onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                            />
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
                                onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                            />
                        </div>
                        <span className="aas-field-hint">Used for login and your public profile URL.</span>
                    </div>
                </div>

                {isDirty && (
                    <div className="aas-card-actions" style={{ marginTop: 16 }}>
                        <button
                            type="button"
                            className="aas-btn aas-btn-discard"
                            onClick={handleDiscard}
                            disabled={saving}
                        >
                            Discard Changes
                        </button>
                        <button
                            type="button"
                            className="aas-btn aas-btn-save"
                            onClick={handleSaveProfile}
                            disabled={saving}
                        >
                            {saving ? 'Saving…' : 'Save Changes'}
                        </button>
                    </div>
                )}
            </div>

            {/* Security settings */}
            <div>
                <div className="aas-section-header">
                    <h2 className="aas-section-title">Security Settings</h2>
                </div>

                <div className="aas-info-card">
                    <div className="aas-field">
                        <label className="aas-field-label" htmlFor="aas-email">Email</label>
                        <div className="aas-field-row">
                            <div className="aas-input-wrap">
                                <input
                                    id="aas-email"
                                    ref={emailInputRef}
                                    className="aas-input"
                                    placeholder="e.g. Juan@gmail.com"
                                    value={isEditingEmail ? emailDraft : currentUser.email}
                                    readOnly={!isEditingEmail}
                                    onChange={(e) => setEmailDraft(e.target.value)}
                                />
                            </div>
                            <button
                                type="button"
                                className="aas-inline-btn"
                                onClick={handleEmailUpdate}
                                disabled={emailSubmitting}
                            >
                                {emailSubmitting ? 'Updating…' : isEditingEmail ? 'Update Email' : 'Update email'}
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
                            <button type="button" className="aas-inline-btn" onClick={() => setShowPasswordModal(true)}>
                                Change Password
                            </button>
                        </div>
                    </div>
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
                        onClick={() => (accountDisabled ? applyDisableStatus(false) : setShowDisableConfirmModal(true))}
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

            {/* CHANGE PASSWORD MODAL */}
            {showPasswordModal && (
                <div className="as-modal-overlay" onClick={() => setShowPasswordModal(false)}>
                    <div className="as-modal" onClick={(e) => e.stopPropagation()} role="dialog">
                        <div className="as-modal-header">
                            <h3>Change Password</h3>
                            <button type="button" className="as-modal-close" onClick={() => setShowPasswordModal(false)}>
                                <CloseIcon />
                            </button>
                        </div>
                        <PasswordFormContent
                            onSave={handleChangePassword}
                            onClose={() => setShowPasswordModal(false)}
                            showToast={showToast}
                        />
                    </div>
                </div>
            )}

            {/* DISABLE CONFIRM MODAL */}
            {showDisableConfirmModal && (
                <div className="as-modal-overlay" onClick={() => setShowDisableConfirmModal(false)}>
                    <div className="as-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="as-modal-header">
                            <h3>Disable Account</h3>
                            <button type="button" className="as-modal-close" onClick={() => setShowDisableConfirmModal(false)}>
                                <CloseIcon />
                            </button>
                        </div>
                        <div className="as-modal-body">
                            <p>Are you sure you want to disable your account? You will be logged out immediately.</p>
                        </div>
                        <div className="as-modal-actions">
                            <button type="button" className="as-btn as-btn-discard" onClick={() => setShowDisableConfirmModal(false)}>
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="as-btn as-btn-save"
                                onClick={() => applyDisableStatus(true)}
                                disabled={togglingStatus}
                            >
                                {togglingStatus ? 'Disabling…' : 'Yes, Disable'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && <div className="as-toast">{toast}</div>}
        </div>
    );
}

function PasswordFormContent({
    onSave,
    onClose,
    showToast,
}: {
    onSave: (current: string, next: string) => Promise<void>;
    onClose: () => void;
    showToast: (msg: string) => void;
}) {
    const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!pwForm.current) return setError('Enter your current password');
        if (pwForm.next.length < 8) return setError('New password must be at least 8 characters');
        if (pwForm.next !== pwForm.confirm) return setError('Passwords do not match');

        setLoading(true);
        try {
            await onSave(pwForm.current, pwForm.next);
            showToast('Password updated successfully');
            onClose();
        } catch (err: any) {
            setError(err?.message || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="as-modal-body">
                <div className="as-modal-field">
                    <label>Current password</label>
                    <PasswordInput value={pwForm.current} onChange={(v) => setPwForm({ ...pwForm, current: v })} id="admin-cur" />
                </div>
                <div className="as-modal-field">
                    <label>New password</label>
                    <PasswordInput value={pwForm.next} onChange={(v) => setPwForm({ ...pwForm, next: v })} id="admin-nxt" />
                </div>
                <div className="as-modal-field">
                    <label>Confirm new password</label>
                    <PasswordInput value={pwForm.confirm} onChange={(v) => setPwForm({ ...pwForm, confirm: v })} id="admin-cfm" />
                </div>
                {error && <p className="as-modal-error">{error}</p>}
            </div>
            <div className="as-modal-actions">
                <button type="button" className="as-btn as-btn-discard" onClick={onClose}>
                    Cancel
                </button>
                <button type="submit" className="as-btn as-btn-save" disabled={loading}>
                    {loading ? 'Updating…' : 'Update Password'}
                </button>
            </div>
        </form>
    );
}