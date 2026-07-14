// ============================================================
// Certificate of Landholding — TypeScript type definitions
// Province of Zamboanga del Norte, Office of the Provincial Assessor
// ============================================================

/** One property row in the Certificate of Landholding table */
export interface LandholdingPropertyRow {
    id: string;                  // client-side uuid for React key
    tdArpNumber: string;         // TD/ARP No. e.g. "03-0004-00053"
    locationOfProperty: string;  // e.g. "Banganon, Gutalac, ZN"
    lotNumber: string;           // e.g. "62-C"
    titleNumber: string;         // e.g. "T-798"
    area: string;                // e.g. "1.9999 has."
    assessedValue: string;       // e.g. "34050.00"
}

/** Ownership wording selector */
export type OwnershipType =
    | 'single'     // "is/are the declared owner/s of real property/properties"
    | 'multiple';  // same phrasing, just multiple rows

/** The complete Certificate of Landholding form state */
export interface LandholdingFormData {
    // — Declarant —
    declarantName: string;       // "WILFREDO SALMORIN"
    ownershipType: OwnershipType;

    // — Properties table —
    propertyRows: LandholdingPropertyRow[];

    // — Certification Details —
    dateGiven: string;           // ISO date  e.g. "2026-06-29"
    givenAt: string;             // e.g. "Dipolog City"
    purpose: string;             // e.g. "for whatever legal purpose/intent it may serve best"

    // — Primary Signatory (Local Assessment Operations Officer) —
    primarySignatoryName: string;   // e.g. "ELVIRA T. ENAO, REA"
    primarySignatoryTitle: string;  // e.g. "Local Assessment Operations Officer IV"

    // — Secondary Signatory (Assistant Provincial Assessor) —
    secondarySignatoryName: string;  // e.g. "CHINA CHAN-OLARIO, RN, REA, REB, Enp"
    secondarySignatoryTitle: string; // e.g. "Assistant Provincial Assessor"

    // — Payment Reference —
    certificationFee: string;    // e.g. "40.00"
    orNumber: string;            // e.g. "1234567"
    dated: string;               // ISO date e.g. "2026-06-29"
}

/** Default empty property row */
export const EMPTY_LANDHOLDING_ROW = (): LandholdingPropertyRow => ({
    id: crypto.randomUUID(),
    tdArpNumber: '',
    locationOfProperty: '',
    lotNumber: '',
    titleNumber: '',
    area: '',
    assessedValue: '',
});

/** Default empty Certificate of Landholding state */
export const EMPTY_LANDHOLDING_FORM = (): LandholdingFormData => ({
    declarantName: '',
    ownershipType: 'single',
    propertyRows: [EMPTY_LANDHOLDING_ROW()],
    dateGiven: new Date().toISOString().split('T')[0],
    givenAt: 'Dipolog City',
    purpose: 'for whatever legal purpose/intent it may serve best',
    primarySignatoryName: 'ELVIRA T. ENAO, REA',
    primarySignatoryTitle: 'Local Assessment Operations Officer IV',
    secondarySignatoryName: 'CHINA CHAN-OLARIO, RN, REA, REB, Enp',
    secondarySignatoryTitle: 'Assistant Provincial Assessor',
    certificationFee: '40.00',
    orNumber: '',
    dated: new Date().toISOString().split('T')[0],
});
