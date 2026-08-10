import React, { useEffect, useRef, useState } from 'react';
import '../styles/DocumentReleasePanel.css';
import { CustomSelect } from '../components/CustomSelect';
import { DEFAULT_TD_TEMPLATE_SPACING, type TDTemplateSpacing } from '../components/templates/TaxDeclarationPDF';

interface Signatory {
    id: string;
    name: string;
    title: string;
    role: string;
}

interface ActivePreview {
    docId: string;
    url: string;
    label: string;
}

// marginLeft / marginRight participate in the SAME 100%-sum pool as the six
// real columns (dragged from the same width bar below). They don't render
// as bordered cells — they're blank space that the real columns are fit
// into, which is what lets the table box shrink/shift instead of always
// touching the page's left/right content edge.
interface TableColWidths {
    marginLeft: number;
    td: number;
    location: number;
    lot: number;
    title: number;
    area: number;
    assessed: number;
    marginRight: number;
}

interface TableSpacing {
    rowHeight: number;
    fontSize: number;
    headerFontSize: number;
    colWidths: TableColWidths;
}

interface SignatoryStyle {
    nameFontSize: number;
    titleFontSize: number;
    blockWidth: number;
    // Per-signatory horizontal nudge (pt) — moves that signatory's whole
    // block (name + title together) left/right of its default position.
    offsetX1: number;
    offsetX2: number;
}

// ---------------------------------------------------------------------------
// NLH Spacing — all layout values staff may need to nudge per NLH document.
// Exported so the parent can import the type and default for state init/reset.
// ---------------------------------------------------------------------------
export interface NLHSpacing {
    sigMarginTop: number;    // space above the whole signatory block (was 80)
    sigBlockGap: number;     // gap between sig1 and sig2 (was 60)
    sigBlockWidth: number;   // width of each signatory block in pt (was 260)
    nameFontSize: number;    // signatory name font size (was 11)
    titleFontSize: number;   // signatory title font size (was 10)
    offsetX1: number;        // horizontal nudge for sig1 — negative = left (was 0)
    offsetX2: number;        // horizontal nudge for sig2 — negative = left (was 0)
    receiptBottom: number;   // absolute bottom position of receipt box (was 95)
    receiptLeft: number;     // absolute left position of receipt box (was 70)
    receiptRowGap: number;   // marginBottom between Cert Fee / O.R. No. / Dated rows (was 3)
}

export const DEFAULT_NLH_SPACING: NLHSpacing = {
    sigMarginTop: 80,
    sigBlockGap: 60,
    sigBlockWidth: 260,
    nameFontSize: 11,
    titleFontSize: 10,
    offsetX1: 0,
    offsetX2: 0,
    receiptBottom: 95,
    receiptLeft: 70,
    receiptRowGap: 3,
};

const DEFAULT_TABLE_SPACING: TableSpacing = {
    rowHeight: 22,
    fontSize: 9,
    headerFontSize: 10,
    colWidths: { marginLeft: 0, td: 18, location: 26, lot: 12, title: 12, area: 14, assessed: 18, marginRight: 0 },
};

const DEFAULT_SIGNATORY_STYLE: SignatoryStyle = {
    nameFontSize: 11,
    titleFontSize: 11,
    blockWidth: 250,
    offsetX1: 0,
    offsetX2: 0,
};

// The two margin entries sit at either end of this array so they render as
// the first/last segments of the bar — i.e. the two outer handles.
const TABLE_COLUMNS: { key: keyof TableColWidths; label: string; isMargin?: boolean }[] = [
    { key: 'marginLeft', label: 'Left Margin', isMargin: true },
    { key: 'td', label: 'TD/ARP No.' },
    { key: 'location', label: 'Location' },
    { key: 'lot', label: 'Lot No.' },
    { key: 'title', label: 'Title No.' },
    { key: 'area', label: 'Area' },
    { key: 'assessed', label: 'Assd. Value' },
    { key: 'marginRight', label: 'Right Margin', isMargin: true },
];

interface DocumentReleasePanelProps {
    documents: any[];
    orNumber: string;
    activePreview: ActivePreview | null;
    isGeneratingPdf: string | null;
    onSelectDocument: (doc: any) => void;

    activeSignatories: Signatory[];
    docSignatories: Record<string, any>;
    onSignatoryChange: (docId: string, roleType: 'primary' | 'secondary', sigId: string) => void;

    docSpacing: Record<string, { top: number; gap: number }>;
    onSpacingChange: (docId: string, field: 'top' | 'gap', value: number) => void;
    onResetSpacing: (docId: string) => void;

    docReceiptSpacing: Record<string, { bottom: number; left: number; rowGap: number }>;
    onReceiptSpacingChange: (docId: string, field: 'bottom' | 'left' | 'rowGap', value: number) => void;
    onResetReceiptSpacing: (docId: string) => void;

    // Property table layout — Landholding certs only (rows/columns/text size).
    docTableSpacing: Record<string, TableSpacing>;
    onTableSpacingChange: (docId: string, field: 'rowHeight' | 'fontSize' | 'headerFontSize', value: number) => void;
    onColWidthsChange: (docId: string, updates: Partial<TableColWidths>) => void;
    onResetTableSpacing: (docId: string) => void;

    // Signatory text sizing / block width — Landholding certs only.
    docSignatoryStyle: Record<string, SignatoryStyle>;
    onSignatoryStyleChange: (docId: string, field: keyof SignatoryStyle, value: number) => void;
    onResetSignatoryStyle: (docId: string) => void;

    // In the props interface, make the three NLH props optional:
    docNLHSpacing?: Record<string, NLHSpacing>;
    onNLHSpacingChange?: (docId: string, field: keyof NLHSpacing, value: number) => void;
    onResetNLHSpacing?: (docId: string) => void;

