import axios from 'axios';

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

// Shared axios instance — every call below goes through this, so the
// Authorization header is attached automatically instead of each method
// having to pass identity around by hand.
const api = axios.create({ baseURL: API_ROOT });

// services/requestService.ts

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('adept_token');
    if (token) {
        // Use .set for better compatibility with modern Axios
        config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

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