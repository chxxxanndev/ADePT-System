const TotalIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="16" y2="17" />
    </svg>
);

const CalendarCheckIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <path d="m9 16 2 2 4-4" />
    </svg>
);

const TaxDeclarationIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="21" x2="21" y2="21"></line><line x1="6" y1="18" x2="6" y2="11"></line><line x1="10" y1="18" x2="10" y2="11"></line><line x1="14" y1="18" x2="14" y2="11"></line><line x1="18" y1="18" x2="18" y2="11"></line><polygon points="12 3 21 9 3 9"></polygon></svg>
);

const LandholdingIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" /></svg>
);

const NoLandholdingIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="M9 15l2 2 4-4" /></svg>
);

interface SummaryCardsProps {
    total: number;
    releasedToday: number;
    taxDeclarations: number;
    landholdings: number;
    noLandholdings: number;
}

/** Five stat chips (Total, Released Today, per-document-type breakdown) —
 *  exactly what RegistrySummarySkeleton renders while the registry loads. */
export function SummaryCards({
    total,
    releasedToday,
    taxDeclarations,
    landholdings,
    noLandholdings,
}: SummaryCardsProps) {
    const chips = [
        { icon: <TotalIcon />, wrap: 'tr-summary-icon-wrap--total', value: total, label: 'Total Transactions' },
        { icon: <CalendarCheckIcon />, wrap: 'tr-summary-icon-wrap--released', value: releasedToday, label: 'Released Today' },
        { icon: <TaxDeclarationIcon />, wrap: 'tr-summary-icon-wrap--td', value: taxDeclarations, label: 'Tax Declaration' },
        { icon: <LandholdingIcon />, wrap: 'tr-summary-icon-wrap--lh', value: landholdings, label: 'Landholding' },
        { icon: <NoLandholdingIcon />, wrap: 'tr-summary-icon-wrap--nlh', value: noLandholdings, label: 'No Land Holding' },
    ];

    return (
        <div className="tr-summary-grid">
            {chips.map((chip) => (
                <div className="tr-summary-card" key={chip.label}>
                    <div className={`tr-summary-icon-wrap ${chip.wrap}`}>{chip.icon}</div>
                    <div className="tr-summary-card-text">
                        <span className="tr-summary-card-value">{chip.value}</span>
                        <span className="tr-summary-card-label">{chip.label}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}