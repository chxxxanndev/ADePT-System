import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000';

function authHeaders(extra: Record<string, string> = {}) {
    const token = localStorage.getItem('adept_token');
    return { Authorization: `Bearer ${token}`, ...extra };
}

// axios throws on non-2xx by default, so we just need to normalize the error message shape
function extractErrorMessage(err: unknown, fallback: string): string {
    if (axios.isAxiosError(err)) {
        return err.response?.data?.error || fallback;
    }
    return fallback;
}

export const accountService = {
    async updateProfile(fullName: string, username: string) {
        try {
            const res = await axios.put(
                `${API_BASE_URL}/api/account/profile`,
                { fullName, username },
                { headers: authHeaders({ 'Content-Type': 'application/json' }) }
            );
            return res.data;
        } catch (err) {
            throw new Error(extractErrorMessage(err, 'Failed to update profile.'));
        }
    },

    async uploadPhoto(file: File): Promise<string> {
        try {
            const formData = new FormData();
            formData.append('photo', file);

            const res = await axios.post(`${API_BASE_URL}/api/account/photo`, formData, {
                headers: authHeaders(), // let axios set the multipart boundary itself — don't set Content-Type manually
            });
            return res.data.avatarUrl as string;
        } catch (err) {
            throw new Error(extractErrorMessage(err, 'Failed to upload photo.'));
        }
    },

    async updateEmail(email: string) {
        try {
            const res = await axios.put(
                `${API_BASE_URL}/api/account/email`,
                { email },
                { headers: authHeaders({ 'Content-Type': 'application/json' }) }
            );
            return res.data;
        } catch (err) {
            throw new Error(extractErrorMessage(err, 'Failed to update email.'));
        }
    },

    async changePassword(currentPassword: string, newPassword: string) {
        try {
            const res = await axios.put(
                `${API_BASE_URL}/api/account/password`,
                { currentPassword, newPassword },
                { headers: authHeaders({ 'Content-Type': 'application/json' }) }
            );
            return res.data;
        } catch (err) {
            throw new Error(extractErrorMessage(err, 'Failed to update password.'));
        }
    },

    async setAccountStatus(disabled: boolean) {
        try {
            const res = await axios.patch(
                `${API_BASE_URL}/api/account/status`,
                { disabled },
                { headers: authHeaders({ 'Content-Type': 'application/json' }) }
            );
            return res.data;
        } catch (err) {
            throw new Error(extractErrorMessage(err, 'Failed to update account status.'));
        }
    },
};