import { api } from '../../users/services/requestService'; 

export async function updateProfile(fullName: string, username: string, position?: string, suffix?: string) {
    const res = await api.put('/account/profile', { fullName, username, position, suffix });

    const { data } = res.data;
    return data as { first_name: string; middle_initial: string | null; last_name: string; username: string; position: string | null; suffix: string | null };
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