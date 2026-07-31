import axios from 'axios';
import { supabase } from '../../lib/supabaseClient';

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
    propertyLocation?: string;
    purposeOtherText?: string;
}

const API_ROOT = 'http://localhost:5000/api';

const api = axios.create({ baseURL: API_ROOT });

// Always pull the CURRENT, live session token from Supabase itself
api.interceptors.request.use(async (config) => {
    const { data } = await supabase.auth.getSession();
    console.log('[DEBUG interceptor]', config.url, '| session exists:', !!data.session);
    const token = data.session?.access_token;
    if (token) {
        (config.headers as any).Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => Promise.reject(error));

// NEW — on first load, Supabase may still be hydrating the session from
// storage when a request goes out, so it can leave with no token and get
// a 401 even though the user IS logged in. This retries such a request
// exactly once, after re-checking for a session, instead of surfacing the
// error to the UI (which is why "Retry" always fixed it manually before).
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const { data } = await supabase.auth.getSession();
                const token = data.session?.access_token;
                if (token) {
                    originalRequest.headers = originalRequest.headers || {};
                    (originalRequest.headers as any).Authorization = `Bearer ${token}`;
                    return api(originalRequest);
                }
            } catch (refreshErr) {
                console.error('Session retry failed', refreshErr);
            }
        }
        return Promise.reject(error);
    }
);

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

    submitRequest: async (formData: RequestFormData, staffAuthId: string) => {
        const response = await api.post('/requests', { ...formData, staffAuthId });
        return response.data;
    },

    updateRequest: async (id: string, formData: Partial<RequestFormData>) => {
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
        signatory?: string;
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
    markAsReleased: async (id: string, releasedBy: string) => {
        const response = await api.patch(`/requests/${id}/mark-released`, { releasedBy });
        return response.data;
    },
};