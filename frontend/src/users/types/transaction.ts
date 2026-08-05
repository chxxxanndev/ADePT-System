// ===== Transaction Registry — Type Definitions =====

export type PropertySource = 'TAX_DECLARATION' | 'LAND_HOLDING' | 'NO_LANDHOLDING' | 'UNKNOWN';

// Match the labels shown in the UI
export type TransactionStatus =
    | 'Pending'
    | 'Processing'
    | 'Released'
    | 'Void'
    | 'Cancelled'
    | 'Archived'
    | 'Payment Verified'
    | 'For Payment'          // ← add
    | 'Ready for Release';


export type CTCStatus = "Pending" | "Released" | "Voided" | "Archived";

export type DocumentType =
    | 'Tax Declaration'
    | 'Certificate of Landholding'
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
 * One requested document within a request.
 * reprintCount is now backed by the database count of sibling requests.
 */
export interface RequestedDocumentItem {
    id: string; // The ID from the request_documents table
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
    orJustification?: string | null;
}

export interface AssessmentRow {
    id: string;
    rowOrder: number;
    classification?: string;
    actualUse?: string;
    actualUseOtherText?: string;
    area?: string;
    areaUnit?: string;
    marketValue?: number | null;
    assessmentLevel?: number | null;
    assessedValue?: number | null;
    kindOfProperty?: string;
}

export interface LandholdingRow {
    id: string;
    rowOrder: number;
    tdArpNumber?: string;
    location?: string;
    lotNumber?: string;
    titleNumber?: string;
    area?: string;
    assessedValue?: number | null;
}

export interface PropertyInfo {
    source?: PropertySource;
    taxDeclarationNo: string;
    pin?: string;
    octTctNumber?: string;
    surveyNumber?: string;
    lotNo?: string;
    blockNumber?: string;
    titleNumber?: string;
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
    assessmentRows?: AssessmentRow[];
    landholdingRows?: LandholdingRow[];
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
    /** 
     * NEW: Distinguishes between the first application 
     * and subsequent reprint/CTC requests.
     */
    requestType: 'ORIGINAL' | 'REPRINT';
    client: ClientInfo;
    property: PropertyInfo;
    requestedDocuments: RequestedDocumentItem[];
    dateRequested: string;
    dateReleased?: string | null;
    releasedBy?: string | null;
    assignedStaff: string;
    status: TransactionStatus;
    payment: PaymentInfo;
    generatedDocuments: GeneratedDocument[];
    activityTimeline: ActivityLogEntry[];
    reasonPurpose?: string;
    isVoid?: boolean;
    voidReason?: string;
    voidedAt?: string;
    cancelledAt?: string;
    hasBeenAmended?: boolean;
    /** Set when this request is the amended copy of a voided original
     *  (requests.amended_from_id) — the identifier used to count amended
     *  documents. */
    amendedFromId?: string | null;
}

/**
 * Used for the Certified True Copy (Reprint) Registry view
 */
export interface CertifiedCopyRecord {
    id: string;
    reference: string;          // The reprint ref (e.g., -R1)
    declarantName: string;
    originalDocument: string;   // The parent ref (base)
    dateRequested: string;
    dateReleased: string;
    releasedBy: string;
    status: CTCStatus;
    orNumber: string;
    orJustification: string;
}

export interface DeclarantGroup {
    declarantName: string;
    transactions: Transaction[];
}

export interface TransactionFilters {
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