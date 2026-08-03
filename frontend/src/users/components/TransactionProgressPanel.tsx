import { useState } from 'react';
import type { ReactElement } from 'react';
import { useCart } from '../hooks/TransactionCartContext';
import '../styles/TransactionProgressPanel.css';

// ── Small inline icon set (replaces emoji) ─────────────────────────
function FolderCheckIcon({ size = 18 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
            <path d="M9 13.5l2 2 4-4.5" />
        </svg>
    );
}
function ClipboardListIcon({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="6" y="4" width="12" height="17" rx="2" />
            <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M9 10h6M9 14h6M9 18h3" />
        </svg>
    );
}
function EditIcon({ size = 13 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
    );
}
function BuildingIcon({ size = 14 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21h18" />
            <path d="M5 21V9l7-5 7 5v12" />
            <path d="M9 21v-6h6v6" />
        </svg>
    );
}
function LandCheckIcon({ size = 14 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2Z" />
            <path d="M9 4v14" />
            <path d="m13.3 12 1.4 1.4 2.8-2.8" />
        </svg>
    );
}
function LandXIcon({ size = 14 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2Z" />
            <path d="M9 4v14" />
            <path d="m13 11 3 3M16 11l-3 3" />
        </svg>
    );
}
function FileIcon({ size = 14 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
            <path d="M14 2v6h6" />
        </svg>
    );
}

