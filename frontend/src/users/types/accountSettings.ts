export interface AccountSettingsFormData {
    fullName: string;
    username: string;
    email: string;
}

export const EMPTY_ACCOUNT_SETTINGS = (): AccountSettingsFormData => ({
    fullName: '',
    username: '',
    email: '',
});

export interface AccountUser {
    id: string;
    fullName: string;
    username: string;
    email: string;
    role: string;
    avatarUrl?: string;
    lastPasswordChange?: string;
}