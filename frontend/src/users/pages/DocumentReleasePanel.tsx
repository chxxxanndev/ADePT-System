import React, { useEffect, useRef, useState } from 'react';
import '../styles/DocumentReleasePanel.css';
import { CustomSelect } from '../components/CustomSelect';

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

interface DocumentReleasePanelProps {
    documents: any[];
    orNumber: string;
    activePreview: ActivePreview | null;
    isGeneratingPdf: string | null;
    onSelectDocument: (doc: any) => void;

    activeSignatories: Signatory[];
    docSignatories: Record<string, any>;
    onSignatoryChange: (docId: string, roleType: 'primary' | 'secondary', sigId: string) => void;

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

    // LH (Landholding) — plain document-with-text-lines icon, matching the
    // reference screenshot (folded-corner page with horizontal text rules).
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

export const DocumentReleasePanel: React.FC<DocumentReleasePanelProps> = ({
    documents,
    orNumber,
    activePreview,
    isGeneratingPdf,
    onSelectDocument,
    activeSignatories,
    docSignatories,
    onSignatoryChange,
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

    // --- Release guard state -------------------------------------------------
    // Tracks whether the user has resolved this panel via one of the two
    // sanctioned exits: "Save & Release Later" or "Mark as Released". Until
    // one of those succeeds, leaving the page (closing/refreshing the tab,
    // navigating to an external link, or clicking an in-app link) is
    // intercepted and the user is asked to choose an action.
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

    const handlePrint = () => {
        iframeRef.current?.contentWindow?.focus();
        iframeRef.current?.contentWindow?.print();
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
            // If the release guard intercepted a navigation attempt, let it
            // proceed now that the panel has been resolved.
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

    // --- Native browser exits (tab close, refresh, address-bar navigation) ---
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (actionTaken) return;
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [actionTaken]);

    // --- In-app link clicks (navigating to another page within the app) -----
    // Intercepts clicks on plain <a href> links so a custom modal — rather
    // than the browser's native beforeunload prompt — can walk the user
    // toward "Save & Release Later" or "Mark as Released". Middle-clicks,
    // modifier-clicks, and target="_blank" links are left alone since those
    // open in a new tab/window and don't abandon this panel.
    //
    // Note: if this app navigates via a client-side router (e.g. React
    // Router) rather than plain <a> tags, wire this same actionTaken check
    // into that router's navigation-blocking hook (e.g. useBlocker) for
    // full coverage — this listener only catches anchor-tag clicks.
    useEffect(() => {
        const handleClickCapture = (e: MouseEvent) => {
            if (actionTaken) return;
            if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

            const anchor = (e.target as HTMLElement)?.closest('a[href]') as HTMLAnchorElement | null;
            if (!anchor || anchor.target === '_blank') return;

            const href = anchor.getAttribute('href') || '';
            if (!href || href.startsWith('#')) return;

            e.preventDefault();
            e.stopPropagation();
            pendingNavigationRef.current = () => {
                window.location.href = href;
            };
            setShowGuardModal(true);
        };

        document.addEventListener('click', handleClickCapture, true);
        return () => document.removeEventListener('click', handleClickCapture, true);
    }, [actionTaken]);

    return (
        <div className="pd-split-layout pd-split-layout--viewer animation-fade-in">
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

                {/* Card 3 — Signatories */}
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
                                    />
                                </div>
                            )}
                        </div>
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
                            disabled={!activePreview}
                        >
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Print
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

            {/* Release guard modal — blocks silent navigation away from an
                unresolved release. Forces a choice between the two
                sanctioned exits, or lets the user stay and finish up. */}
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
                            Choose one of the actions below before leaving this page, or stay to finish up.
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