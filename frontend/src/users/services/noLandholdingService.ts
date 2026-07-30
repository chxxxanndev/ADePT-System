// src/services/noLandholdingService.ts
import { api } from './requestService'; // Import the smart, protected api

export const noLandholdingService = {
    /**
     * POST /api/nolandholding
     */
    async saveCertificate(payload: any, staffAuthId: string) {
        // Use the central 'api' and relative path
        const response = await api.post('/nolandholding', { ...payload, staffAuthId });
        return response.data;
    },

    /**
     * GET /api/nolandholding/request/:requestId
     */
    async getByRequestId(requestId: string) {
        const response = await api.get(`/nolandholding/request/${requestId}`);
        return response.data;
    },

    /**
     * PUT /api/nolandholding/:id/edit-draft
     */
    async updateDraft(id: string, formData: any) {
        const response = await api.put(`/nolandholding/${id}/edit-draft`, formData);
        return response.data;
    }
};