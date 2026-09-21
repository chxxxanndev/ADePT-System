import { api } from './requestService'; // Import the smart, protected api

export const noLandholdingService = {

    async saveCertificate(payload: any, staffAuthId: string) {
        const response = await api.post('/nolandholding', { ...payload, staffAuthId });
        return response.data;
    },

    async getByRequestId(requestId: string) {
        const response = await api.get(`/nolandholding/request/${requestId}`);
        return response.data;
    },

    async updateDraft(id: string, formData: any) {
        const response = await api.put(`/nolandholding/${id}/edit-draft`, formData);
        return response.data;
    }
};