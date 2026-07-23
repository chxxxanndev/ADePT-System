import { useState } from 'react';
import { requestService } from '../services/requestService';
import { taxDeclarationService } from '../services/taxDeclarationService';
import { DocumentPreviewModal, type DocumentItem } from '../components/DocumentPreviewModal';
import '../styles/PaymentDetails.css';

interface PaymentDetailsProps {
    payment: any | null;
    onBack: () => void;
    onEditDocument: (referenceNumber: string) => void;
}

export function PaymentDetails({ payment, onBack }: PaymentDetailsProps) {
    const [orNumber, setOrNumber] = useState('');
    const [signatory, setSignatory] = useState('');
    const [isVerified, setIsVerified] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<{ orNumber?: string; signatory?: string }>({});
    const [banner, setBanner] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

    // --- OVERRIDE / DUPLICATE O.R. STATES ---
    const [showOverrideModal, setShowOverrideModal] = useState(false);
    const [isOverridden, setIsOverridden] = useState(false);
    const [justification, setJustification] = useState('');
    const [justificationError, setJustificationError] = useState('');
    const [existingRequestInfo, setExistingRequestInfo] = useState<{ referenceNumber?: string; declarantName?: string } | null>(null);

    // --- NEW PREVIEW STATES ---
    const [showPreview, setShowPreview] = useState(false);
    const [previewDocuments, setPreviewDocuments] = useState<DocumentItem[]>([]);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);

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
    const documents = payment.documents || [];
    const currency = (n: number) => `\u20B1 ${n.toFixed(2)}`;

    /**
     * VERIFY O.R. FLOWCHART LOGIC
     */
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
        setBanner({
            type: 'success',
            text: 'O.R. Number verified via Manual Override (Shared Receipt).'
        });
    };

    const handleEditVerify = () => {
        setIsVerified(false);
        setIsOverridden(false);
        setBanner(null);
    };

    /**
     * FETCH DATA & OPEN PREVIEW
     */
    const handleOpenPreview = async () => {
        setIsLoadingPreview(true);
        setBanner(null);

        try {
            const items: DocumentItem[] = [];

            // Calculate Dates for Certifications
            const today = new Date();
            const nth = (d: number) => {
                if (d > 3 && d < 21) return 'th';
                switch (d % 10) {
                    case 1: return "st";
                    case 2: return "nd";
                    case 3: return "rd";
                    default: return "th";
                }
            };
            const dayStr = `${today.getDate()}${nth(today.getDate())}`;
            const monthYearStr = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

            for (const doc of documents) {
                const typeStr = doc.documentType?.toLowerCase() || '';
                let docType: 'TAX_DEC' | 'LANDHOLDING' | 'NO_LANDHOLDING' = 'TAX_DEC';
                let finalData = { ...doc };

                // Determine template type
                if (typeStr.includes('no landholding')) docType = 'NO_LANDHOLDING';
                else if (typeStr.includes('landholding')) docType = 'LANDHOLDING';
                else docType = 'TAX_DEC';

                // Fetch real data for Tax Decs from database
                if (docType === 'TAX_DEC') {
                    try {
                        const trueRecord = await taxDeclarationService.getTaxDeclaration(doc.id);
                        if (trueRecord) finalData = trueRecord;
                    } catch (fetchErr) {
                        console.error(`Could not hydrate document ${doc.referenceNumber}`, fetchErr);
                    }
                }

                // Format data based on what the template expects
                let templateData: any = {};
                if (docType === 'TAX_DEC') {
                    templateData = finalData;
                } else {
                    // For Landholding / No Landholding
                    templateData = {
                        ownerName: finalData.declarantName || requesterName,
                        day: dayStr,
                        monthYear: monthYearStr,
                        certFee: finalData.amountDue ? finalData.amountDue.toFixed(2) : '40.00',
                        properties: finalData.properties || [] // If your backend returns property arrays
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
            console.error("Preview Prep Error:", err);
            setBanner({ type: 'error', text: 'Failed to prepare documents for preview.' });
        } finally {
            setIsLoadingPreview(false);
        }
    };

    /**
     * FINAL RELEASE & DB SAVE (Called from inside Modal)
     */
    const handleFinalRelease = async () => {
        setBanner(null);

        try {
            await Promise.all(documents.map((doc: any) =>
                requestService.releaseRequest(doc.id, {
                    orNumber: orNumber.trim(),
                    signatory,
                    isOverridden,
                    justification: isOverridden ? justification : undefined
                })
            ));

            setBanner({ type: 'success', text: 'Documents recorded and released successfully. Returning to queue...' });
            setShowPreview(false); // Close Modal

            setTimeout(() => {
                onBack();
            }, 2000);

        } catch (err: any) {
            console.error("Release Error:", err);
            setBanner({
                type: 'error',
                text: err?.response?.data?.error || err?.message || 'Failed to update transaction in database.'
            });
            setShowPreview(false);
        }
    };


    // Helper to get formatted date for the receipt fields (MM-DD-YYYY)
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
                        <h2 className="pd-header-title">Payment Verification</h2>
                        <span className="pd-header-subtitle">
                            Prepare documents for <strong>{requesterName}</strong>
                        </span>
                    </div>
                </div>

                <div className="pd-body">
                    {banner && <div className={`pd-banner pd-banner--${banner.type}`}>{banner.text}</div>}

                    <div className="pd-split-layout">
                        <div className="pd-col-left">
                            <div className="pd-section-label">Selected Documents ({documents.length})</div>
                            <div className="pd-doc-table-wrap">
                                <table className="pd-doc-table">
                                    <thead>
                                        <tr>
                                            <th>Ref. No</th>
                                            <th>Owner</th>
                                            <th>Type</th>
                                            <th style={{ textAlign: 'right' }}>Fee</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {documents.map((doc: any, i: number) => (
                                            <tr key={i}>
                                                <td className="pd-doc-ref">{doc.referenceNumber}</td>
                                                <td className="pd-doc-declarant">{doc.declarantName}</td>
                                                <td className="pd-doc-type">{doc.documentType}</td>
                                                <td className="pd-doc-fee">{currency(doc.amountDue)}</td>
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

                        <div className="pd-col-right">
                            <div className="pd-receipt-card">
                                <div className="pd-section-label">Treasurer Receipt Details</div>

                                {isVerified && isOverridden && (
                                    <div className="pd-override-badge-card">
                                        <div className="pd-override-badge-header">
                                            <span>⚠️ Shared Receipt (Manual Override)</span>
                                        </div>
                                        <div className="pd-override-badge-body">
                                            <strong>Justification:</strong> {justification}
                                        </div>
                                    </div>
                                )}

                                <div className="pd-form-group">
                                    <label className="pd-field-label">Official Receipt (O.R.) Number</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 1234567"
                                        value={orNumber}
                                        onChange={(e) => {
                                            setOrNumber(e.target.value);
                                            setIsVerified(false);
                                            setIsOverridden(false);
                                        }}
                                        disabled={isVerified}
                                        className={`pd-field-input${fieldErrors.orNumber ? ' pd-field-invalid' : ''}`}
                                    />
                                    {fieldErrors.orNumber && <span className="pd-field-error">{fieldErrors.orNumber}</span>}
                                </div>

                                <div className="pd-form-group">
                                    <label className="pd-field-label">Authorized Signatory</label>
                                    <select
                                        value={signatory}
                                        onChange={(e) => setSignatory(e.target.value)}
                                        disabled={isVerified}
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
                                        <button
                                            onClick={handleVerify}
                                            disabled={isVerifying}
                                            className="pd-btn pd-btn--verify"
                                        >
                                            {isVerifying ? 'Verifying Receipt...' : 'Verify Receipt'}
                                        </button>
                                    ) : (
                                        <div className="pd-verified-actions">
                                            <button onClick={handleEditVerify} className="pd-btn pd-btn--edit-verify">Edit</button>

                                            {/* --- UPDATED BUTTON --- */}
                                            <button
                                                onClick={handleOpenPreview}
                                                disabled={isLoadingPreview}
                                                className="pd-btn pd-btn--print"
                                                style={{ backgroundColor: '#22c55e', color: 'white' }}
                                            >
                                                {isLoadingPreview ? 'Preparing Preview...' : `Generate & Preview Documents`}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- MANUAL OVERRIDE MODAL --- */}
            {showOverrideModal && (
                <div className="pd-modal-overlay">
                    <div className="pd-modal">
                        <div className="pd-modal-header">
                            <h3>⚠️ Duplicate / Shared Receipt Detected</h3>
                        </div>
                        <div className="pd-modal-body">
                            <p>
                                Official Receipt <strong>#{orNumber}</strong> is already recorded in the system
                                {existingRequestInfo?.referenceNumber && ` (Ref: ${existingRequestInfo.referenceNumber} - ${existingRequestInfo.declarantName})`}.
                            </p>
                            <p className="pd-modal-subtext">
                                If this is a typographical error, please cancel and update the O.R. number. If this is a valid <strong>shared receipt</strong> (e.g., family request or consolidated payment), enter a justification below to proceed with a <strong>Manual Override</strong>.
                            </p>

                            <div className="pd-form-group" style={{ marginTop: '16px' }}>
                                <label className="pd-field-label">Override Justification *</label>
                                <textarea
                                    className={`pd-field-textarea${justificationError ? ' pd-field-invalid' : ''}`}
                                    placeholder="e.g., Shared O.R. issued for husband and wife landholding certificates."
                                    rows={3}
                                    value={justification}
                                    onChange={(e) => {
                                        setJustification(e.target.value);
                                        setJustificationError('');
                                    }}
                                />
                                {justificationError && <span className="pd-field-error">{justificationError}</span>}
                            </div>
                        </div>
                        <div className="pd-modal-footer">
                            <button
                                onClick={() => {
                                    setShowOverrideModal(false);
                                    setJustificationError('');
                                }}
                                className="pd-btn pd-btn--secondary"
                            >
                                Cancel & Fix O.R.
                            </button>
                            <button
                                onClick={handleConfirmOverride}
                                className="pd-btn pd-btn--warning"
                            >
                                Confirm Manual Override
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- NEW DOCUMENT PREVIEW MODAL OVERLAY --- */}
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