    // Tax Declaration layout adjustments (base text sizes + auto-fit floor +
    // Certified Copy block) — the TD equivalent of the LH/NLH accordions.
    docTDSpacing?: Record<string, TDTemplateSpacing>;
    onTDSpacingChange?: (docId: string, field: keyof TDTemplateSpacing, value: number) => void;
    onResetTDSpacing?: (docId: string) => void;

    releaseStaffOptions: { id: string; name: string }[];
    onMarkAsReleased: (releasedBy: string) => Promise<void> | void;
    onReleased: () => void;
    onQueueForRelease?: () => Promise<void> | void;
}

// Badge styling/icon per document prefix — TD (blue), LH (amber), NLH (red).
const getDocBadgeConfig = (doc: any) => {
    const ref = doc.referenceNumber || '';

    if (ref.startsWith('TD')) {
        return {
            className: 'pd-doc-badge--td',
            label: 'Tax Declaration',
            icon: (
                <svg className="pd-badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11m16-11v11M8 14v3m4-3v3m4-3v3" />
                </svg>
            ),
        };
    }

    if (ref.startsWith('NLH')) {
        return {
            className: 'pd-doc-badge--nlh',
            label: 'Certificate of No Landholding',
            icon: (
                <svg className="pd-badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.5l1.5 1.5 3-3M7 3h7l4 4v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z" />
                </svg>
            ),
        };
    }

    // LH (Landholding) — plain document-with-text-lines icon.
    return {
        className: 'pd-doc-badge--lh',
        label: doc.documentType || 'Certificate of Landholding',
        icon: (
            <svg className="pd-badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 2v6h6" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 13h8M8 17h8" />
            </svg>
        ),
    };
};

// --- AccordionSection --------------------------------------------------
// Collapsible wrapper for each layout-control group. Closed by default so
// staff who never touch these controls aren't shown a wall of fields every
// time they open a document. An optional "Reset" link appears in the header
// (only while open) so a bad value can be backed out without disturbing
// the other sections.
const AccordionSection: React.FC<{
    title: string;
    defaultOpen?: boolean;
    onReset?: () => void;
    children: React.ReactNode;
}> = ({ title, defaultOpen = false, onReset, children }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div style={{ borderTop: '1px solid #e4e7ec', marginTop: 14, paddingTop: 10 }}>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    textAlign: 'left',
                }}
            >
                <span
                    style={{
                        display: 'inline-flex',
                        transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.15s ease',
                        marginRight: 6,
                        color: '#667085',
                    }}
                >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
                    </svg>
                </span>
                <span className="pd-field-label" style={{ flex: 1, margin: 0 }}>{title}</span>
                {onReset && open && (
                    <span
                        onClick={(e) => { e.stopPropagation(); onReset(); }}
                        role="button"
                        tabIndex={0}
                        style={{ fontSize: 11, color: '#175cd3', fontWeight: 600, cursor: 'pointer' }}
                    >
                        Reset
                    </span>
                )}
            </button>
            {open && <div style={{ marginTop: 12 }}>{children}</div>}
        </div>
    );
};

// --- Stepper -------------------------------------------------------------
// Small shared +/- number input used throughout the accordions.
const Stepper: React.FC<{
    label: string;
    value: number;
    step: number;
    min?: number;
    onChange: (value: number) => void;
}> = ({ label, value, step, min = 0, onChange }) => (
    <div className="pd-form-group">
        <label className="pd-field-label">{label}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
                type="button"
                className="pd-btn pd-btn--queue-outline"
                style={{ padding: '6px 12px' }}
                onClick={() => onChange(Math.max(min, value - step))}
            >−</button>
            <input
                type="number"
                className="pd-field-textarea"
                style={{ textAlign: 'center', width: 70, padding: '6px 8px' }}
                value={value}
                onChange={(e) => onChange(Number(e.target.value) || 0)}
            />
            <button
                type="button"
                className="pd-btn pd-btn--queue-outline"
                style={{ padding: '6px 12px' }}
                onClick={() => onChange(value + step)}
            >+</button>
        </div>
    </div>
);

