export type PaymentStatus = 'Awaiting Payment' | 'Paid' | 'Overdue' | 'Pending Validation' | 'Voided';

export type PaymentDocumentKey = 'tax-declaration' | 'certificate-land-holding' | 'certificate-no-landholding';

export interface PendingPaymentRequest {
    controlNumber: string;
    declarant_name: string;
    documentType: string;
    amountDue: number;
    dateRequested: string;
    status: PaymentStatus;
    documentKey?: PaymentDocumentKey;
    orNumber?: string;
    formSummary?: {
        title?: string;
        ownerName?: string;
        propertyIndexNumber?: string;
        taxDeclarationNumber?: string;
        declarant_name?: string;
        ownershipType?: string;
        pronoun?: string;
        propertyCount?: string;
        properties?: Array<{
            label: string;
            value: string;
        }>;
        notes?: string[];
    };
}