// ── Color + icon tokens by document type ───────────────────────────
const DOCTYPE_STYLE: Record<string, { bg: string; border: string; text: string; accent: string; iconBg: string }> = {
    'Tax Declaration': { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', accent: '#3b82f6', iconBg: '#dbeafe' },
    'Certificate of Landholding': { bg: '#fffbeb', border: '#fde68a', text: '#b45309', accent: '#f59e0b', iconBg: '#fef3c7' },
    'Certificate of No Landholding': { bg: '#fef2f2', border: '#fecaca', text: '#b91c1c', accent: '#ef4444', iconBg: '#fee2e2' },
};
function docStyle(t: string) {
    return DOCTYPE_STYLE[t] ?? { bg: '#f8fafc', border: '#cbd5e1', text: '#475569', accent: '#94a3b8', iconBg: '#e2e8f0' };
}

const DOCTYPE_ICON: Record<string, (props: { size?: number }) => ReactElement> = {
    'Tax Declaration': BuildingIcon,
    'Certificate of Landholding': LandCheckIcon,
    'Certificate of No Landholding': LandXIcon,
};
function docIcon(t: string) {
    return DOCTYPE_ICON[t] ?? FileIcon;
}

// Best-effort relative time. Reads item.savedAt defensively via a cast —
// TransactionCartContext's CartItem type doesn't carry this field yet, so
// this renders nothing until the context is updated to stamp items with a
// savedAt ISO string when they're added. Safe no-op until then.
function relativeTime(iso?: string): string | null {
    if (!iso) return null;
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return null;
    const diffMs = Date.now() - then;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    return new Date(iso).toLocaleDateString();
}

// ── Shared logic: group cart items by documentType ────────────────
function useGroupedCart() {
    const { items } = useCart();
    const grouped: { documentType: string; declarants: { name: string; savedAt?: string }[]; count: number }[] = [];
    const seen: Record<string, number> = {};
    for (const item of items) {
        if (seen[item.documentType] === undefined) {
            seen[item.documentType] = grouped.length;
            grouped.push({ documentType: item.documentType, declarants: [], count: 0 });
        }
        const g = grouped[seen[item.documentType]];
        g.declarants.push({ name: item.declarantName, savedAt: (item as any).savedAt });
        g.count++;
    }
    return { grouped, total: items.length };
}

// A document currently being filled out but not yet saved to the cart.
export interface InProgressInfo {
    documentType: string;
    label: string;
}

// ═══════════════════════════════════════════════════════════════
//  1. COMPACT BAR — for RequestFormEntry (top of card)
// ═══════════════════════════════════════════════════════════════
interface TransactionProgressBarProps {
    referenceNumber?: string;
    currentDeclarant?: string;
    emptyHint?: string;
    inProgress?: InProgressInfo;
}

export function TransactionProgressBar({ referenceNumber, currentDeclarant, emptyHint, inProgress }: TransactionProgressBarProps) {
    const { grouped, total } = useGroupedCart();
    const [expanded, setExpanded] = useState(false);

    if (total === 0) {
        if (!emptyHint) return null;
        return (
            <div className="txp-bar-wrapper">
                <div className="txp-bar-empty">
                    <FolderCheckIcon size={16} />
                    <span>{emptyHint}</span>
                </div>
            </div>
        );
    }

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
                <span className="txp-bar-icon"><FolderCheckIcon size={17} /></span>
                <span className="txp-bar-text">
                    <strong>{total} document{total !== 1 ? 's' : ''} saved this session</strong>
                    {referenceNumber && <span className="txp-bar-ref"> · Ref {referenceNumber}</span>}
                </span>
                <span className="txp-bar-pills">
                    {grouped.map((g) => {
                        const s = docStyle(g.documentType);
                        const Icon = docIcon(g.documentType);
                        return (
                            <span key={g.documentType} className="txp-pill" style={{ background: s.bg, color: s.text, borderColor: s.border }}>
                                <Icon size={12} />
                                {g.documentType} · {g.count}
                            </span>
                        );
                    })}
                </span>
                <span className={`txp-bar-chevron ${expanded ? 'is-up' : ''}`}>▾</span>
            </button>

            {/* ── Expanded full card ── */}
            {expanded && (
                <div className="txp-bar-expanded">
                    <TransactionProgressPanel
                        referenceNumber={referenceNumber}
                        currentDeclarant={currentDeclarant}
                        inProgress={inProgress}
                    />
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
//  2. FULL CARD — for certificate processing forms
// ═══════════════════════════════════════════════════════════════
interface TransactionProgressPanelProps {
    referenceNumber?: string;
    // Name of the declarant whose document is being filled out on THIS page
    // right now (Tax Declaration / Landholding / No-Landholding form).
    // Shown as "Processing now: <name>" next to the session ref.
    currentDeclarant?: string;
    inProgress?: InProgressInfo;
}

export function TransactionProgressPanel({ referenceNumber, currentDeclarant, inProgress }: TransactionProgressPanelProps) {
    const { grouped, total } = useGroupedCart();
    if (total === 0 && !inProgress) return null;

    const inProgressIsNewGroup = inProgress && !grouped.some((g) => g.documentType === inProgress.documentType);

    return (
        <div className="txp-card">
            {/* Header */}
            <div className="txp-card-header">
                <div className="txp-card-header-left">
                    <span className="txp-card-icon"><ClipboardListIcon size={20} /></span>
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

            {/* Ref tag + "Processing now" status */}
            {(referenceNumber || currentDeclarant) && (
                <div className="txp-card-ref">
                    {referenceNumber && <span>Session ref: <strong>{referenceNumber}</strong></span>}
                    {currentDeclarant && (
                        <span className="txp-card-processing">
                            <EditIcon size={12} /> Processing now: <strong>{currentDeclarant}</strong>
                        </span>
                    )}
                </div>
            )}

            {/* Groups */}
            <div className="txp-card-groups">
                {grouped.map((g) => {
                    const s = docStyle(g.documentType);
                    const Icon = docIcon(g.documentType);
                    return (
                        <div key={g.documentType} className="txp-group" style={{ background: s.bg, borderColor: s.border }}>
                            <div className="txp-group-header">
                                <span className="txp-group-icon" style={{ background: s.iconBg, color: s.text }}>
                                    <Icon size={13} />
                                </span>
                                <span className="txp-group-type" style={{ color: s.text }}>{g.documentType}</span>
                                <span className="txp-group-badge" style={{ background: s.accent }}>{g.count}</span>
                            </div>
                            <div className="txp-group-declarants">
                                {g.declarants.map((d, i) => {
                                    const rel = relativeTime(d.savedAt);
                                    return (
                                        <div key={i} className="txp-declarant-row">
                                            <span className="txp-declarant-num">{i + 1}.</span>
                                            <span className="txp-declarant-name">{d.name || '—'}</span>
                                            {rel && <span className="txp-declarant-time">{rel}</span>}
                                            <span className="txp-declarant-check">Done</span>
                                        </div>
                                    );
                                })}

                                {inProgress && inProgress.documentType === g.documentType && (
                                    <div className="txp-declarant-row txp-declarant-row-inprogress">
                                        <span className="txp-declarant-num">{g.count + 1}.</span>
                                        <span className="txp-declarant-name txp-declarant-name-inprogress">
                                            {inProgress.label || 'Untitled'} <em>(processing now)</em>
                                        </span>
                                        <span className="txp-declarant-editing"><EditIcon size={12} /></span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {inProgressIsNewGroup && inProgress && (
                    <div className="txp-group txp-group-inprogress-only">
                        <div className="txp-group-header">
                            <span className="txp-group-icon" style={{ background: docStyle(inProgress.documentType).iconBg, color: docStyle(inProgress.documentType).text }}>
                                {(() => { const Icon = docIcon(inProgress.documentType); return <Icon size={13} />; })()}
                            </span>
                            <span className="txp-group-type" style={{ color: docStyle(inProgress.documentType).text }}>
                                {inProgress.documentType}
                            </span>
                        </div>
                        <div className="txp-group-declarants">
                            <div className="txp-declarant-row txp-declarant-row-inprogress">
                                <span className="txp-declarant-num">1.</span>
                                <span className="txp-declarant-name txp-declarant-name-inprogress">
                                    {inProgress.label || 'Untitled'} <em>(processing now)</em>
                                </span>
                                <span className="txp-declarant-editing"><EditIcon size={12} /></span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer hint */}
            <div className="txp-card-footer">
                <span>All saved documents appear in Review Transaction. Use <strong>Save &amp; Add Another Doc</strong> to add more, or <strong>Review Transaction</strong> to finalise.</span>
            </div>
        </div>
    );
}