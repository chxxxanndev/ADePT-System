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
    releasingStaffId?: string;
    releaseDate?: string;
    status?: string;
    propertyLocation?: string;
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
        const response = await axios.post(API_BASE_URL, {
            ...formData,
            staffAuthId,
        });
        return response.data;
    },
    updateRequest: async (id: string, formData: RequestFormData) => {
        const response = await axios.put(`${API_BASE_URL}/${id}`, formData);
        return response.data;
    },
    deleteRequest: async (id: string) => {
        const response = await axios.delete(`${API_BASE_URL}/${id}`);
        return response.data;
    }
};