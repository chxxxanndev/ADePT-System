import { useState, useEffect } from 'react';
import { requestService } from '../services/requestService';
import { InitialDocumentPreviewModal } from '../components/InitialDocumentPreviewModal';
import '../styles/PaymentDetails.css';

interface PaymentDetailsProps {
    payment: any | null;
    onBack: () => void;
    onEditDocument?: (referenceNumber: string) => void;
}

export function PaymentDetails({ payment, onBack }: PaymentDetailsProps) {
    const [orNumber, setOrNumber] = useState('');
    const [isVerified, setIsVerified] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<{ orNumber?: string }>({});
    const [banner, setBanner] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

    const [showOverrideModal, setShowOverrideModal] = useState(false);
    const [isOverridden, setIsOverridden] = useState(false);
    const [justification, setJustification] = useState('');
    const [justificationError, setJustificationError] = useState('');
    const [existingRequestInfo, setExistingRequestInfo] = useState<{ referenceNumber?: string; declarantName?: string } | null>(null);

    const [documents, setDocuments] = useState<any[]>([]);
    const [selectedDocForPreview, setSelectedDocForPreview] = useState<any | null>(null);

    useEffect(() => {
        if (payment && payment.documents) {
            setDocuments(payment.documents);
        }
    }, [payment]);

    if (!payment) {
        return (
            <div className="pd-page">
                <div className="pd-panel">
                    <div className="pd-body" style={{ textAlign: 'center' }}>
                        Payment data missing. Please go back and select a client from the queue.
                    </div>
                </div>
            </div>
        );
    }

    const requesterName = payment.requesterName;
    const totalAmount = payment.totalAmountDue;
    const currency = (n: number) => `\u20B1 ${n.toFixed(2)}`;

    // --- O.R. VERIFICATION (SIGNATORY COMPLETELY REMOVED) ---
    const handleVerify = async () => {
        const errors: { orNumber?: string } = {};
        if (!orNumber.trim()) errors.orNumber = 'Enter the Treasurer O.R. number.';
        setFieldErrors(errors);

        if (Object.keys(errors).length > 0) {
            setBanner({ type: 'error', text: 'Please enter a valid O.R. number.' });
            return;
        }

        setBanner(null);
        setIsVerifying(true);

        try {
            const mainRequestId = payment.groupId || payment.id;
            const res = await requestService.checkOrUniqueness(orNumber.trim(), mainRequestId);

            if (res && res.isUnique === false) {
                setExistingRequestInfo(res.existingRequest || null);
                setShowOverrideModal(true);
            } else {
                setIsVerified(true);
                setIsOverridden(false);
                setJustification('');
                setBanner({ type: 'success', text: 'Official Receipt verified as unique.' });
            }
        } catch (err: any) {
            console.error("Error during O.R. verification:", err);
            setShowOverrideModal(true);
        } finally {
            setIsVerifying(false);
        }
    };

    const handleConfirmOverride = () => {
        if (!justification.trim()) {
            setJustificationError('Please provide a justification for using a shared/duplicate O.R.');
            return;
        }
        setJustificationError('');
        setShowOverrideModal(false);
        setIsOverridden(true);
        setIsVerified(true);
        setBanner({ type: 'success', text: 'O.R. Number verified via Manual Override (Shared Receipt).' });
    };

    const handleEditVerify = () => {
        setIsVerified(false);
        setIsOverridden(false);
        setBanner(null);
    };

    // --- UPDATE LOCAL STATE WHEN DB EDIT SUCCEEDS ---
    const handleUpdateSuccess = (updatedDoc: any) => {
        setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
        setBanner({ type: 'success', text: `Successfully updated details for ${updatedDoc.referenceNumber}.` });
        setSelectedDocForPreview(null);
    };

    // --- RELEASE TRANSACTION (NO SIGNATORY REQUIRED FOR NOW) ---
    const handleFinalRelease = async () => {
        setBanner(null);
        try {
            await Promise.all(documents.map((doc: any) =>
                requestService.releaseRequest(doc.id, {
                    orNumber: orNumber.trim(),
                    isOverridden,
                    justification: isOverridden ? justification : undefined
                })
            ));
            setBanner({ type: 'success', text: 'Documents recorded successfully. Returning to queue...' });
            setTimeout(() => onBack(), 2000);
        } catch (err: any) {
            setBanner({ type: 'error', text: err?.response?.data?.error || err?.message || 'Failed to update transaction in database.' });
        }
    };

    return (
        <div className="pd-page page-transition">
            <div className="pd-panel">
                <div className="pd-header-banner">
                    <button onClick={onBack} className="pd-header-back-btn" title="Back to Queue">&larr;</button>
                    <div className="pd-header-text">
                        <h2 className="pd-header-title">Final Verification & Payment</h2>
                        <span className="pd-header-subtitle">Prepare documents for <strong>{requesterName}</strong></span>
                    </div>
                </div>

                <div className="pd-body">
                    {banner && <div className={`pd-banner pd-banner--${banner.type}`}>{banner.text}</div>}

                    <div className="pd-split-layout">
                        {/* LEFT COLUMN: REVIEW & PREVIEW/EDIT */}
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
                                                <td className="pd-doc-type">{doc.documentType}</td>
                                                <td className="pd-doc-declarant">{doc.declarantName || doc.declarant_name}</td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <button
                                                        onClick={() => setSelectedDocForPreview(doc)}
                                                        style={{
                                                            color: '#4f46e5',
                                                            backgroundColor: '#e0e7ff',
                                                            border: 'none',
                                                            padding: '6px 12px',
                                                            borderRadius: '6px',
                                                            fontWeight: 500,
                                                            cursor: 'pointer'
                                                        }}
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

                        {/* RIGHT COLUMN: RECEIPT */}
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
                                        type="text" placeholder="e.g. 1234567" value={orNumber}
                                        onChange={(e) => { setOrNumber(e.target.value); setIsVerified(false); setIsOverridden(false); }}
                                        disabled={isVerified}
                                        className={`pd-field-input${fieldErrors.orNumber ? ' pd-field-invalid' : ''}`}
                                    />
                                    {fieldErrors.orNumber && <span className="pd-field-error">{fieldErrors.orNumber}</span>}
                                </div>

                                <div className="pd-actions-row">
                                    {!isVerified ? (
                                        <button onClick={handleVerify} disabled={isVerifying} className="pd-btn pd-btn--verify">
                                            {isVerifying ? 'Verifying Receipt...' : 'Verify Receipt'}
                                        </button>
                                    ) : (
                                        <div className="pd-verified-actions">
                                            <button onClick={handleEditVerify} className="pd-btn pd-btn--edit-verify">Edit OR Info</button>
                                            <button
                                                onClick={handleFinalRelease}
                                                className="pd-btn pd-btn--print"
                                                style={{ backgroundColor: '#22c55e', color: 'white' }}
                                            >
                                                Lock & Complete Payment
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* INITIAL PREVIEW & EDIT MODAL */}
            {selectedDocForPreview && (
                <InitialDocumentPreviewModal
                    documentItem={selectedDocForPreview}
                    onClose={() => setSelectedDocForPreview(null)}
                    onUpdateSuccess={handleUpdateSuccess}
                />
            )}

            {/* OVERRIDE MODAL */}
            {showOverrideModal && (
                <div className="pd-modal-overlay">
                    <div className="pd-modal">
                        <div className="pd-modal-header"><h3>⚠️ Duplicate / Shared Receipt Detected</h3></div>
                        <div className="pd-modal-body">
                            <p>Official Receipt <strong>#{orNumber}</strong> is already recorded in the system{existingRequestInfo?.referenceNumber && ` (Ref: ${existingRequestInfo.referenceNumber} - ${existingRequestInfo.declarantName})`}.</p>
                            <div className="pd-form-group" style={{ marginTop: '16px' }}>
                                <label className="pd-field-label">Override Justification *</label>
                                <textarea className={`pd-field-textarea${justificationError ? ' pd-field-invalid' : ''}`} rows={3} value={justification} onChange={(e) => { setJustification(e.target.value); setJustificationError(''); }} />
                                {justificationError && <span className="pd-field-error">{justificationError}</span>}
                            </div>
                        </div>
                        <div className="pd-modal-footer">
                            <button onClick={() => setShowOverrideModal(false)} className="pd-btn pd-btn--secondary">Cancel</button>
                            <button onClick={handleConfirmOverride} className="pd-btn pd-btn--warning">Confirm Manual Override</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}