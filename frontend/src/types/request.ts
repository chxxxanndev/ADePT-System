export interface Municipality { id: string; name: string; }
export interface Barangay { id: string; name: string; municipality_id: string; }
export interface DocumentType { id: string; name: string; prefix: string; }
export interface Purpose { id: string; label: string; }

export interface RequestFormData {
    declarantName: string;
    requestDate: string;
    requestedByName: string;
    authRequired: boolean;
    purposeId: string;
    barangayId: string;
    documentTypeIds: string[];
    actionTaken: 'PENDING' | 'APPROVED' | 'DISAPPROVED';
}