import type { TransactionSummary } from '../types/transaction';

interface SummaryCardsProps {
    summary: TransactionSummary;
}

export function SummaryCards({ summary }: SummaryCardsProps) {
    const cards = [
        { label: 'Total Transactions', value: summary.total, accent: 'tr-summary-card--accent-total' },
        { label: 'Pending', value: summary.pending, accent: 'tr-summary-card--accent-pending' },
        { label: 'Processing', value: summary.processing, accent: 'tr-summary-card--accent-processing' },
        { label: 'Ready for Release', value: summary.readyForRelease, accent: 'tr-summary-card--accent-ready' },
        { label: 'Released', value: summary.released, accent: 'tr-summary-card--accent-released' },
        { label: 'Void / Amended', value: summary.voidOrAmended, accent: 'tr-summary-card--accent-void' },
    ];

    return (
        <div className="tr-summary-grid">
            {cards.map((card) => (
                <div key={card.label} className={`tr-summary-card ${card.accent}`}>
                    <span className="tr-summary-card-label">{card.label}</span>
                    <span className="tr-summary-card-value">{card.value}</span>
                </div>
            ))}
        </div>
    );
}
