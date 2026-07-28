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
    const token = data.session?.access_token;
    if (token) {
        // Bypass strict AxiosHeaders type check by casting to any
        (config.headers as any).Authorization = `Bearer ${token}`;
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
};