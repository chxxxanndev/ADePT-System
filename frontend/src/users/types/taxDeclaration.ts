// One row in the Kind of Property / Valuation table 
export interface AssessmentRow {
    id: string;                      // client-side uuid for React key
    kindOfProperty: string;          // e.g. "AGRICULTURAL"
    classificationId: string;        // lookup_values.id
    classificationLabel: string;     // e.g. "Coconut land"
    actualUseId: string;
    actualUseOtherText: string;
    area: string;
    areaUnit: 'has.' | 'sqm.';
    marketValue: string;
    assessmentLevel: string;         // percentage, e.g. "12"
    assessedValue: string;           // auto-calculated
}

// The complete Tax Declaration form state 
export interface TaxDeclarationFormData {
    taxDeclarationNumber: string;    // Assessment of Real Property No.
    propertyIndexNumber: string;     // Property Index No.
    arpNumber: string;               // This declaration cancels ARP No.
    effectivityYear: string;         // Tax Effectivity Year

    ownerName: string;
    ownerAddress: string;
    ownerTin: string;
    ownerTelephone: string;

    administratorName: string;
    administratorAddress: string;
    administratorTin: string;
    administratorTelephone: string;

    propertyStreet: string;
    barangayId: string;                // free text (until barangay lookup connected)
    municipalityId: string;            // free text
    // Resolved display names — present on the quick-edit modal's payload
    // (getTaxDeclaration translates the FK to `barangay` / `municipality`
    // name strings, which taxDeclarationService.save sends back so the
    // backend can re-resolve them to ids).
    barangay?: string;
    municipality?: string;
    province: string;                // fixed: Zamboanga del Norte

    octTctNumber: string;
    surveyNumber: string;
    lotNumber: string;
    blockNumber: string;

    boundaryNorth: string;
    boundarySouth: string;
    boundaryEast: string;
    boundaryWest: string;

    assessmentRows: AssessmentRow[];

    // — Total Land Area (document-level; separate from the per-row `area`
    //   on each AssessmentRow) — shown as its own single, non-addable
    //   field + unit dropdown, no longer part of the assessment table.
    area: string;
    areaUnit: 'has.' | 'sqm.';

    totalMarketValue: number;
    totalAssessedValue: number;
    amountInWords: string;

    taxability: 'TAXABLE' | 'EXEMPT';

    verifiedBy: string;              // NOTE: reserved for Document Release Panel signatory wiring — not used by the TD form.
    verifiedByTitle: string;         // NOTE: reserved for Document Release Panel signatory wiring — not used by the TD form.
    // Municipal/Provincial Assessor who signs the Declaration of Real Property.
    // Free text — depends on whichever assessor is on record for the property's
    // municipality (or the Provincial Assessor, in some cases). Encoded manually.
    assessorName: string;
    assessorTitle: string;           // e.g. "Municipal Assessor" or "Provincial Assessor"
    memoranda: string;
    notes: string;

    certifiedCopyName: string;
    certifiedCopyTitle: string;
    certifiedCopyDesignation: string;
    certificationFee: string;
    orNumber: string;
    datePaid: string;
}

// Data passed from RequestFormEntry after a successful save 
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
    amendedFromReference?: string;
}

export const EMPTY_ASSESSMENT_ROW = (): AssessmentRow => ({
    id: crypto.randomUUID(),
    kindOfProperty: '',
    classificationId: '',
    classificationLabel: '',
    actualUseId: '',
    actualUseOtherText: '',
    area: '',
    areaUnit: 'has.',
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
    area: '',
    areaUnit: 'has.',
    totalMarketValue: 0,
    totalAssessedValue: 0,
    amountInWords: '',
    taxability: 'TAXABLE',
    verifiedBy: '',
    verifiedByTitle: 'Municipal Assessor',
    assessorName: '',
    assessorTitle: 'Municipal Assessor',
    memoranda: '',
    notes: '',
    certifiedCopyName: 'ENGR. FLORIPES R. BAEL, REA, REB',
    certifiedCopyTitle: 'Local Assessment Operations Officer IV',
    certifiedCopyDesignation: 'Authorized Signatory',
    certificationFee: '',
    orNumber: '',
    datePaid: '',
});