// --- ColumnWidthBar --------------------------------------------------------
// Drag-to-resize bar for the Landholding property table columns.
const ColumnWidthBar: React.FC<{
    colWidths: TableColWidths;
    onChange: (updates: Partial<TableColWidths>) => void;
}> = ({ colWidths, onChange }) => {
    const barRef = useRef<HTMLDivElement>(null);
    const dragState = useRef<{
        leftKey: keyof TableColWidths;
        rightKey: keyof TableColWidths;
        startX: number;
        startLeft: number;
        startRight: number;
    } | null>(null);

    const keys = TABLE_COLUMNS.map(c => c.key);
    const total = keys.reduce((sum, k) => sum + (colWidths[k] || 0), 0) || 100;

    const isMarginKey = (key: keyof TableColWidths) => key === 'marginLeft' || key === 'marginRight';
    const minWidthFor = (key: keyof TableColWidths) => (isMarginKey(key) ? 0 : 5);

    const handlePointerDown = (index: number) => (e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault();
        const leftKey = keys[index];
        const rightKey = keys[index + 1];
        dragState.current = {
            leftKey,
            rightKey,
            startX: e.clientX,
            startLeft: colWidths[leftKey] || 0,
            startRight: colWidths[rightKey] || 0,
        };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        const drag = dragState.current;
        if (!drag || !barRef.current) return;
        const barWidth = barRef.current.getBoundingClientRect().width || 1;
        const deltaPercent = ((e.clientX - drag.startX) / barWidth) * total;
        const pairTotal = drag.startLeft + drag.startRight;
        const leftMin = minWidthFor(drag.leftKey);
        const rightMin = minWidthFor(drag.rightKey);
        let newLeft = drag.startLeft + deltaPercent;
        newLeft = Math.max(leftMin, Math.min(pairTotal - rightMin, newLeft));
        const newRight = pairTotal - newLeft;
        onChange({
            [drag.leftKey]: Math.round(newLeft),
            [drag.rightKey]: Math.round(newRight),
        } as Partial<TableColWidths>);
    };

    const handlePointerUp = () => {
        dragState.current = null;
    };

    let cumulative = 0;

    return (
        <div>
            <div
                ref={barRef}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                style={{
                    display: 'flex',
                    width: '100%',
                    height: 46,
                    borderRadius: 6,
                    overflow: 'hidden',
                    border: '1px solid #d0d5dd',
                    userSelect: 'none',
                    position: 'relative',
                }}
            >
                {keys.map((key, i) => {
                    const width = colWidths[key] || 0;
                    const widthPct = (width / total) * 100;
                    const isMargin = !!TABLE_COLUMNS[i].isMargin;
                    return (
                        <div
                            key={key}
                            style={{
                                width: `${widthPct}%`,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 10,
                                fontWeight: 600,
                                background: isMargin
                                    ? 'repeating-linear-gradient(45deg, #f2f4f7, #f2f4f7 4px, #e4e7ec 4px, #e4e7ec 8px)'
                                    : (i % 2 === 0 ? '#eef2f7' : '#e3e8ef'),
                                borderRight: i < keys.length - 1 ? '1px solid #b7c0cc' : 'none',
                                color: isMargin ? '#98a2b3' : '#344054',
                                padding: '2px 3px',
                                textAlign: 'center',
                                lineHeight: 1.25,
                                overflow: 'hidden',
                            }}
                        >
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                                {TABLE_COLUMNS[i].label}
                            </span>
                            <span style={{ fontWeight: 400, opacity: 0.75 }}>{Math.round(width)}%</span>
                        </div>
                    );
                })}

                {keys.slice(0, -1).map((key, i) => {
                    cumulative += (colWidths[key] || 0);
                    const leftPct = (cumulative / total) * 100;
                    return (
                        <div
                            key={`handle-${key}`}
                            onPointerDown={handlePointerDown(i)}
                            style={{
                                position: 'absolute',
                                top: 0,
                                bottom: 0,
                                left: `calc(${leftPct}% - 5px)`,
                                width: 10,
                                cursor: 'col-resize',
                                zIndex: 2,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <div style={{
                                width: 3,
                                height: 22,
                                borderRadius: 2,
                                background: '#667085',
                            }} />
                        </div>
                    );
                })}
            </div>
            <span className="pd-queue-hint" style={{ color: Math.round(total) !== 100 ? '#b42318' : undefined }}>
                Total: {Math.round(total)}%{Math.round(total) !== 100
                    ? ' — drag the handles until columns sum to ~100%.'
                    : ' — drag any handle to resize; the two outer handles control the left/right table margins.'}
            </span>
        </div>
    );
};

// ===========================================================================
// DocumentReleasePanel
// ===========================================================================
export const DocumentReleasePanel: React.FC<DocumentReleasePanelProps> = ({
    documents,
    orNumber,
    activePreview,
    isGeneratingPdf,
    onSelectDocument,
    activeSignatories,
    docSignatories,
    onSignatoryChange,
    docSpacing,
    onSpacingChange,
    onResetSpacing,
    docReceiptSpacing,
    onReceiptSpacingChange,
    onResetReceiptSpacing,
    docTableSpacing,
    onTableSpacingChange,
    onColWidthsChange,
    onResetTableSpacing,
    docSignatoryStyle,
    onSignatoryStyleChange,
    // onResetSignatoryStyle,
    docNLHSpacing,
    onNLHSpacingChange,
    onResetNLHSpacing,
    docTDSpacing,
    onTDSpacingChange,
    onResetTDSpacing,
    releaseStaffOptions,
    onMarkAsReleased,
    onReleased,
    onQueueForRelease,
}) => {
    const [releasedBy, setReleasedBy] = useState('');
    const [releasedByError, setReleasedByError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isQueuing, setIsQueuing] = useState(false);
    const [queueError, setQueueError] = useState('');
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [isPreviewLoaded, setIsPreviewLoaded] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);

    // --- Release guard state -------------------------------------------------
    const [actionTaken, setActionTaken] = useState(false);
    const [showGuardModal, setShowGuardModal] = useState(false);
    const pendingNavigationRef = useRef<(() => void) | null>(null);

    const activeDoc = documents.find(d => d.id === activePreview?.docId) || documents[0];
    const busy = isSubmitting || isQueuing;

    const signatoryOptions = activeSignatories.map(sig => ({
        id: sig.id,
        label: sig.name,
        sublabel: sig.title,
    }));

    const staffOptions = releaseStaffOptions.map(s => ({ id: s.id, label: s.name }));

    // --- Per-doc-type guards — all derived from activeDoc inside the component
    const isLandholdingDoc = !!activeDoc?.referenceNumber?.startsWith('LH');
    const isNLHDoc = !!activeDoc?.referenceNumber?.startsWith('NLH');
    const isTaxDecDoc = !!activeDoc?.referenceNumber?.startsWith('TD');

    // --- Active spacing values (fall back to defaults when not yet customised)
    const activeSpacing = activeDoc
        ? (docSpacing[activeDoc.id] || { top: 60, gap: 65 })
        : { top: 60, gap: 65 };

    const activeReceiptSpacing = activeDoc
        ? (docReceiptSpacing[activeDoc.id] || { bottom: 500, left: 80, rowGap: 2 })
        : { bottom: 100, left: 80, rowGap: 2 };

    const activeTableSpacing = activeDoc
        ? (docTableSpacing[activeDoc.id] || DEFAULT_TABLE_SPACING)
        : DEFAULT_TABLE_SPACING;

    const activeSignatoryStyle = activeDoc
        ? (docSignatoryStyle[activeDoc.id] || DEFAULT_SIGNATORY_STYLE)
        : DEFAULT_SIGNATORY_STYLE;

    const activeNLHSpacing = activeDoc
    ? ((docNLHSpacing ?? {})[activeDoc.id] || DEFAULT_NLH_SPACING)
    : DEFAULT_NLH_SPACING;

    const activeTDSpacing = activeDoc
        ? ((docTDSpacing ?? {})[activeDoc.id] || DEFAULT_TD_TEMPLATE_SPACING)
        : DEFAULT_TD_TEMPLATE_SPACING;

    // Reset the "loaded" flag every time a new preview URL comes in.
    useEffect(() => {
        setIsPreviewLoaded(false);
    }, [activePreview?.url]);

    const handleIframeLoad = () => setIsPreviewLoaded(true);

    const handlePrint = () => {
        if (!activePreview) return;
        setIsPrinting(true);

        const win = iframeRef.current?.contentWindow;
        try {
            if (win) {
                win.focus();
                win.print();
                setIsPrinting(false);
                return;
            }
        } catch (err) {
            console.error('In-frame print failed, falling back to a new tab:', err);
        }

        const printWindow = window.open(activePreview.url, '_blank');
        if (printWindow) {
            printWindow.addEventListener('load', () => {
                printWindow.focus();
                printWindow.print();
            });
            setIsPrinting(false);
        } else {
            setIsPrinting(false);
            alert('Your browser blocked the print tab. Please allow pop-ups for this site, or use Download and print from your PDF viewer.');
        }
    };

    const handleRelease = async () => {
        if (!releasedBy) {
            setReleasedByError('Please select who is releasing these documents.');
            return;
        }
        setReleasedByError('');
        setIsSubmitting(true);
        try {
            await onMarkAsReleased(releasedBy);
            setActionTaken(true);
            setShowGuardModal(false);
            onReleased();
            if (pendingNavigationRef.current) {
                const proceed = pendingNavigationRef.current;
                pendingNavigationRef.current = null;
                proceed();
            }
        } catch (err: any) {
            setReleasedByError(err?.message || 'Failed to mark as released.');
            setIsSubmitting(false);
        }
    };

    const handleQueueForRelease = async () => {
        if (!onQueueForRelease) return;
        setQueueError('');
        setIsQueuing(true);
        try {
            await onQueueForRelease();
            setActionTaken(true);
            setShowGuardModal(false);
            if (pendingNavigationRef.current) {
                const proceed = pendingNavigationRef.current;
                pendingNavigationRef.current = null;
                proceed();
            }
        } catch (err: any) {
            setQueueError(err?.message || 'Failed to save for later release.');
        } finally {
            setIsQueuing(false);
        }
    };

    const dismissGuard = () => {
        pendingNavigationRef.current = null;
        setShowGuardModal(false);
    };

    // --- Native browser exits ------------------------------------------------
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (actionTaken) return;
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [actionTaken]);

    // --- Exit attempts (in-app buttons, sidebar, tabs, links, …) -----------
    // The app switches views statefully (Dashboard's setActiveView), so most
    // "other page" navigation is plain <button> clicks (sidebar items, tab
    // pills, breadcrumbs, quick actions) — not anchors, which is why they
    // used to slip past the guard and out of the release flow silently.
    // Capture-phase interception runs BEFORE those buttons' own onClick
    // handlers, so preventDefault + stopPropagation cancels the navigation
    // entirely and forces staff to resolve the release (Mark as Released /
    // Save & Release Later / Stay). Everything INSIDE the panel keeps
    // working normally; only clicks outside it are candidates.
    useEffect(() => {
        const handleClickCapture = (e: MouseEvent) => {
            if (actionTaken) return;
            if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

            const target = (e.target as HTMLElement) ?? null;
            if (!target) return;
            if (panelRef.current?.contains(target)) return;

            // Old-style <a href> outside the panel → block the native jump.
            const anchor = target.closest('a[href]') as HTMLAnchorElement | null;
            if (anchor) {
                if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;
                const href = anchor.getAttribute('href') || '';
                if (!href || href.startsWith('#')) return;
                e.preventDefault();
                e.stopPropagation();
                pendingNavigationRef.current = () => {
                    window.location.href = href;
                };
                setShowGuardModal(true);
                return;
            }

            // Any in-app navigation control outside the panel (Dashboard
            // sidebar, header buttons, tabs, breadcrumbs…) → cancel the
            // click so the view can't change until the release is resolved.
            if (target.closest('button, [role="button"], a')) {
                e.preventDefault();
                e.stopPropagation();
                setShowGuardModal(true);
            }
        };

        document.addEventListener('click', handleClickCapture, true);
        return () => document.removeEventListener('click', handleClickCapture, true);
    }, [actionTaken]);

    return (
        <div className="pd-split-layout pd-split-layout--viewer animation-fade-in" ref={panelRef}>
            {/* LEFT COLUMN: PDF VIEWER */}
            <div className="pd-col-left">
                <div className="pd-pdf-viewer-container">
                    {activePreview ? (
                        <iframe
                            ref={iframeRef}
                            key={activePreview.url}
                            src={`${activePreview.url}#toolbar=0&navpanes=0&scrollbar=0`}
                            className="pd-pdf-iframe"
                            title={`Preview — ${activePreview.label}`}
                            onLoad={handleIframeLoad}
                        />
                    ) : isGeneratingPdf ? (
                        <div className="pd-pdf-placeholder">
                            <svg className="pd-placeholder-icon spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Generating preview…
                        </div>
                    ) : (
                        <div className="pd-pdf-placeholder">
                            <svg className="pd-placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                            Select a document from the panel to preview
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT COLUMN: SIDEBAR */}
            <div className="pd-col-right pd-sidebar-controls">

                {/* Card 1 — Payment Status */}
                <div className="pd-sidebar-card pd-payment-verified-card">
                    <div className="pd-payment-details">
                        <div className="pd-success-icon-minimal">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div className="pd-payment-text">
                            <h3>Payment Verified</h3>
                            <p>O.R. #{orNumber} <span className="pd-dot-separator">•</span> {documents.length} document{documents.length > 1 ? 's' : ''}</p>
                        </div>
                    </div>
                </div>

                {/* Card 2 — Documents */}
                <div className="pd-sidebar-card">
                    <div className="pd-section-label">Documents for Release</div>
                    <div className="pd-print-list-compact">
                        {documents.map((doc: any) => {
                            const isActive = activePreview?.docId === doc.id;
                            const badgeConfig = getDocBadgeConfig(doc);

                            return (
                                <div
                                    className={`pd-compact-card ${isActive ? 'pd-compact-card--active' : ''}`}
                                    key={doc.id}
                                    onClick={() => !isActive && onSelectDocument(doc)}
                                    role="button"
                                    tabIndex={0}
                                >
                                    <div className="pd-compact-info">
                                        <div className={`pd-doc-badge ${badgeConfig.className}`} title={badgeConfig.label}>
                                            {badgeConfig.icon}
                                            {doc.referenceNumber}
                                        </div>
                                    </div>
                                    <div className="pd-compact-action">
                                        {isGeneratingPdf === doc.id ? (
                                            <span className="pd-status-text pd-loading">
                                                <span className="pd-pulse-dot"></span> Loading
                                            </span>
                                        ) : isActive ? (
                                            <span className="pd-status-text pd-viewing">
                                                <span className="pd-pulse-dot pd-pulse-dot--active"></span> Viewing
                                            </span>
                                        ) : (
                                            <button className="pd-btn--tiny-view" type="button">View</button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Card 3 — Signatories + Layout Controls */}
                {activeDoc && (
                    <div className="pd-sidebar-card">
                        <div className="pd-section-label">Confirm Signatories</div>
                        <div className={`pd-sig-selectors${activeDoc.referenceNumber?.startsWith('TD') ? ' pd-sig-selectors--single' : ''}`}>
                            <div className="pd-form-group">
                                <label className="pd-field-label">
                                    {activeDoc.referenceNumber?.startsWith('TD') ? 'Certified Copy (Authorized Signatory)' : 'Signatory 1'}
                                </label>
                                <CustomSelect
                                    value={docSignatories[activeDoc.id]?.primary?.id || ''}
                                    onChange={(id) => onSignatoryChange(activeDoc.id, 'primary', id)}
                                    options={signatoryOptions}
                                    placeholder="-- Select signatory --"
                                    searchable
                                    searchPlaceholder="Search signatory..."
                                />
                            </div>

                            {!activeDoc.referenceNumber?.startsWith('TD') && (
                                <div className="pd-form-group">
                                    <label className="pd-field-label">Signatory 2</label>
                                    <CustomSelect
                                        value={docSignatories[activeDoc.id]?.secondary?.id || ''}
                                        onChange={(id) => onSignatoryChange(activeDoc.id, 'secondary', id)}
                                        options={signatoryOptions}
                                        placeholder="-- Select signatory --"
                                        allowNone
                                        searchable
                                        searchPlaceholder="Search signatory..."
                                    />
                                </div>
                            )}
                        </div>

                        {/* ── TD ACCORDIONS ─────────────────────────────────── */}
                        {isTaxDecDoc && (
                            <AccordionSection title="Field Text Size (Auto-fit)" onReset={() => onResetTDSpacing?.(activeDoc.id)}>
                                <div className="pd-sig-selectors">
                                    <Stepper
                                        label="Owner & Administrator Text Size (pt)"
                                        value={activeTDSpacing.ownerFontSize}
                                        step={0.5}
                                        min={6}
                                        onChange={(v) => onTDSpacingChange?.(activeDoc.id, 'ownerFontSize', v)}
                                    />
                                    <Stepper
                                        label="Location Text Size (pt)"
                                        value={activeTDSpacing.locationFontSize}
                                        step={0.5}
                                        min={6}
                                        onChange={(v) => onTDSpacingChange?.(activeDoc.id, 'locationFontSize', v)}
                                    />
                                    <Stepper
                                        label="Boundary North Text Size (pt)"
                                        value={activeTDSpacing.boundaryNorthFontSize}
                                        step={0.5}
                                        min={6}
                                        onChange={(v) => onTDSpacingChange?.(activeDoc.id, 'boundaryNorthFontSize', v)}
                                    />
                                    <Stepper
                                        label="Boundary South Text Size (pt)"
                                        value={activeTDSpacing.boundarySouthFontSize}
                                        step={0.5}
                                        min={6}
                                        onChange={(v) => onTDSpacingChange?.(activeDoc.id, 'boundarySouthFontSize', v)}
                                    />
                                    <Stepper
                                        label="Boundary East Text Size (pt)"
                                        value={activeTDSpacing.boundaryEastFontSize}
                                        step={0.5}
                                        min={6}
                                        onChange={(v) => onTDSpacingChange?.(activeDoc.id, 'boundaryEastFontSize', v)}
                                    />
                                    <Stepper
                                        label="Boundary West Text Size (pt)"
                                        value={activeTDSpacing.boundaryWestFontSize}
                                        step={0.5}
                                        min={6}
                                        onChange={(v) => onTDSpacingChange?.(activeDoc.id, 'boundaryWestFontSize', v)}
                                    />
                                    <Stepper
                                        label="Property Table Text Size (pt)"
                                        value={activeTDSpacing.tableFontSize}
                                        step={0.5}
                                        min={6}
                                        onChange={(v) => onTDSpacingChange?.(activeDoc.id, 'tableFontSize', v)}
                                    />
                                    <Stepper
                                        label="Amount in Words Text Size (pt)"
                                        value={activeTDSpacing.amountWordsFontSize}
                                        step={0.5}
                                        min={6}
                                        onChange={(v) => onTDSpacingChange?.(activeDoc.id, 'amountWordsFontSize', v)}
                                    />
                                    <Stepper
                                        label="Memoranda Text Size (pt)"
                                        value={activeTDSpacing.memorandaFontSize}
                                        step={0.5}
                                        min={6}
                                        onChange={(v) => onTDSpacingChange?.(activeDoc.id, 'memorandaFontSize', v)}
                                    />
                                    <Stepper
                                        label="Verified-by / Assessor Text Size (pt)"
                                        value={activeTDSpacing.assessorFontSize}
                                        step={0.5}
                                        min={6}
                                        onChange={(v) => onTDSpacingChange?.(activeDoc.id, 'assessorFontSize', v)}
                                    />
                                </div>

                                <div className="pd-sig-selectors" style={{ marginTop: 10 }}>
                                    <Stepper
                                        label="Auto-fit Minimum Text Size (pt)"
                                        value={activeTDSpacing.autoFitFloor}
                                        step={0.5}
                                        min={4}
                                        onChange={(v) => onTDSpacingChange?.(activeDoc.id, 'autoFitFloor', v)}
                                    />
                                    <Stepper
                                        label="Assessor Name Left Margin (pt)"
                                        value={activeTDSpacing.assessorMarginLeft}
                                        step={5}
                                        min={-60}
                                        onChange={(v) => onTDSpacingChange?.(activeDoc.id, 'assessorMarginLeft', v)}
                                    />
                                </div>
                                <div className="pd-form-group" style={{ marginTop: 10 }}>
                                    <label className="pd-field-label" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={activeTDSpacing.autoFitEnabled === 1}
                                            onChange={(e) => onTDSpacingChange?.(activeDoc.id, 'autoFitEnabled', e.target.checked ? 1 : 0)}
                                        />
                                        Automatically shrink long text to fit its box
                                    </label>
                                </div>
                                <span className="pd-queue-hint">
                                    Long values auto-shrink to stay on one line inside their fixed boxes — the form never
                                    reflows or spills to a second page. Set a base size here and auto-fit shrinks from it;
                                    the floor is the preferred minimum, and text that still can't fit keeps shrinking
                                    further (down to 3pt) rather than wrapping. Base sizes below the floor are clamped up
                                    to it, so a value of 1pt can never blank a field. Use the Assessor Name Left Margin
                                    (negative moves left) to keep long typed assessor names clear of the Verified-by
                                    underline.
                                </span>
                            </AccordionSection>
                        )}

                        {isTaxDecDoc && (
                            <AccordionSection title="Certified Copy Block" onReset={() => onResetTDSpacing?.(activeDoc.id)}>
                                <div className="pd-sig-selectors">
                                    <Stepper
                                        label="Signatory Name Text Size (pt)"
                                        value={activeTDSpacing.certNameFontSize}
                                        step={0.5}
                                        min={6}
                                        onChange={(v) => onTDSpacingChange?.(activeDoc.id, 'certNameFontSize', v)}
                                    />
                                    <Stepper
                                        label="Signatory Title Text Size (pt)"
                                        value={activeTDSpacing.certTitleFontSize}
                                        step={0.5}
                                        min={6}
                                        onChange={(v) => onTDSpacingChange?.(activeDoc.id, 'certTitleFontSize', v)}
                                    />
                                </div>
                                <div className="pd-sig-selectors" style={{ marginTop: 10 }}>
                                    <Stepper
                                        label="Signatory Horizontal Position (pt)"
                                        value={activeTDSpacing.certOffsetX}
                                        step={5}
                                        min={-200}
                                        onChange={(v) => onTDSpacingChange?.(activeDoc.id, 'certOffsetX', v)}
                                    />
                                    <Stepper
                                        label="Signatory Vertical Position (pt)"
                                        value={activeTDSpacing.certOffsetY}
                                        step={5}
                                        min={-100}
                                        onChange={(v) => onTDSpacingChange?.(activeDoc.id, 'certOffsetY', v)}
                                    />
                                    <Stepper
                                        label="Receipt Row Spacing (pt)"
                                        value={activeTDSpacing.certRowGap}
                                        step={1}
                                        onChange={(v) => onTDSpacingChange?.(activeDoc.id, 'certRowGap', v)}
                                    />
                                </div>
                                <span className="pd-queue-hint">
                                    Nudge the Certified Copy signatory block (name + title) with the horizontal/vertical
                                    position steppers — negative moves it left/up, positive right/down. Receipt Row Spacing
                                    adjusts the gap between the Cert. Fee / O.R. No. / Date paid lines.
                                </span>
                            </AccordionSection>
                        )}

                        {/* ── LH ACCORDIONS ─────────────────────────────────── */}
                        {isLandholdingDoc && (
                            <AccordionSection title="Signature Layout" onReset={() => onResetSpacing(activeDoc.id)}>
                                <div className="pd-sig-selectors">
                                    <Stepper
                                        label="Space Above Signatures (pt)"
                                        value={activeSpacing.top}
                                        step={5}
                                        onChange={(v) => onSpacingChange(activeDoc.id, 'top', v)}
                                    />
                                    <Stepper
                                        label="Space Between Signatories (pt)"
                                        value={activeSpacing.gap}
                                        step={5}
                                        onChange={(v) => onSpacingChange(activeDoc.id, 'gap', v)}
                                    />
                                </div>

                                <div className="pd-sig-selectors" style={{ marginTop: 10 }}>
                                    <Stepper
                                        label="Signatory Name Text Size (pt)"
                                        value={activeSignatoryStyle.nameFontSize}
                                        step={1}
                                        min={6}
                                        onChange={(v) => onSignatoryStyleChange(activeDoc.id, 'nameFontSize', v)}
                                    />
                                    <Stepper
                                        label="Signatory Title Text Size (pt)"
                                        value={activeSignatoryStyle.titleFontSize}
                                        step={1}
                                        min={6}
                                        onChange={(v) => onSignatoryStyleChange(activeDoc.id, 'titleFontSize', v)}
                                    />
                                </div>
                                <div className="pd-form-group" style={{ marginTop: 10 }}>
                                    <Stepper
                                        label="Signatory Block Width (pt)"
                                        value={activeSignatoryStyle.blockWidth}
                                        step={10}
                                        min={100}
                                        onChange={(v) => onSignatoryStyleChange(activeDoc.id, 'blockWidth', v)}
                                    />
                                </div>

                                <div className="pd-sig-selectors" style={{ marginTop: 10 }}>
                                    <Stepper
                                        label="Signatory 1 — Left/Right Position (pt)"
                                        value={activeSignatoryStyle.offsetX1}
                                        step={5}
                                        min={-400}
                                        onChange={(v) => onSignatoryStyleChange(activeDoc.id, 'offsetX1', v)}
                                    />
                                    <Stepper
                                        label="Signatory 2 — Left/Right Position (pt)"
                                        value={activeSignatoryStyle.offsetX2}
                                        step={5}
                                        min={-400}
                                        onChange={(v) => onSignatoryStyleChange(activeDoc.id, 'offsetX2', v)}
                                    />
                                </div>
                                <span className="pd-queue-hint">
                                    If a long name or title wraps or clips, widen the block or shrink the text size.
                                    Negative values move a signatory left, positive values move it right — the name
                                    and title move together.
                                </span>
                            </AccordionSection>
                        )}

                        {isLandholdingDoc && (
                            <AccordionSection title="Receipt Block" onReset={() => onResetReceiptSpacing(activeDoc.id)}>
                                <div className="pd-sig-selectors">
                                    <Stepper
                                        label="From Bottom (pt)"
                                        value={activeReceiptSpacing.bottom}
                                        step={5}
                                        onChange={(v) => onReceiptSpacingChange(activeDoc.id, 'bottom', v)}
                                    />
                                    <Stepper
                                        label="From Left (pt)"
                                        value={activeReceiptSpacing.left}
                                        step={5}
                                        onChange={(v) => onReceiptSpacingChange(activeDoc.id, 'left', v)}
                                    />
                                    <Stepper
                                        label="Line Spacing (pt)"
                                        value={activeReceiptSpacing.rowGap}
                                        step={1}
                                        onChange={(v) => onReceiptSpacingChange(activeDoc.id, 'rowGap', v)}
                                    />
                                </div>
                            </AccordionSection>
                        )}

                        {isLandholdingDoc && (
                            <AccordionSection title="Property Table Layout" onReset={() => onResetTableSpacing(activeDoc.id)}>
                                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                    <div style={{ flex: 1, minWidth: 120 }}>
                                        <Stepper
                                            label="Row Height (pt)"
                                            value={activeTableSpacing.rowHeight}
                                            step={2}
                                            min={10}
                                            onChange={(v) => onTableSpacingChange(activeDoc.id, 'rowHeight', v)}
                                        />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 120 }}>
                                        <Stepper
                                            label="Row Text Size (pt)"
                                            value={activeTableSpacing.fontSize}
                                            step={1}
                                            min={6}
                                            onChange={(v) => onTableSpacingChange(activeDoc.id, 'fontSize', v)}
                                        />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 120 }}>
                                        <Stepper
                                            label="Header Text Size (pt)"
                                            value={activeTableSpacing.headerFontSize}
                                            step={1}
                                            min={6}
                                            onChange={(v) => onTableSpacingChange(activeDoc.id, 'headerFontSize', v)}
                                        />
                                    </div>
                                </div>

                                <div className="pd-field-label" style={{ marginTop: 12, marginBottom: 6 }}>Column Widths &amp; Margins</div>
                                <ColumnWidthBar
                                    colWidths={activeTableSpacing.colWidths}
                                    onChange={(updates) => onColWidthsChange(activeDoc.id, updates)}
                                />
                                <span className="pd-queue-hint" style={{ display: 'block', marginTop: 6 }}>
                                    Drag the two outer handles to add left/right margin around the table — everything
                                    in between stays proportioned to the six columns. The table auto-flows onto a new
                                    page (repeating the header) after 15 rows.
                                </span>
                            </AccordionSection>
                        )}

                        {/* ── NLH ACCORDIONS ────────────────────────────────── */}
                        {isNLHDoc && (
                            <AccordionSection
                                title="Signature Layout"
                                onReset={() => onResetNLHSpacing?.(activeDoc.id)}
                            >
                                <div className="pd-sig-selectors">
                                    <Stepper
                                        label="Space Above Signatures (pt)"
                                        value={activeNLHSpacing.sigMarginTop}
                                        step={5}
                                        onChange={(v) => onNLHSpacingChange?.(activeDoc.id, 'sigMarginTop', v)}
                                    />
                                    <Stepper
                                        label="Space Between Signatories (pt)"
                                        value={activeNLHSpacing.sigBlockGap}
                                        step={5}
                                        onChange={(v) => onNLHSpacingChange?.(activeDoc.id, 'sigBlockGap', v)}
                                    />
                                </div>

                                <div className="pd-sig-selectors" style={{ marginTop: 10 }}>
                                    <Stepper
                                        label="Signatory Name Text Size (pt)"
                                        value={activeNLHSpacing.nameFontSize}
                                        step={1}
                                        min={6}
                                        onChange={(v) => onNLHSpacingChange?.(activeDoc.id, 'nameFontSize', v)}
                                    />
                                    <Stepper
                                        label="Signatory Title Text Size (pt)"
                                        value={activeNLHSpacing.titleFontSize}
                                        step={1}
                                        min={6}
                                        onChange={(v) => onNLHSpacingChange?.(activeDoc.id, 'titleFontSize', v)}
                                    />
                                </div>
                                <div className="pd-form-group" style={{ marginTop: 10 }}>
                                    <Stepper
                                        label="Signatory Block Width (pt)"
                                        value={activeNLHSpacing.sigBlockWidth}
                                        step={10}
                                        min={100}
                                        onChange={(v) => onNLHSpacingChange?.(activeDoc.id, 'sigBlockWidth', v)}
                                    />
                                </div>

                                <div className="pd-sig-selectors" style={{ marginTop: 10 }}>
                                    <Stepper
                                        label="Signatory 1 — Left/Right Position (pt)"
                                        value={activeNLHSpacing.offsetX1}
                                        step={5}
                                        min={-400}
                                        onChange={(v) => onNLHSpacingChange?.(activeDoc.id, 'offsetX1', v)}
                                    />
                                    <Stepper
                                        label="Signatory 2 — Left/Right Position (pt)"
                                        value={activeNLHSpacing.offsetX2}
                                        step={5}
                                        min={-400}
                                        onChange={(v) => onNLHSpacingChange?.(activeDoc.id, 'offsetX2', v)}
                                    />
                                </div>
                                <span className="pd-queue-hint">
                                    Negative values move a signatory left, positive values move right.
                                    Name and title move together as one block.
                                </span>
                            </AccordionSection>
                        )}

                        {isNLHDoc && (
                            <AccordionSection
                                title="Receipt Block"
                                onReset={() => onResetNLHSpacing?.(activeDoc.id)}
                            >
                                <div className="pd-sig-selectors">
                                    <Stepper
                                        label="From Bottom (pt)"
                                        value={activeNLHSpacing.receiptBottom}
                                        step={5}
                                        onChange={(v) => onNLHSpacingChange?.(activeDoc.id, 'receiptBottom', v)}
                                    />
                                    <Stepper
                                        label="From Left (pt)"
                                        value={activeNLHSpacing.receiptLeft}
                                        step={5}
                                        onChange={(v) => onNLHSpacingChange?.(activeDoc.id, 'receiptLeft', v)}
                                    />
                                    <Stepper
                                        label="Line Spacing (pt)"
                                        value={activeNLHSpacing.receiptRowGap}
                                        step={1}
                                        onChange={(v) => onNLHSpacingChange?.(activeDoc.id, 'receiptRowGap', v)}
                                    />
                                </div>
                            </AccordionSection>
                        )}
                    </div>
                )}

                {/* Card 4 — Released By */}
                <div className="pd-sidebar-card">
                    <div className="pd-form-group" style={{ marginBottom: 0 }}>
                        <label className="pd-field-label">Released by</label>
                        <CustomSelect
                            value={releasedBy}
                            onChange={(id) => { setReleasedBy(id); setReleasedByError(''); }}
                            options={staffOptions}
                            placeholder="-- Select releasing staff --"
                            searchable
                            searchPlaceholder="Search staff..."
                            disabled={isSubmitting}
                        />
                        {releasedByError && <span className="pd-field-error" style={{ marginTop: '6px', display: 'block' }}>{releasedByError}</span>}
                    </div>
                </div>

                {/* Card 5 — Actions */}
                <div className="pd-sidebar-actions-bottom">
                    <div className="pd-actions-row-compact">
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="pd-btn pd-btn--print-action"
                            disabled={!activePreview || !isPreviewLoaded || isPrinting}
                        >
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            {activePreview && !isPreviewLoaded ? 'Preparing…' : 'Print'}
                        </button>

                        {activePreview ? (
                            <a
                                href={activePreview.url}
                                download={`${activePreview.label}.pdf`}
                                className="pd-btn pd-btn--download-action"
                            >
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download
                            </a>
                        ) : (
                            <button type="button" className="pd-btn pd-btn--download-action" disabled>
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download
                            </button>
                        )}
                    </div>

                    <div className="pd-actions-divider">
                        <span>or</span>
                    </div>

                    {onQueueForRelease && (
                        <div className="pd-queue-block">
                            <button
                                type="button"
                                onClick={handleQueueForRelease}
                                disabled={busy}
                                className="pd-btn pd-btn--queue-outline"
                            >
                                {isQueuing ? (
                                    <>
                                        <span className="pd-btn-spinner" />
                                        Saving…
                                    </>
                                ) : (
                                    <>
                                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="9" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
                                        </svg>
                                        Save &amp; Release Later
                                    </>
                                )}
                            </button>
                            <span className="pd-queue-hint">
                                Client not here yet? This keeps the documents ready in the Pending For Release queue.
                            </span>
                            {queueError && (
                                <span className="pd-field-error" style={{ marginTop: '6px', display: 'block' }}>
                                    {queueError}
                                </span>
                            )}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleRelease}
                        disabled={busy}
                        className="pd-btn pd-btn--download-large"
                    >
                        {isSubmitting ? 'Processing...' : 'Mark as Released'}
                    </button>
                </div>
            </div>

            {/* Release guard modal */}
            {showGuardModal && (
                <div className="pd-guard-overlay" role="dialog" aria-modal="true" aria-labelledby="pd-guard-title">
                    <div className="pd-guard-modal">
                        <div className="pd-guard-icon">
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86l-8.18 14.18A1.5 1.5 0 003.5 20.5h17a1.5 1.5 0 001.39-2.46L13.71 3.86a1.5 1.5 0 00-2.42 0z" />
                            </svg>
                        </div>
                        <h3 id="pd-guard-title">These documents haven't been released yet</h3>
                        <p>
                            Leaving this page without an action can cause document mistracking. Resolve
                            <strong> {documents.length}</strong> {documents.length === 1 ? 'document' : 'documents'} by choosing{' '}
                            <strong>Mark as Released</strong> or <strong>Save &amp; Release Later</strong> below —
                            or stay on this page to finish.
                        </p>
                        <div className="pd-guard-actions">
                            {onQueueForRelease && (
                                <button
                                    type="button"
                                    className="pd-btn pd-btn--queue-outline"
                                    onClick={handleQueueForRelease}
                                    disabled={busy}
                                >
                                    {isQueuing ? 'Saving…' : 'Save & Release Later'}
                                </button>
                            )}
                            <button
                                type="button"
                                className="pd-btn pd-btn--download-large"
                                onClick={handleRelease}
                                disabled={busy}
                            >
                                {isSubmitting ? 'Processing...' : 'Mark as Released'}
                            </button>
                        </div>
                        {(queueError || releasedByError) && (
                            <span className="pd-field-error" style={{ display: 'block', marginTop: '4px' }}>
                                {queueError || releasedByError}
                            </span>
                        )}
                        <button type="button" className="pd-guard-stay" onClick={dismissGuard} disabled={busy}>
                            Stay on this page
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};