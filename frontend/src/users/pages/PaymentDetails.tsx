import { useState, useEffect } from 'react';
import { requestService } from '../services/requestService';
import { taxDeclarationService } from '../services/taxDeclarationService';
import { landholdingService } from '../services/landholdingService';
import { noLandholdingService } from '../services/noLandholdingService';
import { DocumentPreviewModal, type DocumentItem } from '../components/DocumentPreviewModal';
import '../styles/PaymentDetails.css';

interface PaymentDetailsProps {
    payment: any | null;
    onBack: () => void;
    onEditDocument: (referenceNumber: string) => void;
}

export function PaymentDetails({ payment, onBack, onEditDocument }: PaymentDetailsProps) {
    const [orNumber, setOrNumber] = useState('');
    const [signatory, setSignatory] = useState('');
    const [isVerified, setIsVerified] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<{ orNumber?: string; signatory?: string }>({});
    const [banner, setBanner] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

    const [showOverrideModal, setShowOverrideModal] = useState(false);
    const [isOverridden, setIsOverridden] = useState(false);
    const [justification, setJustification] = useState('');
    const [justificationError, setJustificationError] = useState('');
    const [existingRequestInfo, setExistingRequestInfo] = useState<{ referenceNumber?: string; declarantName?: string } | null>(null);

    const [showPreview, setShowPreview] = useState(false);
    const [previewDocuments, setPreviewDocuments] = useState<DocumentItem[]>([]);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);

    const [documents, setDocuments] = useState<any[]>([]);

    // Load initial documents
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
    const getOrdinal = (d: number) => {
        if (d > 3 && d < 21) return 'th';
        switch (d % 10) { case 1: return "st"; case 2: return "nd"; case 3: return "rd"; default: return "th"; }
    };

    // --- O.R. VERIFICATION ---
    const handleVerify = async () => {
        const errors: { orNumber?: string; signatory?: string } = {};
        if (!orNumber.trim()) errors.orNumber = 'Enter the Treasurer O.R. number.';
        if (!signatory) errors.signatory = 'Select an authorized signatory.';
        setFieldErrors(errors);

        if (Object.keys(errors).length > 0) {
            setBanner({ type: 'error', text: 'Please complete the verification details.' });
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

    // --- GENERATE PREVIEW ---
    const handleOpenPreview = async () => {
        setIsLoadingPreview(true);
        setBanner(null);

        try {
            const items: DocumentItem[] = [];

            for (const doc of documents) {
                const typeStr = doc.documentType?.toLowerCase() || '';
                let docType: 'TAX_DEC' | 'LANDHOLDING' | 'NO_LANDHOLDING' = 'TAX_DEC';
                let rawBackendData: any = null;

                if (typeStr.includes('no landholding')) docType = 'NO_LANDHOLDING';
                else if (typeStr.includes('landholding')) docType = 'LANDHOLDING';
                else docType = 'TAX_DEC';

                try {
                    if (docType === 'TAX_DEC') rawBackendData = await taxDeclarationService.getTaxDeclaration(doc.id);
                    else if (docType === 'LANDHOLDING') rawBackendData = await landholdingService.getByRequestId(doc.id);
                    else rawBackendData = await noLandholdingService.getByRequestId(doc.id);
                } catch (fetchErr) {
                    console.error(`Could not hydrate document ${doc.referenceNumber}`, fetchErr);
                    rawBackendData = doc;
                }

                let templateData: any = {};
                if (docType === 'TAX_DEC') {
                    templateData = rawBackendData;
                } else if (docType === 'LANDHOLDING') {
                    const dateObj = rawBackendData.date_given ? new Date(rawBackendData.date_given) : new Date();
                    const dayNum = dateObj.getDate();
                    templateData = {
                        ownerName: rawBackendData.declarant_name || doc.declarantName || requesterName,
                        day: `${dayNum}${getOrdinal(dayNum)}`,
                        monthYear: dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
                        certFee: rawBackendData.amountDue ? rawBackendData.amountDue.toFixed(2) : '40.00',
                        properties: (rawBackendData.properties || []).map((p: any) => ({
                            tdNo: p.td_arp_number, location: p.location_of_property, lotNo: p.lot_number,
                            titleNo: p.title_number, area: p.area, assdValue: p.assessed_value ? Number(p.assessed_value).toLocaleString(undefined, { minimumFractionDigits: 2 }) : ''
                        }))
                    };
                } else {
                    const dateObj = new Date();
                    templateData = {
                        ownerName: rawBackendData.declarantName || doc.declarantName || requesterName,
                        day: `${dateObj.getDate()}${getOrdinal(dateObj.getDate())}`,
                        monthYear: dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
                        certFee: '40.00'
                    };
                }

                items.push({
                    id: doc.id || doc.referenceNumber,
                    type: docType,
                    title: `${doc.documentType} (${doc.referenceNumber})`,
                    data: templateData
                });
            }

            setPreviewDocuments(items);
            setShowPreview(true);
        } catch (err: any) {
            setBanner({ type: 'error', text: 'Failed to prepare documents for preview.' });
        } finally {
            setIsLoadingPreview(false);
        }
    };

    const handleFinalRelease = async () => {
        setBanner(null);
        try {
            await Promise.all(documents.map((doc: any) =>
                requestService.releaseRequest(doc.id, {
                    orNumber: orNumber.trim(), signatory, isOverridden, justification: isOverridden ? justification : undefined
                })
            ));
            setBanner({ type: 'success', text: 'Documents recorded and released successfully. Returning to queue...' });
            setShowPreview(false);
            setTimeout(() => onBack(), 2000);
        } catch (err: any) {
            setBanner({ type: 'error', text: err?.response?.data?.error || err?.message || 'Failed to update transaction in database.' });
            setShowPreview(false);
        }
    };

    const getFormattedDate = () => {
        const d = new Date();
        return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}-${d.getFullYear()}`;
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
                        {/* LEFT COLUMN: REVIEW & REDIRECT EDIT */}
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
                                                <td className="pd-doc-declarant">{doc.declarantName}</td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <button
                                                        onClick={() => onEditDocument(doc.referenceNumber)}
                                                        disabled={isVerified}
                                                        style={{
                                                            color: '#4f46e5',
                                                            backgroundColor: '#e0e7ff',
                                                            border: 'none',
                                                            padding: '6px 12px',
                                                            borderRadius: '6px',
                                                            fontWeight: 500,
                                                            cursor: isVerified ? 'not-allowed' : 'pointer',
                                                            opacity: isVerified ? 0.5 : 1
                                                        }}
                                                        title="Redirect to form to edit details"
                                                    >
                                                        ✎ Edit Details
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

                        {/* RIGHT COLUMN: RECEIPT & GENERATE */}
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

                                <div className="pd-form-group">
                                    <label className="pd-field-label">Authorized Signatory</label>
                                    <select
                                        value={signatory} onChange={(e) => setSignatory(e.target.value)} disabled={isVerified}
                                        className="pd-field-select"
                                    >
                                        <option value="">-- Select Signatory --</option>
                                        <option value="ENGR. VICENTE P. DESOY">ENGR. VICENTE P. DESOY</option>
                                        <option value="ELVIRA T. ENAO, REA">ELVIRA T. ENAO, REA</option>
                                        <option value="CHINA CHAN-OLARIO, RN, REA, REB, Enp">CHINA CHAN-OLARIO, RN, REA, REB, Enp</option>
                                    </select>
                                    {fieldErrors.signatory && <span className="pd-field-error">{fieldErrors.signatory}</span>}
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
                                                onClick={handleOpenPreview}
                                                disabled={isLoadingPreview}
                                                className="pd-btn pd-btn--print"
                                                style={{ backgroundColor: '#22c55e', color: 'white' }}
                                            >
                                                {isLoadingPreview ? 'Preparing Preview...' : `Verify Data & Lock PDF`}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODALS */}
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

            {showPreview && (
                <DocumentPreviewModal
                    documents={previewDocuments}
                    orNumber={orNumber}
                    datePaid={getFormattedDate()}
                    signatory1Name={signatory}
                    onClose={() => setShowPreview(false)}
                    onConfirmRelease={handleFinalRelease}
                />
            )}
        </div>
    );
}