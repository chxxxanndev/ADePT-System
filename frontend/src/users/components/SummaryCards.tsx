import type { TransactionSummary } from '../types/transaction';

interface SummaryCardsProps {
    summary: TransactionSummary;
    isLoading?: boolean;
}

export function SummaryCards({ summary, isLoading = false }: SummaryCardsProps) {
    if (isLoading) {
        return (
            <div className="tr-summary-grid tr-summary-grid--single">
                <div className="skeleton-card-accent skeleton-accent-purple">
                    <div className="skeleton-item" style={{ width: '60%', height: 10 }} />
                    <div className="skeleton-item" style={{ width: '30%', height: 20 }} />
                </div>
            </div>
        );
    }

    return (
        <div className="tr-summary-grid tr-summary-grid--single">
            <div className="tr-summary-card tr-summary-card--accent-total">
                <span className="tr-summary-card-label">Total Transactions</span>
                <span className="tr-summary-card-value">{summary.total}</span>
            </div>
        </div>
    );
}