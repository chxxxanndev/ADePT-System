export type PaymentStatus = 'Awaiting Payment' | 'Paid' | 'Overdue';

export interface PendingPaymentRequest {
    controlNumber: string;
    declarantName: string;
    documentType: string;
    amountDue: number;
    dateRequested: string;
    status: PaymentStatus;
}