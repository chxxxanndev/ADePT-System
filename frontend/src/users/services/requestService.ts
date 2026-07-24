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

const API_BASE_URL = 'http://localhost:5000/api/requests';

export const requestService = {
    getMetadata: async () => {
        const response = await axios.get(`${API_BASE_URL}/metadata`);
        return response.data;
    },
    getRequests: async () => {
        const response = await axios.get(API_BASE_URL);
        return response.data;
    },
    submitRequest: async (formData: RequestFormData, staffAuthId: string) => {
        const response = await axios.post(API_BASE_URL, { ...formData, staffAuthId });
        return response.data;
    },
    updateRequest: async (id: string, formData: any) => {
        const response = await axios.put(`${API_BASE_URL}/${id}`, formData);
        return response.data;
    },
    checkOrUniqueness: async (orNumber: string, currentRequestId?: string) => {
        const response = await axios.get(`${API_BASE_URL}/check-or`, {
            params: { orNumber, requestId: currentRequestId }
        });
        return response.data; // returns { isUnique: boolean, existingRequest?: object }
    },
    releaseRequest: async (id: string, paymentData: {
        orNumber: string;
        signatory: string;
        isOverridden?: boolean;
        justification?: string;
    }) => {
        const response = await axios.post(`${API_BASE_URL}/${id}/release`, paymentData);
        return response.data;
    },
    deleteRequest: async (id: string) => {
        const response = await axios.delete(`${API_BASE_URL}/${id}`);
        return response.data;
    }
};