// src/services/landholdingService.ts
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api/landholding';

export interface LandholdingPropertyRowPayload {
    tdArpNumber: string;
    locationOfProperty: string;
    lotNumber: string;
    titleNumber: string;
    area: string;
    assessedValue: string;
}

export interface SaveLandholdingCertificatePayload {
    requestId: string;
    declarantName: string;
    ownershipType: 'single' | 'multiple';
    propertyRows: LandholdingPropertyRowPayload[];
    dateGiven: string;
    givenAt: string;
    purpose: string;
    action: 'draft' | 'send_to_payment' | 'add_another';
}

export const landholdingService = {
    async saveCertificate(payload: SaveLandholdingCertificatePayload, staffAuthId: string) {
        const response = await axios.post(API_BASE_URL, { ...payload, staffAuthId });
        return response.data;
    },

    async getByRequestId(requestId: string) {
        const response = await axios.get(`${API_BASE_URL}/request/${requestId}`);
        return response.data;
    },
};