import type { TransactionSummary } from '../types/transaction';

interface SummaryCardsProps {
    summary: TransactionSummary;
}

export function SummaryCards({ summary }: SummaryCardsProps) {
    return (
        <div className="tr-summary-grid tr-summary-grid--single">
            <div className="tr-summary-card tr-summary-card--accent-total">
                <span className="tr-summary-card-label">Total Transactions</span>
                <span className="tr-summary-card-value">{summary.total}</span>
            </div>
        </div>
    );
}