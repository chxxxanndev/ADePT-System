import type { TransactionSummary } from '../types/transaction';

const TotalIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="16" y2="17" />
    </svg>
);

interface SummaryCardsProps {
    summary: TransactionSummary;
    isLoading?: boolean;
}

export function SummaryCards({ summary, isLoading = false }: SummaryCardsProps) {
    if (isLoading) {
        return (
            <div className="tr-summary-grid tr-summary-grid--single">
                <div className="tr-summary-skeleton-card skeleton-card-ghost">
                    <div className="skeleton-item" style={{ width: '60%', height: 10 }} />
                    <div className="skeleton-item" style={{ width: '30%', height: 20 }} />
                </div>
            </div>
        );
    }

    return (
        <div className="tr-summary-grid tr-summary-grid--single">
            <div className="tr-summary-card">
                <div className="tr-summary-icon-wrap tr-summary-icon-wrap--total">
                    <TotalIcon />
                </div>
                <div className="tr-summary-card-text">
                    <span className="tr-summary-card-value">{summary.total}</span>
                    <span className="tr-summary-card-label">Total Transactions</span>
                </div>
            </div>
        </div>
    );
}