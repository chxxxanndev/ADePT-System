// src/services/landholdingService.ts
import axios from 'axios';
import { supabase } from '../../lib/supabaseClient';

const API_BASE_URL = 'http://localhost:5000/api/landholding';

const api = axios.create({ baseURL: API_BASE_URL });

// Attach the current, live Supabase session token to every request —
// mirrors the interceptor pattern used in requestService.ts.
api.interceptors.request.use(async (config) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
        (config.headers as any).Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => Promise.reject(error));

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
        const response = await api.post('', { ...payload, staffAuthId });
        return response.data;
    },

    /**
     * GET /api/landholding/:id
     * Fetches full hydrated data by the Certificate ID
     */
    async getById(id: string): Promise<LandholdingCertificateResponse> {
        const response = await api.get(`/${id}`);
        return response.data;
    },

    /**
     * GET /api/landholding/request/:requestId
     * Fetches data by the Request ID (used to check for existing drafts)
     */
    async getByRequestId(requestId: string): Promise<LandholdingCertificateResponse> {
        const response = await api.get(`/request/${requestId}`);
        return response.data;
    },
    async updateDraft(id: string, updateData: any) {
        const response = await api.put(`/${id}/edit-draft`, updateData);
        return response.data;
    },
};