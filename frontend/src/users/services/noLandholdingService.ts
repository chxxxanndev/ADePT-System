import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api/nolandholding';

export const noLandholdingService = {
    async saveCertificate(payload: any, staffAuthId: string) {
        const response = await axios.post(API_BASE_URL, { ...payload, staffAuthId });
        return response.data;
    },
    async getByRequestId(requestId: string) {
        const response = await axios.get(`${API_BASE_URL}/request/${requestId}`);
        return response.data;
    }
};