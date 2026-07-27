import axios from 'axios';
import { supabase } from '../../auth-folder/services/supabaseClient'; // match the exact path used in useAuth.ts / useNotifications.ts

export interface RequestFormData {
    id?: string;
    declarantName: string;
    requestDate: string;
    requestedByName: string;
    authRequired: boolean;
    purposeId: string;
    documentTypeIds: string[];
    actionTaken: string;
    status?: string;
    referenceNumber?: string;
}

const API_ROOT = 'http://localhost:5000/api';

const api = axios.create({ baseURL: API_ROOT });

// Always pull the CURRENT, live session token from Supabase itself — not a
// stale copy written to localStorage once at login. Supabase auto-refreshes
// the session in the background; getSession() always reflects that, so this
// interceptor never sends an expired token again.
api.interceptors.request.use(async (config) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
        config.headers = config.headers ?? {};
        (config.headers as any)['Authorization'] = `Bearer ${token}`;
    }
    return config;
}, (error) => Promise.reject(error));

export const requestService = {
    getMetadata: async () => {
        const response = await api.get('/requests/metadata');
        return response.data;
    },

    getRequests: async () => {
        const response = await api.get('/requests');
        return response.data;
    },

    getRequestById: async (id: string) => {
        const response = await api.get(`/requests/${id}`);
        return response.data;
    },

    // NOTE: still unguarded on the backend (no requireAuth on POST /requests
    // yet) — staffAuthId is passed explicitly here because createRequest's
    // route hasn't been locked down like /forward and /:id have. Worth
    // revisiting once you get to hardening the rest of the routes.
    submitRequest: async (formData: RequestFormData, staffAuthId: string) => {
        const response = await api.post('/requests', { ...formData, staffAuthId });
        return response.data;
    },

    updateRequest: async (id: string, formData: any) => {
        const response = await api.put(`/requests/${id}`, formData);
        return response.data;
    },

    checkOrUniqueness: async (orNumber: string, currentRequestId?: string) => {
        const response = await api.get('/requests/check-or', {
            params: { orNumber, requestId: currentRequestId }
        });
        return response.data; // { isUnique: boolean, existingRequest?: object }
    },

    releaseRequest: async (id: string, paymentData: {
        orNumber: string;
        signatory: string;
        isOverridden?: boolean;
        justification?: string;
    }) => {
        const response = await api.post(`/requests/${id}/release`, paymentData);
        return response.data;
    },

    deleteRequest: async (id: string) => {
        const response = await api.delete(`/requests/${id}`);
        return response.data;
    },

    // Identity comes from the Bearer token now (via requireAuth on the
    // backend), so only recipientStaffId + note are sent — no actorAuthId.
    forwardRequest: async (requestId: string, recipientStaffId: string, note: string) => {
        const response = await api.post(`/requests/${requestId}/forward`, { recipientStaffId, note });
        return response.data;
    },

    getNotifications: async () => {
        const response = await api.get('/notifications');
        return response.data;
    },

    markNotificationRead: async (notificationId: string) => {
        const response = await api.patch(`/notifications/${notificationId}/read`);
        return response.data;
    },

    markAllNotificationsRead: async () => {
        const response = await api.patch('/notifications/mark-all-read');
        return response.data;
    },
};