// ===== Reprint tracking (client-side stopgap) =====
//
// TODO: The backend has no reprint_count column yet (confirmed in
// transactionService.ts / transaction.ts). Until it does, "reprint" state
// can't live in a single fetch response, so it's tracked here in
// localStorage and merged onto whatever fetchTransactionRegistry() returns.
// This is shared across TransactionRegistry.tsx (which writes to it when a
// staff member clicks Reprint) and CertifiedTrueCopy.tsx (which reads from
// it to know which documents now need a certified true copy).
//
// Caveat: this is per-browser, not per-account or server-synced. Replace
// entirely once the backend exposes a real reprint count + timestamp.

import type { Transaction } from '../types/transaction';

const STORAGE_KEY = 'adept-reprinted-documents';

interface ReprintRecord {
    reprintCount: number;
    lastReprintedAt: string;
    lastReprintedBy?: string;
}

type ReprintStoreShape = Record<string, ReprintRecord>; // keyed by RequestedDocumentItem.id

function readStore(): ReprintStoreShape {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function writeStore(store: ReprintStoreShape) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
        // Ignore quota/serialization errors — reprint tracking degrading
        // gracefully is better than crashing the page.
    }
}

/** Increments and persists the reprint count for a single document, returning the new count. */
export function recordReprint(docId: string, actor?: string): number {
    const store = readStore();
    const prevCount = store[docId]?.reprintCount ?? 0;
    const nextCount = prevCount + 1;
    store[docId] = {
        reprintCount: nextCount,
        lastReprintedAt: new Date().toISOString(),
        lastReprintedBy: actor,
    };
    writeStore(store);
    return nextCount;
}

/** Reads back the persisted reprint metadata for a document, if any. */
export function getReprintRecord(docId: string): ReprintRecord | undefined {
    return readStore()[docId];
}

/**
 * Overlays persisted reprint counts onto a freshly-fetched transaction list.
 * Call this right after fetchTransactionRegistry() so both TransactionRegistry
 * and CertifiedTrueCopy see the same reprint state.
 */
export function mergeReprintCounts(transactions: Transaction[]): Transaction[] {
    const store = readStore();
    return transactions.map((t) => ({
        ...t,
        requestedDocuments: t.requestedDocuments.map((d) => ({
            ...d,
            reprintCount: store[d.id]?.reprintCount ?? d.reprintCount ?? 0,
        })),
    }));
}