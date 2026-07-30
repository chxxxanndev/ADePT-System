// src/services/landholdingService.ts
import { api } from './requestService'; // Import the smart, protected api

// --- PAYLOAD TYPES (Keep these as they are) ---
export interface LandholdingPropertyRowPayload {
    tdArpNumber: string;
    locationOfProperty: string;
    lotNumber: string;
    titleNumber: string;
    area: string;
    assessedValue: number | string;
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

// --- RESPONSE TYPES (Keep these as they are) ---
export interface LandholdingCertificateResponse {
    id: string;
    request_id: string;
    declarant_name: string;
    ownership_type: 'single' | 'multiple';
    date_given: string;
    given_at: string;
    purpose: string;
    status: string;
    request?: {
        or_number: string;
        payment_date: string;
        authorized_signatory: string;
    };
    properties: Array<{
        td_arp_number: string;
        location_of_property: string;
        lot_number: string;
        title_number: string;
        area: string;
        assessed_value: number;
    }>;
}

export const landholdingService = {
    /**
     * POST /api/landholding
     */
    async saveCertificate(payload: SaveLandholdingCertificatePayload, staffAuthId: string) {
        // We add '/landholding' because the central 'api' starts at '/api'
        const response = await api.post('/landholding', { ...payload, staffAuthId });
        return response.data;
    },

    /**
     * GET /api/landholding/:id
     */
    async getById(id: string): Promise<LandholdingCertificateResponse> {
        const response = await api.get(`/landholding/${id}`);
        return response.data;
    },

    /**
     * GET /api/landholding/request/:requestId
     */
    async getByRequestId(requestId: string): Promise<LandholdingCertificateResponse> {
        const response = await api.get(`/landholding/request/${requestId}`);
        return response.data;
    },

    async updateDraft(id: string, updateData: any) {
        const response = await api.put(`/landholding/${id}/edit-draft`, updateData);
        return response.data;
    },
};