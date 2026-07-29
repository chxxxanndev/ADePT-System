export interface Municipality { id: string; name: string; }
export interface Barangay { id: string; name: string; municipality_id: string; }
export interface DocumentType { id: string; name: string; prefix: string; }

export interface RequestFormData {
    declarantName: string;
    requestDate: string;
    requestedByName: string;
    authRequired: boolean;
    barangayId: string;
    documentTypeIds: string[];
    actionTaken: 'PENDING' | 'APPROVED' | 'DISAPPROVED';
}