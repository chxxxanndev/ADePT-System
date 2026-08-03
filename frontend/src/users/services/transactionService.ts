import type { Transaction, RequestedDocumentItem } from '../types/transaction';
import { supabase } from '../../lib/supabaseClient';
import { API_ROOT } from '../../config';

const API_BASE_URL = `${API_ROOT}/api/requests`;

export async function fetchTransactionRegistry(): Promise<Transaction[]> {
    let token = sessionStorage.getItem('adept_token');
    if (!token) {
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token || null;
    }

    const res = await fetch(`${API_BASE_URL}/registry`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to fetch transactions (${res.status})`);
    }
    const data = await res.json();
    const raw = (data.transactions ?? []) as any[];

    return raw.map((t): Transaction => ({
        ...t,
        // Backend may send this as dateReleased (already camelCase, like
        // dateRequested) or as release_date/releaseDate depending on which
        // endpoint version served the request — normalize to dateReleased
        // so the registry table/sort always has one field to read.
        requestType: t.requestType ?? t.request_type ?? 'ORIGINAL', 
        dateReleased: t.dateReleased ?? t.releaseDate ?? t.release_date ?? null,
        payment: {
            ...t.payment,
            orNumber: t.payment?.orNumber ?? null,
            orJustification: t.payment?.orJustification ?? null,
        },
        requestedDocuments: (t.requestedDocuments ?? []).map(
            (doc: any, idx: number): RequestedDocumentItem => {
                // Backward compatible: older backend responses (or any other
                // caller) may still send plain document-name strings.
                if (typeof doc === 'string') {
                    return { id: `${t.id}-doc-${idx}`, documentType: doc, reprintCount: 0 };
                }
                return {
    id: doc.id,
    documentType: doc.name ?? doc.documentType ?? 'Document',
    documentTypeId: doc.documentTypeId,
    requiresTaxDeclaration: doc.requiresTaxDeclaration,
    reprintCount: doc.reprintCount ?? 0,   // was hardcoded to 0
};
            }
        ),
    }));
}

export async function voidTransaction(id: string, reason: string): Promise<any> {
    let token = sessionStorage.getItem('adept_token');
    if (!token) {
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token || null;
    }

    const res = await fetch(`${API_BASE_URL}/${id}/void`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ reason }),
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to void transaction.');
    }
    return res.json();
}

export async function createReprint(transactionId: string, docId: string): Promise<any> {
    let token = sessionStorage.getItem('adept_token');
    if (!token) {
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token || null;
    }

    const res = await fetch(`${API_BASE_URL}/${transactionId}/documents/${docId}/reprint`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to create reprint request (${res.status})`);
    }
    return res.json();
}

export async function fetchCertifiedTrueCopies(): Promise<Transaction[]> {
    const token = sessionStorage.getItem('adept_token');
    
    // 1. Call the existing registry endpoint
    const res = await fetch(`${API_BASE_URL}/registry`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!res.ok) throw new Error("Failed to fetch registry");

    const data = await res.json();
    const raw = (data.transactions ?? []) as any[];

    // 2. Filter for REPRINTs only and map them
    return raw
        .filter(t => t.requestType === 'REPRINT') 
        .map((t): Transaction => ({
            ...t,
            // Ensure payment fields are mapped for the OR/Justification columns
            payment: {
                ...t.payment,
                orNumber: t.payment?.orNumber || null,
                orJustification: t.payment?.orJustification || null,
            }
        }));
}