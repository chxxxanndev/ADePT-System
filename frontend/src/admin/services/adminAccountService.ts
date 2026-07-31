import { api } from '../../users/services/requestService'; 

// We no longer need the hardcoded API_BASE_URL
// We no longer need the manual authHeaders function (the api interceptor handles this)

export async function updateProfile(fullName: string, username: string) {
    // api.put automatically adds /api/ and the Bearer token
    const res = await api.put('/account/profile', { fullName, username });
    
    // Axios returns the body in res.data
    const { data } = res.data;
    return data as { first_name: string; last_name: string; username: string };
}

export async function uploadPhoto(file: File) {
    const formData = new FormData();
    formData.append('photo', file);

    const res = await api.post('/account/photo', formData);
    
    const { avatarUrl } = res.data;
    return avatarUrl as string;
}

export async function updateEmail(email: string) {
    const res = await api.put('/account/email', { email });
    
    const { data } = res.data;
    return data as { email: string };
}

export async function changePassword(currentPassword: string, newPassword: string) {
    const res = await api.put('/account/password', { currentPassword, newPassword });
    return res.data;
}

export async function setAccountStatus(disabled: boolean) {
    const res = await api.patch('/account/status', { disabled });
    
    const { data } = res.data;
    return data as { account_status: 'ACTIVE' | 'DISABLED' };
}