import React from 'react';

interface DocumentVerificationPanelProps {
    documents: any[];
    requesterName: string;
    totalAmount: number;

    orNumber: string;
    onOrNumberChange: (value: string) => void;
    isVerified: boolean;
    isVerifying: boolean;
    isOverridden: boolean;
    justification: string;
    fieldErrors: { orNumber?: string };
    onVerify: () => void;
    onEditVerify: () => void;

    onPreviewDoc: (doc: any) => void;
    onConfirmAndGenerate: () => void;
}

const currency = (n: number) => `\u20B1 ${n.toFixed(2)}`;

const docTypeLabel = (doc: any) =>
    doc.documentType ||
    (doc.referenceNumber.startsWith('TD')
        ? 'Tax Declaration'
        : doc.referenceNumber.startsWith('NLH')
            ? 'Certificate of No Landholding'
            : 'Certificate of Landholding');

// Maps a reference number prefix to a badge variant so ref numbers are
// scannable at a glance (mirrors the color-coding used in the compact
// document cards elsewhere in the app).
const refBadgeVariant = (referenceNumber: string) => {
    if (referenceNumber.startsWith('NLH')) return 'pd-ref-badge--nlh';
    if (referenceNumber.startsWith('LH')) return 'pd-ref-badge--lh';
    if (referenceNumber.startsWith('TD')) return 'pd-ref-badge--td';
    return 'pd-ref-badge--default';
};

const EyeIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

const PencilIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
);

export const DocumentVerificationPanel: React.FC<DocumentVerificationPanelProps> = ({
    documents,
    totalAmount,
    orNumber,
    onOrNumberChange,
    isVerified,
    isVerifying,
    isOverridden,
    justification,
    fieldErrors,
    onVerify,
    onEditVerify,
    onPreviewDoc,
    onConfirmAndGenerate,
}) => {
    return (
        <div className="pd-split-layout">
            {/* LEFT COLUMN: DOCUMENTS ONLY — signatories moved to the release step */}
            <div className="pd-col-left">
                <div className="pd-section-label">Verify Document Details ({documents.length})</div>
                <div className="pd-doc-table-wrap">
                    <table className="pd-doc-table">
                        <thead>
                            <tr>
                                <th>Ref. No</th>
                                <th>Type</th>
                                <th>Declarant / Owner</th>
                                <th className="pd-col-action">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {documents.map((doc: any, i: number) => (
                                <tr key={doc.id || i}>
                                    <td>
                                        <span className={`pd-ref-badge ${refBadgeVariant(doc.referenceNumber)}`}>
                                            {doc.referenceNumber}
                                        </span>
                                    </td>
                                    <td className="pd-doc-type">{docTypeLabel(doc)}</td>
                                    <td className="pd-doc-declarant">{doc.declarantName || doc.declarant_name}</td>
                                    <td className="pd-col-action">
                                        <button
                                            onClick={() => onPreviewDoc(doc)}
                                            className="pd-btn--view-details"
                                            title="View and edit encoded details"
                                        >
                                            <EyeIcon /> View & Edit
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="pd-total-row">
                    <div className="pd-total-label">Total Payment Due</div>
                    <div className="pd-total-value">{currency(totalAmount)}</div>
                </div>
            </div>

            {/* RIGHT COLUMN: RECEIPT + CONFIRM */}
            <div className="pd-col-right">
                <div className="pd-receipt-card">
                    <div className="pd-section-label">Treasurer Receipt Details</div>

                    {isVerified && isOverridden && (
                        <div className="pd-override-badge-card">
                            <div className="pd-override-badge-header"><span>⚠️ Shared Receipt (Manual Override)</span></div>
                            <div className="pd-override-badge-body"><strong>Justification:</strong> {justification}</div>
                        </div>
                    )}

                    <div className="pd-form-group">
                        <label className="pd-field-label">Official Receipt (O.R.) Number</label>

                        {!isVerified ? (
                            <>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={8}
                                    placeholder="#1127307"
                                    value={orNumber}
                                    onChange={(e) => onOrNumberChange(e.target.value.replace(/\D/g, ''))}
                                    className={`pd-field-input pd-field-input--or${fieldErrors.orNumber ? ' pd-field-invalid' : ''}`}
                                />
                                {fieldErrors.orNumber && <span className="pd-field-error">{fieldErrors.orNumber}</span>}
                            </>
                        ) : (
                            <div className="pd-or-display">
                                <span className="pd-or-spacer" aria-hidden="true"></span>
                                <span className="pd-or-value">{orNumber}</span>
                                <button
                                    type="button"
                                    onClick={onEditVerify}
                                    className="pd-btn-icon-edit"
                                    title="Edit O.R. Number"
                                    aria-label="Edit O.R. Number"
                                >
                                    <PencilIcon />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="pd-actions-row">
                        {!isVerified ? (
                            <button onClick={onVerify} disabled={isVerifying} className="pd-btn pd-btn--verify">
                                {isVerifying ? 'Verifying Receipt...' : 'Verify Receipt'}
                            </button>
                        ) : (
                            <button onClick={onConfirmAndGenerate} className="pd-btn pd-btn--print pd-btn--compact">
                                Confirm & Generate Document(s)
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};