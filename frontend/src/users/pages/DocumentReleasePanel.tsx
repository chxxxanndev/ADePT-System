import React, { useRef, useState } from 'react';
import '../styles/DocumentReleasePanel.css';

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
}

// Helper to determine badge styling and icons dynamically based on Document prefix
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
            )
        };
    }
    if (ref.startsWith('NLH')) {
        return {
            className: 'pd-doc-badge--nlh',
            label: 'Certificate of No Landholding',
            icon: (
                <svg className="pd-badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        };
    }
    return {
        className: 'pd-doc-badge--lh',
        label: doc.documentType || 'Certificate of Landholding',
        icon: (
            <svg className="pd-badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
        )
    };
};

// HELPER: Truncates long strings so the native OS dropdown doesn't bleed out of bounds
const truncateText = (text: string, maxLength: number = 45) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
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
}) => {
    const [releasedBy, setReleasedBy] = useState('');
    const [releasedByError, setReleasedByError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const activeDoc = documents.find(d => d.id === activePreview?.docId) || documents[0];

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
            onReleased();
        } catch (err: any) {
            setReleasedByError(err?.message || 'Failed to mark as released.');
            setIsSubmitting(false);
        }
    };

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

                {/* Status row — now a separate element, sitting above the Payment Verified card */}
                <div className="pd-status-row">
                    <span className="pd-status-badge pd-status-badge--standalone">Pending for Release</span>
                </div>

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
                                        <div className={`pd-doc-badge ${badgeConfig.className}`}>
                                            {badgeConfig.icon}
                                            {doc.referenceNumber}
                                        </div>
                                        <span className="pd-doc-type-label">{badgeConfig.label}</span>
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
                        <div className={`pd-sig-selectors${activeDoc.referenceNumber.startsWith('TD') ? ' pd-sig-selectors--single' : ''}`}>
                            <div className="pd-form-group">
                                <label className="pd-field-label">
                                    {activeDoc.referenceNumber.startsWith('TD') ? 'Certified Copy (Authorized Signatory)' : 'Signatory 1'}
                                </label>
                                <select
                                    className="pd-select-fixed"
                                    value={docSignatories[activeDoc.id]?.primary?.id || ''}
                                    onChange={(e) => onSignatoryChange(activeDoc.id, 'primary', e.target.value)}
                                    title={activeSignatories.find(s => s.id === docSignatories[activeDoc.id]?.primary?.id)?.name}
                                >
                                    {activeSignatories.map(sig => {
                                        const fullText = `${sig.name} — ${sig.title}`;
                                        return (
                                            <option key={sig.id} value={sig.id} title={fullText}>
                                                {truncateText(fullText)}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            {!activeDoc.referenceNumber.startsWith('TD') && (
                                <div className="pd-form-group">
                                    <label className="pd-field-label">Signatory 2 </label>
                                    <select
                                        className="pd-select-fixed"
                                        value={docSignatories[activeDoc.id]?.secondary?.id || ''}
                                        onChange={(e) => onSignatoryChange(activeDoc.id, 'secondary', e.target.value)}
                                        title={activeSignatories.find(s => s.id === docSignatories[activeDoc.id]?.secondary?.id)?.name}
                                    >
                                        <option value="">-- None --</option>
                                        {activeSignatories.map(sig => {
                                            const fullText = `${sig.name} — ${sig.title}`;
                                            return (
                                                <option key={sig.id} value={sig.id} title={fullText}>
                                                    {truncateText(fullText)}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Card 4 — Released By */}
                <div className="pd-sidebar-card">
                    <div className="pd-form-group" style={{ marginBottom: 0 }}>
                        <label className="pd-field-label">Released by</label>
                        <select
                            className="pd-select-fixed"
                            value={releasedBy}
                            onChange={(e) => { setReleasedBy(e.target.value); setReleasedByError(''); }}
                            disabled={isSubmitting}
                        >
                            <option value="">-- Select releasing staff --</option>
                            {releaseStaffOptions.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                        {releasedByError && <span className="pd-field-error" style={{ marginTop: '6px', display: 'block' }}>{releasedByError}</span>}
                    </div>
                </div>

                {/* Card 5 — Actions */}
                <div className="pd-sidebar-actions-bottom">
                    <div className="pd-actions-row-compact">
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="pd-btn pd-btn--secondary-outline"
                            disabled={!activePreview}
                        >
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Print
                        </button>

                        {activePreview ? (
                            <a
                                href={activePreview.url}
                                download={`${activePreview.label}.pdf`}
                                className="pd-btn pd-btn--secondary-outline"
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download
                            </a>
                        ) : (
                            <button type="button" className="pd-btn pd-btn--secondary-outline" disabled style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download
                            </button>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={handleRelease}
                        disabled={isSubmitting}
                        className="pd-btn pd-btn--download-large"
                    >
                        {isSubmitting ? 'Processing...' : 'Mark as Released'}
                    </button>
                </div>
            </div>
        </div>
    );
};