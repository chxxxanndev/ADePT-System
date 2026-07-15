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
        documentKey: 'tax-declaration',
        formSummary: {
            title: 'Declaration of Real Property',
            ownerName: 'Juan Dela Cruz',
            propertyIndexNumber: '050-21-0004-002-30',
            taxDeclarationNumber: '21-0004-00082',
            notes: ['Owner address: Purok 5, Gutalac, Zamboanga del Norte', 'Taxability: TAXABLE'],
        },
    },
    {
        controlNumber: 'LH-2026-020',
        declarantName: 'Juana Dela Cruz',
        documentType: 'Certificate of Property/Land Holding',
        amountDue: 120,
        dateRequested: '07/20/2026',
        status: 'Awaiting Payment',
        documentKey: 'certificate-land-holding',
        formSummary: {
            title: 'Certificate of Landholding',
            declarantName: 'Juana Dela Cruz',
            ownershipType: 'Single owner',
            properties: [
                { label: 'TD/ARP No.', value: '03-0004-00123' },
                { label: 'Location', value: 'Poblacion, Gutalac' },
                { label: 'Lot No.', value: '62-C' },
                { label: 'Assessed Value', value: 'PHP 250,000.00' },
            ],
        },
    },
    {
        controlNumber: 'NLH-2026-025',
        declarantName: 'Jose Dela Cruz',
        documentType: 'Certificate of No Property/No Land Holding',
        amountDue: 80,
        dateRequested: '07/23/2026',
        status: 'Awaiting Payment',
        documentKey: 'certificate-no-landholding',
        formSummary: {
            title: 'Certificate of No Landholding',
            declarantName: 'Jose Dela Cruz',
            pronoun: 'His',
            propertyCount: 'Singular',
            notes: ['No real property declared in his name per office records.'],
        },
    },
];

export function getPendingPaymentByControlNumber(
    controlNumber: string | undefined
): PendingPaymentRequest | undefined {
    if (!controlNumber) return undefined;
    return pendingPaymentData.find((payment) => payment.controlNumber === controlNumber);
}