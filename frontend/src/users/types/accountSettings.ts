export interface AccountSettingsFormData {
    fullName: string;
    username: string;
    email: string;
    position?: string;
    suffix?: string;
}

export const EMPTY_ACCOUNT_SETTINGS = (): AccountSettingsFormData => ({
    fullName: '',
    username: '',
    email: '',
    position: '',
    suffix: '',
});

export interface AccountUser {
    id: string;
    fullName: string;
    username: string;
    email: string;
    role: string;
    status: 'ACTIVE' | 'DISABLED' | 'PENDING_APPROVAL' | string; 
    avatarUrl?: string;
    lastPasswordChange?: string;
    position?: string;
    suffix?: string;
}