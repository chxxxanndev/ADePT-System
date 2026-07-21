import { useState, useRef, useEffect } from 'react';
import type { AccountUser, AccountSettingsFormData } from '../types/accountSettings';
import { CameraIcon, EditPencilIcon, ShieldIcon } from '../components/icons';
import { PasswordInput } from '../../auth-folder/components/PasswordInput';
import '../styles/accountSettings.css';

interface AccountSettingsProps {
    user: AccountUser;
    onSave: (data: AccountSettingsFormData) => Promise<void> | void;
    onUpdateEmail: (newEmail: string) => Promise<void>;
    onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
    onChangePhoto: (file: File) => Promise<string>;
    onDisableAccount: (disabled: boolean) => Promise<void> | void;
}

function getInitials(fullName: string): string {
    return fullName.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}

const CloseIcon = () => (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18M6 6l12 12" />
    </svg>
);

export function AccountSettings({ user, onSave, onUpdateEmail, onChangePassword, onChangePhoto, onDisableAccount }: AccountSettingsProps) {
    // --- 1. STAGED PROFILE STATE (Requires Save Changes button) ---
    const [form, setForm] = useState({ fullName: user.fullName, username: user.username });
    const [saving, setSaving] = useState(false);
    const isDirty = form.fullName !== user.fullName || form.username !== user.username;

    // --- 2. INSTANT STATES (Updates immediately on click) ---
    const [avatarUrl, setAvatarUrl] = useState<string | undefined>(user.avatarUrl);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [emailDraft, setEmailDraft] = useState(user.email);
    const [isEditingEmail, setIsEditingEmail] = useState(false);
    const [emailSubmitting, setEmailSubmitting] = useState(false);
    const [accountDisabled, setAccountDisabled] = useState(user.status === 'disabled');
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

    // Save Name and Username
    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            await onSave({ ...form, email: user.email } as any);
            showToast('Profile updated successfully!');
        } catch (err: any) {
            showToast(err.message || 'Failed to update profile');
        } finally { setSaving(false); }
    };

    // Update Email
    const handleEmailUpdate = async () => {
        if (!isEditingEmail) { 
            setIsEditingEmail(true); 
            requestAnimationFrame(() => emailInputRef.current?.focus());
            return; 
        }
        setEmailSubmitting(true);
        try {
            await onUpdateEmail(emailDraft);
            setIsEditingEmail(false);
            showToast('Email updated successfully!');
        } catch (err: any) { showToast(err.message); } 
        finally { setEmailSubmitting(false); }
    };

    // Update Photo (FIXED: Shows Loading and Toast)
    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingPhoto(true);
        try {
            const newUrl = await onChangePhoto(file);
            setAvatarUrl(newUrl);
            showToast('Profile photo updated!');
        } catch (err: any) {
            showToast(err.message || 'Failed to upload photo');
        } finally {
            setUploadingPhoto(false);
            e.target.value = ''; 
        }
    };

    // Toggle Account Status
    const applyDisableStatus = async (next: boolean) => {
        setTogglingStatus(true);
        try {
            await onDisableAccount(next);
            setAccountDisabled(next);
            setShowDisableConfirmModal(false);
            showToast(next ? 'Account disabled' : 'Account re-enabled');
        } catch (err: any) { showToast(err.message); } 
        finally { setTogglingStatus(false); }
    };

    return (
        <div className="as-page">
            <div className="as-page-header">
                <h1 className="as-page-title">Account settings</h1>
                <span className="as-page-subtitle">Manage your profile, login details, and account security.</span>
            </div>

            {/* IDENTITY BANNER */}
            <div className="as-profile-banner">
                <div className="as-profile-identity">
                    <div className="as-avatar-circle">
                        {avatarUrl ? <img src={avatarUrl} alt="" /> : getInitials(user.fullName)}
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
                <button 
                    type="button" 
                    className="as-change-photo-btn" 
                    onClick={() => fileInputRef.current?.click()} 
                    disabled={uploadingPhoto}
                >
                    <CameraIcon /> {uploadingPhoto ? 'Uploading...' : 'Change Photo'}
                </button>
                <input ref={fileInputRef} type="file" hidden accept="image/*" onChange={handlePhotoChange} />
            </div>

            {/* SECTION 1: PUBLIC PROFILE (Staged) */}
            <section className="as-section">
                <div className="as-section-header">
                    <h2 className="as-section-title">Profile Information</h2>
                    <span className="as-section-subtitle">This is shown on your public profile.</span>
                </div>

                <div className="as-info-card">
                    <div className="as-field">
                        <label className="as-field-label">Full Name</label>
                        <div className="as-input-wrap">
                            <input className="as-input" value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} />
                        </div>
                    </div>
                    <div className="as-field">
                        <label className="as-field-label">Username</label>
                        <div className="as-input-wrap">
                            <input className="as-input" value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
                        </div>
                    </div>
                </div>

                {isDirty && (
                    <div className="as-card-actions" style={{ display: 'flex', marginTop: '16px' }}>
                        <button type="button" className="as-btn as-btn-discard" onClick={() => setForm({fullName: user.fullName, username: user.username})}>Discard Changes</button>
                        <button type="button" className="as-btn as-btn-save" onClick={handleSaveProfile} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
                    </div>
                )}
            </section>

            {/* SECTION 2: SECURITY (Instant) */}
            <section className="as-section">
                <div className="as-section-header"><h2 className="as-section-title">Security Settings</h2></div>
                <div className="as-info-card">
                    <div className="as-field">
                        <label className="as-field-label">Email</label>
                        <div className="as-field-row">
                            <div className="as-input-wrap">
                                <input ref={emailInputRef} className={`as-input ${!isEditingEmail ? 'as-input--locked' : ''}`} value={isEditingEmail ? emailDraft : user.email} readOnly={!isEditingEmail} onChange={e => setEmailDraft(e.target.value)} />
                            </div>
                            <button type="button" className="as-inline-btn" onClick={handleEmailUpdate} disabled={emailSubmitting}>
                                {isEditingEmail ? 'Update Email' : 'Update email'}
                            </button>
                        </div>
                    </div>
                    <div className="as-field">
                        <label className="as-field-label">Password</label>
                        <div className="as-field-row">
                            <div className="as-input-wrap">
                                <input className="as-input as-input--locked" type="password" value="••••••••" readOnly />
                            </div>
                            <button type="button" className="as-inline-btn" onClick={() => setShowPasswordModal(true)}>Change Password</button>
                        </div>
                    </div>
                </div>
            </section>

            <section className="as-section">
                <div className="as-status-row">
                    <div className="as-status-info">
                        <span className="as-status-label"><ShieldIcon /> Disable Account</span>
                        <p className="as-field-hint">Temporarily deactivate your profile and hide your data.</p>
                    </div>
                    <button 
                        type="button" 
                        className={`as-toggle ${accountDisabled ? 'is-on' : ''}`} 
                        onClick={() => accountDisabled ? applyDisableStatus(false) : setShowDisableConfirmModal(true)} 
                        disabled={togglingStatus}
                    >
                        <span className="as-toggle-knob" />
                    </button>
                            </div>
            </section>

            {/* PASSWORD MODAL */}
            {showPasswordModal && (
                <div className="as-modal-overlay" onClick={() => setShowPasswordModal(false)}>
                    <div className="as-modal" onClick={e => e.stopPropagation()} role="dialog">
                        <div className="as-modal-header">
                            <h3>Change Password</h3>
                            <button type="button" className="as-modal-close" onClick={() => setShowPasswordModal(false)}><CloseIcon /></button>
                        </div>
                        <PasswordFormContent onSave={onChangePassword} onClose={() => setShowPasswordModal(false)} showToast={showToast} />
                    </div>
                </div>
            )}

            {/* DISABLE CONFIRMATION MODAL */}
            {showDisableConfirmModal && (
                <div className="as-modal-overlay" onClick={() => setShowDisableConfirmModal(false)}>
                    <div className="as-modal" onClick={e => e.stopPropagation()}>
                        <div className="as-modal-header">
                            <h3>Disable Account</h3>
                            <button type="button" className="as-modal-close" onClick={() => setShowDisableConfirmModal(false)}><CloseIcon /></button>
                        </div>
                        <div className="as-modal-body">
                            <p>Are you sure you want to disable your account? You will be logged out immediately. You can log back in within 7 days to re-enable it.</p>
                        </div>
                        <div className="as-modal-actions">
                            <button type="button" className="as-btn as-btn-discard" onClick={() => setShowDisableConfirmModal(false)}>Cancel</button>
                            <button type="button" className="as-btn as-btn-save" onClick={() => applyDisableStatus(true)} disabled={togglingStatus}>
                                {togglingStatus ? 'Disabling...' : 'Yes, Disable'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && <div className="as-toast">{toast}</div>}
        </div>
    );
}

