export type PaymentStatus = 'Awaiting Payment' | 'Paid' | 'Overdue' | 'Pending Validation' | 'Voided';

export type PaymentDocumentKey = 'tax-declaration' | 'certificate-land-holding' | 'certificate-no-landholding';

export interface PendingPaymentRequest {
    id: string;
    controlNumber: string;
    declarant_name: string;
<<<<<<< HEAD
    declarant?: string;
    declarantName?: string;
    refNumber?: string;
=======
>>>>>>> main
    documentType: string;
    amountDue: number;
    dateRequested: string;
    status: PaymentStatus | string;
    documentKey?: PaymentDocumentKey;
    orNumber?: string;
    formSummary?: {
        title?: string;
        ownerName?: string;
        propertyIndexNumber?: string;
        taxDeclarationNumber?: string;
        declarant_name?: string;
        declarantName?: string;
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