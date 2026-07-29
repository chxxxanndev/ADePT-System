import type { Transaction, RequestedDocumentItem } from '../types/transaction';
import { supabase } from '../../lib/supabaseClient';

const API_BASE_URL = 'http://localhost:5000/api/requests';

export async function fetchTransactionRegistry(): Promise<Transaction[]> {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const res = await fetch(`${API_BASE_URL}/registry`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to fetch transactions (${res.status})`);
    }
    const data = await res.json();
    const raw = (data.transactions ?? []) as any[];
    // Backend currently returns requestedDocuments as a flat string[] of
    // document type names (see requestService.js getTransactionRegistry()).
    // No per-document id or reprint count exists in the DB yet, so both are
    // stubbed here on the client. Replace this mapping once those exist.
    return raw.map((t): Transaction => ({
        ...t,
        requestedDocuments: (t.requestedDocuments ?? []).map(
            (docName: string, idx: number): RequestedDocumentItem => ({
                id: `${t.id}-doc-${idx}`,
                documentType: docName,
                reprintCount: 0,
            })
        ),
    }));
}