/**
 * Sub-component: Password Form
 * Features the Red Alert Box using your original CSS variable: as-modal-error
 */
function PasswordFormContent({ onSave, onClose, showToast }: { onSave: any, onClose: any, showToast: any }) {
    const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!pwForm.current) return setError("Enter your current password");
        if (pwForm.next.length < 8) return setError("New password must be at least 8 characters");
        if (pwForm.next !== pwForm.confirm) return setError("Passwords do not match");

        setLoading(true);
        try {
            await onSave(pwForm.current, pwForm.next);
            showToast("Password updated successfully");
            onClose();
        } catch (err: any) {
            setError(err.message || "Failed to update password");
        } finally { setLoading(false); }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="as-modal-body">
                <div className="as-modal-field">
                    <label>Current password</label>
                    <PasswordInput value={pwForm.current} onChange={v => setPwForm({...pwForm, current: v})} id="cur" />
                </div>
                <div className="as-modal-field">
                    <label>New password</label>
                    <PasswordInput value={pwForm.next} onChange={v => setPwForm({...pwForm, next: v})} id="nxt" />
                </div>
                <div className="as-modal-field">
                    <label>Confirm new password</label>
                    <PasswordInput value={pwForm.confirm} onChange={v => setPwForm({...pwForm, confirm: v})} id="cfm" />
                </div>
                {/* Error Box (Matches your original CSS variables) */}
                {error && <p className="as-modal-error">{error}</p>}
            </div>
            <div className="as-modal-actions">
                <button type="button" className="as-btn as-btn-discard" onClick={onClose}>Cancel</button>
                <button type="submit" className="as-btn as-btn-save" disabled={loading}>
                    {loading ? 'Updating…' : 'Update Password'}
                </button>
            </div>
        </form>
    );
}