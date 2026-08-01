// ===== Transaction Registry — Type Definitions =====

export type PropertySource = 'TAX_DECLARATION' | 'LAND_HOLDING' | 'NO_LANDHOLDING' | 'UNKNOWN';

export type TransactionStatus =
    | 'Pending'
    | 'For Payment'
    | 'Payment Verified'
    | 'Processing'
    | 'Ready for Release'
    | 'Released'
    | 'Void'
    | 'Cancelled'
    | 'Archived';

export type DocumentType =
    | 'Tax Declaration'
    | 'Certificate of Land Holding'
    | 'Certificate of No Landholding'
    | 'Certified True Copy';

export interface ActivityLogEntry {
    id: string;
    time: string;
    date: string;
    action: string;
    actor?: string;
    note?: string;
}

export interface GeneratedDocument {
    id: string;
    documentName: string;
    documentType: DocumentType;
    dateGenerated: string;
    generatedBy: string;
    fileRef: string;
}

/**
 * One requested document within a request/reference number.
 * TODO: `id` is a client-generated placeholder (`${transactionId}-doc-${index}`)
 * because request_documents doesn't expose its own row id in
 * getTransactionRegistry() yet — swap it for the real id once it does.
 * TODO: `reprintCount` has no backing DB column yet (confirmed — none exists).
 * It lives only in local state for the current session and resets on reload
 * until a backend field/endpoint is added.
 */
export interface RequestedDocumentItem {
    id: string;
    documentType: DocumentType | string;
    documentTypeId?: string;
    requiresTaxDeclaration?: boolean;
    reprintCount: number;
}

export interface PaymentInfo {
    orNumber: string | null;
    amountDue: number;
    amountPaid: number;
    paymentDate: string | null;
    paymentMethod: 'Cash' | 'GCash' | 'Bank Transfer' | 'Unpaid';
    verifiedBy: string | null;
    /**
     * Free-text reason recorded when an OR Number is waived/exempted/not
     * yet issued (e.g. "Senior citizen exemption", "Indigency waiver").
     * No backing DB column existed for this before — added here so the
     * Transaction Registry table can show it, defaulting to "None" in the
     * UI whenever it's null/empty.
     */
    orJustification?: string | null;
}

export interface PropertyInfo {
    /** Which encoded record this data came from — drives which fields are populated vs dashed. */
    source?: PropertySource;
    taxDeclarationNo: string;      // Assessment/TD/ARP No.
    pin?: string;                  // Property Identification Number
    octTctNumber?: string;         // OCT/TCT/CLOA No.
    surveyNumber?: string;
    lotNo?: string;
    blockNumber?: string;
    titleNumber?: string;          // populated for Land Holding rows
    location: string;
    ownerOnRecord: string;
    ownerAddress?: string;
    ownerTin?: string;
    ownerTelephone?: string;
    administratorName?: string;
    administratorAddress?: string;
    administratorTin?: string;
    administratorTelephone?: string;
    boundaryNorth?: string;
    boundarySouth?: string;
    boundaryEast?: string;
    boundaryWest?: string;
    classification?: string;
    area?: string;
    marketValue?: number | null;
    assessedValue?: number | null;
    taxability?: string;
    amountInWords?: string;
    effectivityYear?: number | null;
    cancelledTdNumber?: string;
    memoranda?: string;
    notes?: string;
    assessorName?: string;
    assessorTitle?: string;
}

export interface ClientInfo {
    declarantName: string;
    address?: string;
    requestedBy: string;
    authorizationOnFile: boolean;
}

export interface Transaction {
    id: string;
    referenceNumber: string;
    client: ClientInfo;
    property: PropertyInfo;
    requestedDocuments: RequestedDocumentItem[];
    dateRequested: string;
    assignedStaff: string;
    status: TransactionStatus;
    payment: PaymentInfo;
    generatedDocuments: GeneratedDocument[];
    activityTimeline: ActivityLogEntry[];
    reasonPurpose?: string;
    isVoid?: boolean;
    voidReason?: string;
    voidedAt?: string;
}

/**
 * Frontend-only grouping used by the Transaction Registry table: one row per
 * declarant, bundling every Released request that declarant has.
 * NOTE: grouped by client.declarantName since no client id is exposed by the
 * backend yet — two different people sharing an exact name would merge here.
 */
export interface DeclarantGroup {
    declarantName: string;
    transactions: Transaction[]; // most recent first
}

export interface TransactionFilters {
    status: 'Released' | 'Reprinted'; // was TransactionStatus | 'All' — registry is Released-only now
    documentType: DocumentType | 'All';
    dateFrom?: string;
    dateTo?: string;
}

export interface TransactionSummary {
    total: number;
    pending: number;
    processing: number;
    readyForRelease: number;
    released: number;
    voidOrAmended: number;
}