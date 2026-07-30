import type { Transaction, RequestedDocumentItem } from '../types/transaction';
import { api } from './requestService'; // Import the smart Axios instance

export async function fetchTransactionRegistry(): Promise<Transaction[]> {
    // 1. Use api.get instead of native fetch. 
    // The token and 401-guard are now handled automatically!
    const res = await api.get('/requests/registry');
    
    // 2. Axios puts the response body in .data
    const data = res.data;
    
    const raw = (data.transactions ?? []) as any[];
    
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