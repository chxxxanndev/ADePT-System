import { api } from './requestService'; 

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
    signatoryTopSpacing?: number;
    signatoryGapSpacing?: number;
    receiptBottomPosition?: number;
    receiptLeftPosition?: number;
    receiptRowSpacing?: number;
    action: 'draft' | 'send_to_payment' | 'add_another';
}

export interface LandholdingCertificateResponse {
    id: string;
    request_id: string;
    declarant_name: string;
    ownership_type: 'single' | 'multiple';
    date_given: string;
    given_at: string;
    purpose: string;
    status: string;
    signatory_top_spacing?: number;
    signatory_gap_spacing?: number;
    receipt_bottom_position?: number;
    receipt_left_position?: number;
    receipt_row_spacing?: number;
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

    async saveCertificate(payload: SaveLandholdingCertificatePayload, staffAuthId: string) {
        const response = await api.post('/landholding', { ...payload, staffAuthId });
        return response.data;
    },

    async getById(id: string): Promise<LandholdingCertificateResponse> {
        const response = await api.get(`/landholding/${id}`);
        return response.data;
    },

    async getByRequestId(requestId: string): Promise<LandholdingCertificateResponse> {
        const response = await api.get(`/landholding/request/${requestId}`);
        return response.data;
    },

    async updateDraft(id: string, updateData: any) {
        const response = await api.put(`/landholding/${id}/edit-draft`, updateData);
        return response.data;
    },
};