import type { Transaction, TransactionSummary} from '../types/transaction';

export function computeSummary(transactions: Transaction[]): TransactionSummary {
    return {
        total: transactions.length,
        pending: transactions.filter((t) => t.status === 'Pending').length,
        processing: transactions.filter((t) => t.status === 'Processing').length,
        readyForRelease: transactions.filter((t) => t.status === 'Ready for Release').length,
        released: transactions.filter((t) => t.status === 'Released').length,
        voidOrAmended: transactions.filter((t) => t.status === 'Void').length,
    };
}