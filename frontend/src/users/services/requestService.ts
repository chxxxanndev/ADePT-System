import axios from 'axios';
import { supabase } from '../../lib/supabaseClient';

export interface RequestFormData {
    id?: string;
    declarantName: string;
    requestDate: string;
    requestedByName: string;
    authRequired: boolean;
    documentTypeIds: string[];
    actionTaken: string;
    status?: string;
    referenceNumber?: string;
    propertyLocation?: string;
}

export const DEFAULT_DOC_TYPES = [
    { id: 'dt1', name: 'Tax Declaration', prefix: 'TD' },
    { id: 'dt2', name: 'Certificate of Landholding', prefix: 'LH' },
    { id: 'dt3', name: 'Certificate of No Landholding', prefix: 'NLH' },
];

const API_ROOT = 'http://localhost:5000/api';

const api = axios.create({ baseURL: API_ROOT });

// Always pull the CURRENT, live session token from sessionStorage or Supabase
api.interceptors.request.use(async (config) => {
    let token = sessionStorage.getItem('adept_token');
    if (!token) {
        const { data } = await supabase.auth.getSession();
        token = data.session?.access_token || null;
    }
    if (token) {
        // Bypass strict AxiosHeaders type check by casting to any
        (config.headers as any).Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => Promise.reject(error));

export const requestService = {
    getMetadata: async () => {
        try {
            const response = await api.get('/requests/metadata');
            const data = response.data || {};
            if (!Array.isArray(data.docTypes) || data.docTypes.length === 0) {
                data.docTypes = DEFAULT_DOC_TYPES;
            }
            return data;
        } catch (error) {
            console.warn('Metadata fetch failed, falling back to default document types:', error);
            return {
                municipalities: [],
                barangays: [],
                docTypes: DEFAULT_DOC_TYPES,
                staff: [],
                classifications: [],
                propertyTypes: [],
            };
        }
    },

    getRequests: async () => {
        try {
            const response = await api.get('/requests');
            return response.data || [];
        } catch (error) {
            console.warn('Failed to fetch requests from server:', error);
            return [];
        }
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