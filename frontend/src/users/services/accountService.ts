import axios from 'axios';
import { api } from './requestService'; // Import the smart 'api' you just verified

// We keep your teammate's error extraction logic exactly as she wrote it
function extractErrorMessage(err: unknown, fallback: string): string {
    if (axios.isAxiosError(err)) {
        return err.response?.data?.error || fallback;
    }
    return fallback;
}

export const accountService = {
    async updateProfile(fullName: string, username: string) {
        try {
            // We use 'api'. It handles the URL and the Auth headers automatically.
            const res = await api.put('/account/profile', { fullName, username });
            return res.data;
        } catch (err) {
            throw new Error(extractErrorMessage(err, 'Failed to update profile.'));
        }
    },

    async uploadPhoto(file: File): Promise<string> {
        try {
            const formData = new FormData();
            formData.append('photo', file);

            // 'api' handles the multipart boundary automatically
            const res = await api.post('/account/photo', formData);
            return res.data.avatarUrl as string;
        } catch (err) {
            throw new Error(extractErrorMessage(err, 'Failed to upload photo.'));
        }
    },

    async updateEmail(email: string) {
        try {
            const res = await api.put('/account/email', { email });
            return res.data;
        } catch (err) {
            throw new Error(extractErrorMessage(err, 'Failed to update email.'));
        }
    },

    async changePassword(currentPassword: string, newPassword: string) {
        try {
            const res = await api.put('/account/password', { currentPassword, newPassword });
            return res.data;
        } catch (err) {
            // Updated to match teammate's fallback message
            throw new Error(extractErrorMessage(err, 'Failed to change password.'));
        }
    },

    async setAccountStatus(disabled: boolean) {
        try {
            const res = await api.patch('/account/status', { disabled });
            return res.data;
        } catch (err) {
            throw new Error(extractErrorMessage(err, 'Failed to update account status.'));
        }
    },
};