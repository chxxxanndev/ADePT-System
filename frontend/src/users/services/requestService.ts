import axios from 'axios';
import { supabase } from '../../lib/supabaseClient';
import { API_ROOT } from '../../config'; // Import the central config we made

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

// We add /api here because your routes below start with /requests
const BASE_URL = `${API_ROOT}/api`; 

export const api = axios.create({ baseURL: BASE_URL });

// 1. REQUEST INTERCEPTOR (Stops the 401)
api.interceptors.request.use(async (config) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
        const source = axios.CancelToken.source();
        config.cancelToken = source.token;
        // We use a specific string 'SILENT_CANCEL'
        source.cancel('SILENT_CANCEL'); 
        return config;
    }

    if (token) {
        (config.headers as any).Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => Promise.reject(error));

// 2. RESPONSE INTERCEPTOR (Stops the Red CanceledError text)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // If the error is our 'SILENT_CANCEL', we return a promise that 
        // never resolves. This makes the error vanish from the console.
        if (axios.isCancel(error) && error.message === 'SILENT_CANCEL') {
            return new Promise(() => {}); 
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