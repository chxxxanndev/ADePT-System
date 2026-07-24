// ===== Transaction Registry — Type Definitions =====
// Mirrors the shape we expect from Supabase later.
// Replace mockTransactions.ts with an API/service call and these types stay the same.

export type TransactionStatus =
    | 'Pending'            // Request created, no details encoded yet
    | 'For Payment'        // Details encoded, waiting for OR number
    | 'Payment Verified'   // OR entered, ready to be processed/printed
    | 'Processing'         // Currently being worked on
    | 'Ready for Release'  // Printed and signed, sitting in the "Outbox"
    | 'Released'           // Handed to client
    | 'Void'               // Cancelled after being released (errors found)
    | 'Cancelled'          // Terminated by client before payment
    | 'Archived';          // Old records

export type DocumentType =
    | 'Tax Declaration'
    | 'Certificate of Land Holding'
    | 'Certificate of No Landholding'
    | 'Certified True Copy';

export interface ActivityLogEntry {
    id: string;
    time: string; // e.g. "09:05 AM"
    date: string; // e.g. "07/17/2026"
    action: string; // e.g. "Request Created"
    actor?: string; // e.g. "Che Ann Abal"
    note?: string;
}

export interface GeneratedDocument {
    id: string;
    documentName: string;
    documentType: DocumentType;
    dateGenerated: string;
    generatedBy: string;
    fileRef: string; // mock filename / control ref
}

export interface PaymentInfo {
    orNumber: string | null;
    amountDue: number;
    amountPaid: number;
    paymentDate: string | null;
    paymentMethod: 'Cash' | 'GCash' | 'Bank Transfer' | 'Unpaid';
    verifiedBy: string | null;
}

export interface PropertyInfo {
    taxDeclarationNo: string;
    location: string;
    lotNo?: string;
    ownerOnRecord: string;
    classification?: string;
    assessedValue?: number;
}

export interface ClientInfo {
    declarantName: string;
    contactNumber?: string;
    address?: string;
    requestedBy: string;
    relationshipToDeclarant?: 'Self' | 'Authorized Representative' | 'Legal Heir';
    authorizationOnFile: boolean;
}

export interface Transaction {
    id: string;
    referenceNumber: string; // REF-2026-0001
    client: ClientInfo;
    property: PropertyInfo;
    requestedDocuments: DocumentType[];
    dateRequested: string; // MM/DD/YYYY
    assignedStaff: string;
    status: TransactionStatus;
    payment: PaymentInfo;
    generatedDocuments: GeneratedDocument[];
    activityTimeline: ActivityLogEntry[];
    reasonPurpose?: string;
    isVoid?: boolean;
    voidReason?: string;
}

export interface TransactionFilters {
    status: TransactionStatus | 'All';
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
