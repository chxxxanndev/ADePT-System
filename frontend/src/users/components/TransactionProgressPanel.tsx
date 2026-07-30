import { useState } from 'react';
import { useCart } from '../hooks/TransactionCartContext';
import '../styles/TransactionProgressPanel.css';

// ── Color tokens by document type ────────────────────────────────
const DOCTYPE_STYLE: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    'Tax Declaration':               { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', dot: '#3b82f6' },
    'Certificate of Landholding':    { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', dot: '#22c55e' },
    'Certificate of No Landholding': { bg: '#fdf4ff', border: '#e9d5ff', text: '#7e22ce', dot: '#a855f7' },
};
function docStyle(t: string) {
    return DOCTYPE_STYLE[t] ?? { bg: '#f8fafc', border: '#cbd5e1', text: '#475569', dot: '#94a3b8' };
}

// ── Shared logic: group cart items by documentType ────────────────
function useGroupedCart() {
    const { items } = useCart();
    const grouped: { documentType: string; declarants: string[]; count: number }[] = [];
    const seen: Record<string, number> = {};
    for (const item of items) {
        if (seen[item.documentType] === undefined) {
            seen[item.documentType] = grouped.length;
            grouped.push({ documentType: item.documentType, declarants: [], count: 0 });
        }
        const g = grouped[seen[item.documentType]];
        g.declarants.push(item.declarantName);
        g.count++;
    }
    return { grouped, total: items.length };
}

// ═══════════════════════════════════════════════════════════════
//  1. COMPACT BAR — for RequestFormEntry (top of card)
//     Renders a single line that expands to the full card on click.
// ═══════════════════════════════════════════════════════════════
export function TransactionProgressBar() {
    const { grouped, total } = useGroupedCart();
    const [expanded, setExpanded] = useState(false);

    if (total === 0) return null;

    // Build inline summary text: "Certificate of Landholding x1, Tax Declaration x2"
    const summary = grouped.map((g) => `${g.documentType} x${g.count}`).join(', ');

    return (
        <div className="txp-bar-wrapper">
            {/* ── Collapsed top strip ── */}
            <button
                type="button"
                className="txp-bar-strip"
                onClick={() => setExpanded((e) => !e)}
                aria-expanded={expanded}
                title={expanded ? 'Collapse progress panel' : 'Expand to see full breakdown'}
            >
                <span className="txp-bar-icon">🗂</span>
                <span className="txp-bar-text">
                    <strong>{total} document{total !== 1 ? 's' : ''} saved this session</strong>
                    {' '}—{' '}
                    <span className="txp-bar-summary">{summary}</span>
                </span>
                <span className={`txp-bar-chevron ${expanded ? 'is-up' : ''}`}>▾</span>
            </button>

            {/* ── Expanded full card ── */}
            {expanded && (
                <div className="txp-bar-expanded">
                    <TransactionProgressCard />
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
//  2. FULL CARD — for certificate processing forms
//     Shows the grouped document list with checkmarks.
//     Pass referenceNumber to show the session ref tag.
// ═══════════════════════════════════════════════════════════════
interface TransactionProgressPanelProps {
    referenceNumber?: string;
}

export function TransactionProgressPanel({ referenceNumber }: TransactionProgressPanelProps) {
    const { grouped, total } = useGroupedCart();
    if (total === 0) return null;

    return (
        <div className="txp-card">
            {/* Header */}
            <div className="txp-card-header">
                <div className="txp-card-header-left">
                    <span className="txp-card-icon">📋</span>
                    <div>
                        <span className="txp-card-title">Transaction Progress</span>
                        <span className="txp-card-sub">Documents saved in this session</span>
                    </div>
                </div>
                <div className="txp-card-counter">
                    <span className="txp-card-count">{total}</span>
                    <span className="txp-card-count-label">doc{total !== 1 ? 's' : ''}</span>
                </div>
            </div>

            {/* Optional ref tag */}
            {referenceNumber && (
                <div className="txp-card-ref">Session ref: <strong>{referenceNumber}</strong></div>
            )}

            {/* Groups */}
            <div className="txp-card-groups">
                {grouped.map((g) => {
                    const s = docStyle(g.documentType);
                    return (
                        <div key={g.documentType} className="txp-group" style={{ background: s.bg, borderColor: s.border }}>
                            <div className="txp-group-header">
                                <span className="txp-group-dot" style={{ background: s.dot }} />
                                <span className="txp-group-type" style={{ color: s.text }}>{g.documentType}</span>
                                <span className="txp-group-badge" style={{ background: s.dot }}>{g.count}</span>
                            </div>
                            <div className="txp-group-declarants">
                                {g.declarants.map((name, i) => (
                                    <div key={i} className="txp-declarant-row">
                                        <span className="txp-declarant-num">{i + 1}.</span>
                                        <span className="txp-declarant-name">{name || '—'}</span>
                                        <span className="txp-declarant-check">✓</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer hint */}
            <div className="txp-card-footer">
                <span>✅ All saved documents will appear in Review Transaction.</span>
                <span>Use <strong>"Save &amp; Add Another Doc"</strong> to add more, or <strong>"Review Transaction"</strong> to finalise.</span>
            </div>
        </div>
    );
}

// Re-export TransactionProgressCard so the bar's expanded view is the same DOM
function TransactionProgressCard() {
    return <TransactionProgressPanel />;
}
