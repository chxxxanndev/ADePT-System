import type { Transaction } from '../types/transaction';

const API_BASE_URL = 'http://localhost:5000/api/requests';

export async function fetchTransactionRegistry(): Promise<Transaction[]> {
    const token = localStorage.getItem('adept_token');
    const res = await fetch(`${API_BASE_URL}/registry`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to fetch transactions (${res.status})`);
    }
    const data = await res.json();
    return (data.transactions ?? []) as Transaction[];
}