// src/services/landholdingService.ts
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api/landholding';

// --- PAYLOAD TYPES (For Saving) ---
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

// --- RESPONSE TYPES (For Fetching/PDF Hydration) ---
export interface LandholdingCertificateResponse {
    id: string;
    request_id: string;
    declarant_name: string;
    ownership_type: 'single' | 'multiple';
    date_given: string;
    given_at: string;
    purpose: string;
    status: string;
    // Joined from the Requests table
    request?: {
        or_number: string;
        payment_date: string;
        authorized_signatory: string;
    };
    // Joined from the property_rows table
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
     * Saves a new record or draft
     */
    async saveCertificate(payload: SaveLandholdingCertificatePayload, staffAuthId: string) {
        const response = await axios.post(API_BASE_URL, { ...payload, staffAuthId });
        return response.data;
    },

    /**
     * GET /api/landholding/:id
     * Fetches full hydrated data by the Certificate ID
     */
    async getById(id: string): Promise<LandholdingCertificateResponse> {
        const response = await axios.get(`${API_BASE_URL}/${id}`);
        return response.data;
    },

    /**
     * GET /api/landholding/request/:requestId
     * Fetches data by the Request ID (used to check for existing drafts)
     */
    async getByRequestId(requestId: string): Promise<LandholdingCertificateResponse> {
        const response = await axios.get(`${API_BASE_URL}/request/${requestId}`);
        return response.data;
    },
};