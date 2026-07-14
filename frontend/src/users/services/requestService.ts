import axios from 'axios';

export interface RequestFormData {
    declarantName: string;
    requestDate: string;
    requestedByName: string;
    authRequired: boolean;
    purposeId: string;
    documentTypeIds: string[];
    actionTaken: string; // This is the property TypeScript is looking for
}

const API_BASE_URL = 'http://localhost:5000/api/requests';

export const requestService = {
    getMetadata: async () => {
        const response = await axios.get(`${API_BASE_URL}/metadata`);
        return response.data;
    },

    submitRequest: async (formData: RequestFormData, staffAuthId: string) => {
        const response = await axios.post(API_BASE_URL, {
            ...formData,
            staffAuthId
        });
        return response.data;
    }
};