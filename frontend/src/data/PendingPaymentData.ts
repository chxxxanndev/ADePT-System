import type { PendingPaymentRequest } from '../types/PendingPayment';

// TODO: Remove this mock data once PendingPayment.tsx is wired up to the
// real API (see requestService.ts / taxDeclarationService.ts).
export const pendingPaymentData: PendingPaymentRequest[] = [
    {
        controlNumber: 'TD-2026-001',
        declarantName: 'Juan Dela Cruz',
        documentType: 'Certified True Tax Declaration',
        amountDue: 40,
        dateRequested: '07/16/2026',
        status: 'Awaiting Payment',
    },
    {
        controlNumber: 'LH-2026-020',
        declarantName: 'Juana Dela Cruz',
        documentType: 'Certificate of Property/Land Holding',
        amountDue: 120,
        dateRequested: '07/20/2026',
        status: 'Awaiting Payment',
    },
    {
        controlNumber: 'NLH-2026-025',
        declarantName: 'Jose Dela Cruz',
        documentType: 'Certificate of No Property/No Land Holding',
        amountDue: 80,
        dateRequested: '07/23/2026',
        status: 'Awaiting Payment',
    },
];

export function getPendingPaymentByControlNumber(
    controlNumber: string | undefined
): PendingPaymentRequest | undefined {
    if (!controlNumber) return undefined;
    return pendingPaymentData.find((payment) => payment.controlNumber === controlNumber);
}