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
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {documents.map((doc: any, i: number) => (
                                <tr key={doc.id || i}>
                                    <td className="pd-doc-ref">{doc.referenceNumber}</td>
                                    <td className="pd-doc-type">{docTypeLabel(doc)}</td>
                                    <td className="pd-doc-declarant">{doc.declarantName || doc.declarant_name}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button
                                            onClick={() => onPreviewDoc(doc)}
                                            style={{ color: '#4f46e5', backgroundColor: '#e0e7ff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 500, cursor: 'pointer', fontSize: '13px' }}
                                            title="Preview initial form details & edit typos"
                                        >
                                            👁 Preview / Edit Details
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
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="e.g. 1234567"
                            value={orNumber}
                            onChange={(e) => onOrNumberChange(e.target.value.replace(/\D/g, ''))}
                            disabled={isVerified}
                            className={`pd-field-input${fieldErrors.orNumber ? ' pd-field-invalid' : ''}`}
                        />
                        {fieldErrors.orNumber && <span className="pd-field-error">{fieldErrors.orNumber}</span>}
                    </div>

                    <div className="pd-actions-row">
                        {!isVerified ? (
                            <button onClick={onVerify} disabled={isVerifying} className="pd-btn pd-btn--verify">
                                {isVerifying ? 'Verifying Receipt...' : 'Verify Receipt'}
                            </button>
                        ) : (
                            <div className="pd-verified-actions" style={{ flexDirection: 'column', gap: '10px' }}>
                                <button onClick={onEditVerify} className="pd-btn pd-btn--edit-verify">Edit OR Info</button>
                                <button
                                    onClick={onConfirmAndGenerate}
                                    className="pd-btn pd-btn--print"
                                    style={{ backgroundColor: '#22c55e', color: 'white' }}
                                >
                                    Confirm & Generate Document(s) &rarr;
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};