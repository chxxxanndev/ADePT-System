import type { Transaction, RequestedDocumentItem } from '../types/transaction';
import { supabase } from '../../lib/supabaseClient';

const API_BASE_URL = 'http://localhost:5000/api/requests';

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
        requestedDocuments: (t.requestedDocuments ?? []).map(
            (doc: any, idx: number): RequestedDocumentItem => {
                // Backward compatible: older backend responses (or any other
                // caller) may still send plain document-name strings.
                if (typeof doc === 'string') {
                    return { id: `${t.id}-doc-${idx}`, documentType: doc, reprintCount: 0 };
                }
                return {
                    id: doc.id || `${t.id}-doc-${idx}`,
                    documentType: doc.name ?? doc.documentType ?? 'Document',
                    documentTypeId: doc.documentTypeId,
                    requiresTaxDeclaration: doc.requiresTaxDeclaration,
                    reprintCount: 0,
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