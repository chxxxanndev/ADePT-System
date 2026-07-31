import React, { useRef, useState } from 'react';

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
    onReleased: () => void; // called after a successful release — navigates to Transaction Registry
}

const docTypeLabel = (doc: any) =>
    doc.documentType ||
    (doc.referenceNumber.startsWith('TD')
        ? 'Tax Declaration'
        : doc.referenceNumber.startsWith('NLH')
            ? 'Certificate of No Landholding'
            : 'Certificate of Landholding');

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
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
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
            onReleased(); // goes straight to Transaction Registry — no separate confirmation click
        } catch (err: any) {
            setReleasedByError(err?.message || 'Failed to mark as released.');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="pd-split-layout pd-split-layout--viewer animation-fade-in">
            {/* LEFT COLUMN: PDF VIEWER — the primary focus, given the majority of the width */}
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
                            {/* <span className="pd-pdf-placeholder-icon">⏳</span> */}
                            Generating preview…
                        </div>
                    ) : (
                        <div className="pd-pdf-placeholder">
                            {/* <span className="pd-pdf-placeholder-icon">📄</span> */}
                            Select a document from the panel to preview
                        </div>
                    )}
                </div>
            </div>

            {/* Collapse toggle — sits on the seam, lets staff widen the preview */}
            <button
                type="button"
                className={`pd-sidebar-toggle${isSidebarCollapsed ? ' pd-sidebar-toggle--collapsed' : ''}`}
                onClick={() => setIsSidebarCollapsed(prev => !prev)}
                title={isSidebarCollapsed ? 'Show release panel' : 'Hide panel for a larger preview'}
                aria-label={isSidebarCollapsed ? 'Show release panel' : 'Hide release panel'}
            >
                {isSidebarCollapsed ? '‹' : '›'}
            </button>

            {/* RIGHT COLUMN: STATUS, DOCUMENT LIST, SIGNATORY CHECK, RELEASE CONTROLS —
                organized as independent cards with generous spacing between them. */}
            <div className={`pd-col-right pd-sidebar-controls${isSidebarCollapsed ? ' pd-sidebar-collapsed' : ''}`}>

                {/* Card 1 — Payment Status (single source of truth for the O.R. number) */}
                <div className="pd-success-header">
                    <div className="pd-success-header-info">
                        <div className="pd-success-icon-small">✓</div>
                        <div>
                            <h3>Payment Verified</h3>
                            <p>O.R. #{orNumber} · {documents.length} document{documents.length > 1 ? 's' : ''}</p>
                        </div>
                    </div>
                    <span className="pd-status-badge">Pending release</span>
                </div>

                {/* Card 2 — Documents */}
                <div className="pd-sidebar-card">
                    <div className="pd-section-label">Documents ({documents.length})</div>

                    <div className="pd-print-list-compact">
                        {documents.map((doc: any) => {
                            const isActive = activePreview?.docId === doc.id;
                            return (
                                <div
                                    className={`pd-compact-card ${isActive ? 'pd-compact-card--active' : ''}`}
                                    key={doc.id}
                                    onClick={() => !isActive && onSelectDocument(doc)}
                                    role="button"
                                    tabIndex={0}
                                >
                                    <div className="pd-compact-info">
                                        <span className="pd-doc-ref">{doc.referenceNumber}</span>
                                        <span className="pd-doc-type pd-doc-type--sm">{docTypeLabel(doc)}</span>
                                    </div>
                                    <div className="pd-compact-action">
                                        {isGeneratingPdf === doc.id ? (
                                            <span className="pd-status-text">Loading...</span>
                                        ) : isActive ? (
                                            <span className="pd-status-text active-text">👁 Viewing</span>
                                        ) : (
                                            <button className="pd-btn pd-btn--tiny-view" type="button">View</button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Card 3 — Signatories. Selecting a name here re-renders the PDF preview
                    immediately, so what's picked is exactly what's on the printed document. */}
                {activeDoc && (
                    <div className="pd-sig-card">
                        <div className="pd-sig-card-header">
                            <span className="pd-section-label pd-section-label--flush">
                                Confirm signatories — {activeDoc.referenceNumber}
                            </span>
                        </div>
                        <div
                            className={`pd-sig-selectors${activeDoc.referenceNumber.startsWith('TD') ? ' pd-sig-selectors--single' : ''}`}
                        >
                            <div className="pd-form-group">
                                <label className="pd-field-label">
                                    {activeDoc.referenceNumber.startsWith('TD') ? 'Certified Copy (Authorized Signatory)' : 'Signatory 1 (Local Assessment Officer)'}
                                </label>
                                <select
                                    className="pd-field-select"
                                    value={docSignatories[activeDoc.id]?.primary?.id || ''}
                                    onChange={(e) => onSignatoryChange(activeDoc.id, 'primary', e.target.value)}
                                >
                                    {activeSignatories.map(sig => (
                                        <option key={sig.id} value={sig.id}>{sig.name} — {sig.title}</option>
                                    ))}
                                </select>
                            </div>

                            {!activeDoc.referenceNumber.startsWith('TD') && (
                                <div className="pd-form-group">
                                    <label className="pd-field-label">Signatory 2 (Assistant Provincial Assessor)</label>
                                    <select
                                        className="pd-field-select"
                                        value={docSignatories[activeDoc.id]?.secondary?.id || ''}
                                        onChange={(e) => onSignatoryChange(activeDoc.id, 'secondary', e.target.value)}
                                    >
                                        <option value="">-- None --</option>
                                        {activeSignatories.map(sig => (
                                            <option key={sig.id} value={sig.id}>{sig.name} — {sig.title}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Card 4 — Released By */}
                <div className="pd-sidebar-card">
                    <div className="pd-form-group">
                        <label className="pd-field-label">Released by *</label>
                        <select
                            className="pd-field-select"
                            value={releasedBy}
                            onChange={(e) => { setReleasedBy(e.target.value); setReleasedByError(''); }}
                            disabled={isSubmitting}
                        >
                            <option value="">-- Select releasing staff --</option>
                            {releaseStaffOptions.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                        {releasedByError && <span className="pd-field-error">{releasedByError}</span>}
                    </div>
                </div>

                {/* Card 5 — Actions. "Mark as released" is always the primary action. */}
                <div className="pd-sidebar-card pd-sidebar-actions-bottom">
                    <div className="pd-actions-row-compact">
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="pd-btn pd-btn--secondary-outline"
                            disabled={!activePreview}
                        >
                            🖨 Print
                        </button>

                        {activePreview ? (
                            <a
                                href={activePreview.url}
                                download={`${activePreview.label}.pdf`}
                                className="pd-btn pd-btn--secondary-outline"
                            >
                                ⬇ Download
                            </a>
                        ) : (
                            <button type="button" className="pd-btn pd-btn--secondary-outline" disabled>
                                ⬇ Download
                            </button>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={handleRelease}
                        disabled={isSubmitting}
                        className="pd-btn pd-btn--download-large"
                    >
                        {isSubmitting ? 'Releasing...' : 'Mark as released'}
                    </button>
                </div>
            </div>
        </div>
    );
};