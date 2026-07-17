// ============================================================
// Tax Declaration — TypeScript type definitions
// Province of Zamboanga del Norte, Office of the Provincial Assessor
// ============================================================

/** One row in the Kind of Property / Valuation table */
export interface AssessmentRow {
    id: string;                      // client-side uuid for React key
    kindOfProperty: string;          // e.g. "AGRICULTURAL"
    classificationId: string;        // lookup_values.id
    classificationLabel: string;     // e.g. "Coconut land"
    actualUseId: string;
    actualUseOtherText: string;
    area: string;
    areaUnit: 'HECTARE' | 'SQM';
    marketValue: string;
    assessmentLevel: string;         // percentage, e.g. "12"
    assessedValue: string;           // auto-calculated
}

/** The complete Tax Declaration form state */
export interface TaxDeclarationFormData {
    // — Property Reference (header) —
    taxDeclarationNumber: string;    // Assessment of Real Property No.
    propertyIndexNumber: string;     // Property Index No.
    arpNumber: string;               // This declaration cancels ARP No.
    effectivityYear: string;         // Tax Effectivity Year

    // — Owner —
    ownerName: string;
    ownerAddress: string;
    ownerTin: string;
    ownerTelephone: string;

    // — Administrator (optional) —
    administratorName: string;
    administratorAddress: string;
    administratorTin: string;
    administratorTelephone: string;

    // — Location —
    propertyStreet: string;
    barangayId: string;                // free text (until barangay lookup connected)
    municipalityId: string;            // free text
    province: string;                // fixed: Zamboanga del Norte

    // — Land Reference —
    octTctNumber: string;
    surveyNumber: string;
    lotNumber: string;
    blockNumber: string;

    // — Boundaries —
    boundaryNorth: string;
    boundarySouth: string;
    boundaryEast: string;
    boundaryWest: string;

    // — Kind of Property / Valuation table —
    assessmentRows: AssessmentRow[];

    // — Totals (computed) —
    totalMarketValue: number;
    totalAssessedValue: number;
    amountInWords: string;

    // — Classification —
    taxability: 'TAXABLE' | 'EXEMPT';

    // — Signatories & Certification —
    verifiedBy: string;              // Municipal Assessor name
    verifiedByTitle: string;         // Municipal Assessor or Provincial Assessor title
    memoranda: string;
    notes: string;

    // — Certified Copy section —
    certifiedCopyName: string;
    certifiedCopyTitle: string;
    certifiedCopyDesignation: string;
    certificationFee: string;
    orNumber: string;
    datePaid: string;
}

/** Data passed from RequestFormEntry after a successful save */
export interface CompletedEntryData {
    requestId: string;              // UUID of the saved request
    referenceNumber: string;        // e.g. REF-2026-0001
    declarantName: string;
    requestedByName: string;
    requestDate: string;
    purposeId: string;
    documentTypeIds: string[];
    actionTaken: string;
    authRequired: boolean;
    propertyLocation: string;
}

/** Default empty state for a new Tax Declaration form */
export const EMPTY_ASSESSMENT_ROW = (): AssessmentRow => ({
    id: crypto.randomUUID(),
    kindOfProperty: '',
    classificationId: '',
    classificationLabel: '',
    actualUseId: '',
    actualUseOtherText: '',
    area: '',
    areaUnit: 'HECTARE',
    marketValue: '',
    assessmentLevel: '',
    assessedValue: '',
});

export const EMPTY_TAX_DECLARATION = (): TaxDeclarationFormData => ({
    taxDeclarationNumber: '',
    propertyIndexNumber: '',
    arpNumber: '',
    effectivityYear: new Date().getFullYear().toString(),
    ownerName: '',
    ownerAddress: '',
    ownerTin: '',
    ownerTelephone: '',
    administratorName: '',
    administratorAddress: '',
    administratorTin: '',
    administratorTelephone: '',
    propertyStreet: '',
    barangayId: '',
    municipalityId: '',
    province: 'Zamboanga del Norte',
    octTctNumber: '',
    surveyNumber: '',
    lotNumber: '',
    blockNumber: '',
    boundaryNorth: '',
    boundarySouth: '',
    boundaryEast: '',
    boundaryWest: '',
    assessmentRows: [EMPTY_ASSESSMENT_ROW()],
    totalMarketValue: 0,
    totalAssessedValue: 0,
    amountInWords: '',
    taxability: 'TAXABLE',
    verifiedBy: '',
    verifiedByTitle: 'Municipal Assessor',
    memoranda: '',
    notes: '',
    certifiedCopyName: 'ENGR. FLORIPES R. BAEL, REA, REB',
    certifiedCopyTitle: 'Local Assessment Operations Officer IV',
    certifiedCopyDesignation: 'Authorized Signatory',
    certificationFee: '',
    orNumber: '',
    datePaid: '',
});
