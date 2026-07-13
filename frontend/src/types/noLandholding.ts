// ============================================================
// Certificate of No Landholding — TypeScript type definitions
// Province of Zamboanga del Norte, Office of the Provincial Assessor
// ============================================================

/**
 * Controls which pronoun and verb form appear in the certificate body:
 *   His   → "in his name"
 *   Her   → "in her name"
 *   Their → "in their name/s"
 */
export type PronounType = 'His' | 'Her' | 'Their';

/**
 * Controls whether the property clause is singular or plural:
 *   singular → "has / property / name"
 *   plural   → "have / properties / names"
 */
export type PropertyCountType = 'singular' | 'plural';

/** The complete Certificate of No Landholding form state */
export interface NoLandholdingFormData {
    // — Declarant —
    declarantName: string;       // e.g. "VIVIAN V. YANOS"
    pronoun: PronounType;        // His | Her | Their
    propertyCount: PropertyCountType;

    // — Certification Details —
    dateGiven: string;           // ISO date e.g. "2026-06-29"
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
    orNumber: string;            // e.g. "06-29-2026"
    dated: string;               // ISO date e.g. "2026-06-29"
}

/** Default empty Certificate of No Landholding state */
export const EMPTY_NO_LANDHOLDING_FORM = (): NoLandholdingFormData => ({
    declarantName: '',
    pronoun: 'His',
    propertyCount: 'singular',
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
