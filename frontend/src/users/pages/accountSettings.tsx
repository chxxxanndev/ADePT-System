import { useState, useRef, useEffect } from 'react';
import type { AccountUser, AccountSettingsFormData } from '../types/accountSettings';
import { CameraIcon, EditPencilIcon, ShieldIcon } from '../components/icons';
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

const CloseIcon = ({ size = 18 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18M6 6l12 12" />
    </svg>
);

const CheckIcon = ({ size = 15 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
    </svg>
);

type EditableField = 'fullName' | 'username';

export function AccountSettings({ user, onSave, onUpdateEmail, onChangePassword, onChangePhoto, onDisableAccount }: AccountSettingsProps) {
    const [form, setForm] = useState<AccountSettingsFormData>({ fullName: user.fullName, username: user.username, email: user.email });
    const [avatarUrl, setAvatarUrl] = useState<string | undefined>(user.avatarUrl);
    const [saving, setSaving] = useState(false);
    const [accountDisabled, setAccountDisabled] = useState(false);
    const [togglingStatus, setTogglingStatus] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    const [editingField, setEditingField] = useState<EditableField | null>(null);
    const fullNameInputRef = useRef<HTMLInputElement | null>(null);
    const usernameInputRef = useRef<HTMLInputElement | null>(null);

    const [isEditingEmail, setIsEditingEmail] = useState(false);
    const [emailDraft, setEmailDraft] = useState(form.email);
    const [emailSubmitting, setEmailSubmitting] = useState(false);
    const emailInputRef = useRef<HTMLInputElement | null>(null);

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [passwordSubmitting, setPasswordSubmitting] = useState(false);

    const showToast = (message: string) => {
        setToast(message);
        window.setTimeout(() => setToast(null), 2500);
    };

    useEffect(() => {
        if (!showPasswordModal) return;
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowPasswordModal(false); };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [showPasswordModal]);

    const set = (field: keyof AccountSettingsFormData, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

    const isDirty = form.fullName !== user.fullName || form.username !== user.username;

    const handleDiscard = () => {
        setForm({ fullName: user.fullName, username: user.username, email: user.email });
        setEditingField(null);
        setIsEditingEmail(false);
        showToast('Changes discarded');
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(form);
            showToast('Profile updated');
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to update profile');
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
            showToast(next ? 'Account disabled' : 'Account re-enabled');
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to update account status');
        } finally {
            setTogglingStatus(false);
        }
    };

    const handleEditField = (field: EditableField) => {
        if (editingField === field) { setEditingField(null); return; }
        setEditingField(field);
        requestAnimationFrame(() => {
            const ref = field === 'fullName' ? fullNameInputRef : usernameInputRef;
            ref.current?.focus();
            ref.current?.select();
        });
    };

    const handleFieldKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') { e.currentTarget.blur(); setEditingField(null); }
    };

    const handleChangePhotoClick = () => { fileInputRef.current?.click(); };

    const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (!file.type.startsWith('image/')) { showToast('Please select an image file'); return; }
        if (file.size > 5 * 1024 * 1024) { showToast('Image must be smaller than 5MB'); return; }

        setUploadingPhoto(true);
        try {
            const newUrl = await onChangePhoto(file);
            setAvatarUrl(newUrl);
            showToast('Photo updated');
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to upload photo');
        } finally {
            setUploadingPhoto(false);
        }
    };

    const handleEmailButtonClick = async () => {
        if (!isEditingEmail) {
            setEmailDraft(form.email);
            setIsEditingEmail(true);
            requestAnimationFrame(() => { emailInputRef.current?.focus(); emailInputRef.current?.select(); });
            return;
        }
        const trimmed = emailDraft.trim();
        const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
        if (!isValidEmail) { showToast('Enter a valid email address'); return; }

        setEmailSubmitting(true);
        try {
            await onUpdateEmail(trimmed);
            set('email', trimmed);
            setIsEditingEmail(false);
            showToast(`Email updated to ${trimmed}`);
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to update email');
        } finally {
            setEmailSubmitting(false);
        }
    };

    const handleCancelEmailEdit = () => { setEmailDraft(form.email); setIsEditingEmail(false); };

    const openPasswordModal = () => {
        setPasswordForm({ current: '', next: '', confirm: '' });
        setPasswordError(null);
        setShowPasswordModal(true);
    };
    const closePasswordModal = () => setShowPasswordModal(false);

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!passwordForm.current) { setPasswordError('Enter your current password'); return; }
        if (passwordForm.next.length < 8) { setPasswordError('New password must be at least 8 characters'); return; }
        if (passwordForm.next !== passwordForm.confirm) { setPasswordError('New password and confirmation do not match'); return; }

        setPasswordSubmitting(true);
        setPasswordError(null);
        try {
            await onChangePassword(passwordForm.current, passwordForm.next);
            setShowPasswordModal(false);
            showToast('Password updated successfully');
        } catch (err) {
            setPasswordError(err instanceof Error ? err.message : 'Failed to update password');
        } finally {
            setPasswordSubmitting(false);
        }
    };

    const displayedAvatar = avatarUrl;

    return (
        <div className="as-page">
            <div className="as-page-header">
                <h1 className="as-page-title">Account settings</h1>
                <span className="as-page-subtitle">Manage your profile, login details, and account security.</span>
            </div>

            <div className="as-profile-banner">
                <div className="as-profile-identity">
                    <div className="as-avatar-circle">
                        {displayedAvatar ? <img src={displayedAvatar} alt={user.fullName} /> : getInitials(user.fullName)}
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
                <button type="button" className="as-change-photo-btn" onClick={handleChangePhotoClick} disabled={uploadingPhoto}>
                    <CameraIcon />
                    {uploadingPhoto ? 'Uploading…' : 'Change Photo'}
                </button>
                <input id="profile-photo-upload" name="profile-photo-upload" ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoFileChange} style={{ display: 'none' }} />
            </div>

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
                                id="as-full-name" ref={fullNameInputRef} className="as-input as-input--editable-lock"
                                placeholder="e.g. Juan Dela Cruz" value={form.fullName}
                                readOnly={editingField !== 'fullName'} onChange={(e) => set('fullName', e.target.value)}
                                onBlur={() => setEditingField(null)} onKeyDown={handleFieldKeyDown}
                            />
                            <button type="button" className={`as-input-edit-btn ${editingField === 'fullName' ? 'is-active' : ''}`}
                                onMouseDown={(e) => e.preventDefault()} onClick={() => handleEditField('fullName')}
                                aria-label={editingField === 'fullName' ? 'Lock full name' : 'Edit full name'}>
                                {editingField === 'fullName' ? <CheckIcon /> : <EditPencilIcon />}
                            </button>
                        </div>
                    </div>

                    <div className="as-field">
                        <label className="as-field-label" htmlFor="as-username">Username</label>
                        <div className="as-input-wrap">
                            <input
                                id="as-username" ref={usernameInputRef} className="as-input as-input--editable-lock"
                                placeholder="e.g. Ju-An" value={form.username}
                                readOnly={editingField !== 'username'} onChange={(e) => set('username', e.target.value)}
                                onBlur={() => setEditingField(null)} onKeyDown={handleFieldKeyDown}
                            />
                            <button type="button" className={`as-input-edit-btn ${editingField === 'username' ? 'is-active' : ''}`}
                                onMouseDown={(e) => e.preventDefault()} onClick={() => handleEditField('username')}
                                aria-label={editingField === 'username' ? 'Lock username' : 'Edit username'}>
                                {editingField === 'username' ? <CheckIcon /> : <EditPencilIcon />}
                            </button>
                        </div>
                        <span className="as-field-hint">Used for login and your public profile URL.</span>
                    </div>

                    <div className="as-field">
                        <label className="as-field-label" htmlFor="as-email">Email</label>
                        <div className="as-field-row">
                            <div className="as-input-wrap">
                                <input
                                    id="as-email" ref={emailInputRef} className="as-input as-input--editable-lock"
                                    placeholder="e.g. Juan@gmail.com" value={isEditingEmail ? emailDraft : form.email}
                                    readOnly={!isEditingEmail} onChange={(e) => setEmailDraft(e.target.value)}
                                />
                            </div>
                            {isEditingEmail ? (
                                <div className="as-inline-btn-group">
                                    <button type="button" className="as-inline-btn as-inline-btn--ghost" onClick={handleCancelEmailEdit} disabled={emailSubmitting}>Cancel</button>
                                    <button type="button" className="as-inline-btn" onClick={handleEmailButtonClick} disabled={emailSubmitting}>
                                        {emailSubmitting ? 'Updating…' : 'Update Email'}
                                    </button>
                                </div>
                            ) : (
                                <button type="button" className="as-inline-btn" onClick={handleEmailButtonClick}>Update email</button>
                            )}
                        </div>
                    </div>

                    <div className="as-field">
                        <label className="as-field-label" htmlFor="as-password">Password</label>
                        <div className="as-field-row">
                            <div className="as-input-wrap">
                                <input id="as-password" className="as-input" type="password" readOnly value="••••••••" />
                            </div>
                            <button type="button" className="as-inline-btn" onClick={openPasswordModal}>Change Password</button>
                        </div>
                        {user.lastPasswordChange && <span className="as-field-footnote">last changed {user.lastPasswordChange}</span>}
                    </div>
                </div>

                <div className="as-card-actions" style={{ marginTop: 16 }}>
                    <button type="button" className="as-btn as-btn-discard" onClick={handleDiscard} disabled={!isDirty || saving}>Discard Changes</button>
                    <button type="button" className="as-btn as-btn-save" onClick={handleSave} disabled={!isDirty || saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
                </div>
            </div>

            <div>
                <div className="as-section-header">
                    <h2 className="as-section-title">Account Status</h2>
                </div>
                <div className="as-status-row">
                    <span className="as-status-label"><ShieldIcon />Disable Account</span>
                    <button type="button" className={`as-toggle ${accountDisabled ? 'is-on' : ''}`} onClick={handleToggleDisable} disabled={togglingStatus} aria-pressed={accountDisabled} aria-label="Disable account">
                        <span className="as-toggle-knob" />
                    </button>
                </div>
                {accountDisabled && (
                    <div className="as-status-warning">
                        Your account is disabled. You have 7 days to log back in to automatically re-enable it, after which an administrator will need to restore it.
                    </div>
                )}
            </div>

            {toast && <div className="as-toast">{toast}</div>}

            {showPasswordModal && (
                <div className="as-modal-overlay" onClick={closePasswordModal}>
                    <div className="as-modal" role="dialog" aria-modal="true" aria-labelledby="as-password-modal-title" onClick={(e) => e.stopPropagation()}>
                        <div className="as-modal-header">
                            <h3 id="as-password-modal-title">Change Password</h3>
                            <button type="button" className="as-modal-close" onClick={closePasswordModal} aria-label="Close"><CloseIcon /></button>
                        </div>
                        <form onSubmit={handlePasswordSubmit}>
                            <div className="as-modal-body">
                                <div className="as-modal-field">
                                    <label htmlFor="as-current-password">Current password</label>
                                    <input id="as-current-password" type="password" value={passwordForm.current} onChange={(e) => setPasswordForm((f) => ({ ...f, current: e.target.value }))} autoFocus />
                                </div>
                                <div className="as-modal-field">
                                    <label htmlFor="as-new-password">New password</label>
                                    <input id="as-new-password" type="password" value={passwordForm.next} onChange={(e) => setPasswordForm((f) => ({ ...f, next: e.target.value }))} />
                                </div>
                                <div className="as-modal-field">
                                    <label htmlFor="as-confirm-password">Confirm new password</label>
                                    <input id="as-confirm-password" type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm((f) => ({ ...f, confirm: e.target.value }))} />
                                </div>
                                {passwordError && <p className="as-modal-error">{passwordError}</p>}
                            </div>
                            <div className="as-modal-actions">
                                <button type="button" className="as-btn as-btn-discard" onClick={closePasswordModal} disabled={passwordSubmitting}>Cancel</button>
                                <button type="submit" className="as-btn as-btn-save" disabled={passwordSubmitting}>{passwordSubmitting ? 'Updating…' : 'Update Password'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}