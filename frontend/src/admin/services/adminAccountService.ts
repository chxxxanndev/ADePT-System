const API_BASE_URL = 'http://localhost:5000/api/account';

function authHeaders(extra: Record<string, string> = {}) {
    const token = localStorage.getItem('adept_token');
    return {
        ...extra,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

export async function updateProfile(fullName: string, username: string) {
    const res = await fetch(`${API_BASE_URL}/profile`, {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ fullName, username }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to update profile (${res.status})`);
    }
    const { data } = await res.json();
    return data as { first_name: string; last_name: string; username: string };
}

export async function uploadPhoto(file: File) {
    const formData = new FormData();
    formData.append('photo', file);

    const res = await fetch(`${API_BASE_URL}/photo`, {
        method: 'POST',
        headers: authHeaders(), // don't set Content-Type — browser sets the multipart boundary itself
        body: formData,
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to upload photo (${res.status})`);
    }
    const { avatarUrl } = await res.json();
    return avatarUrl as string;
}

export async function updateEmail(email: string) {
    const res = await fetch(`${API_BASE_URL}/email`, {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ email }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to update email (${res.status})`);
    }
    const { data } = await res.json();
    return data as { email: string };
}

export async function changePassword(currentPassword: string, newPassword: string) {
    const res = await fetch(`${API_BASE_URL}/password`, {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to change password (${res.status})`);
    }
    return await res.json();
}

export async function setAccountStatus(disabled: boolean) {
    const res = await fetch(`${API_BASE_URL}/status`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ disabled }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to update account status (${res.status})`);
    }
    const { data } = await res.json();
    return data as { account_status: 'ACTIVE' | 'DISABLED' };
}