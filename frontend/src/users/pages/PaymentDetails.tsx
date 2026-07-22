import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { requestService } from '../services/requestService';
import { taxDeclarationService } from '../services/taxDeclarationService';
import { TaxDeclarationPDF } from '../components/templates/TaxDeclarationPDF';
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
    const [isSaving, setIsSaving] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<{ orNumber?: string; signatory?: string }>({});
    const [banner, setBanner] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

    // --- OVERRIDE / DUPLICATE O.R. STATES ---
    const [showOverrideModal, setShowOverrideModal] = useState(false);
    const [isOverridden, setIsOverridden] = useState(false);
    const [justification, setJustification] = useState('');
    const [justificationError, setJustificationError] = useState('');
    const [existingRequestInfo, setExistingRequestInfo] = useState<{ referenceNumber?: string; declarantName?: string } | null>(null);

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
            // Use groupId to exclude the current active group from the duplication check
            const mainRequestId = payment.groupId || payment.id;

            // Check O.R. Uniqueness via Backend Service
            const res = await requestService.checkOrUniqueness(orNumber.trim(), mainRequestId);

            if (res && res.isUnique === false) {
                // Duplicate O.R. -> Show Manual Override Modal
                setExistingRequestInfo(res.existingRequest || null);
                setShowOverrideModal(true);
            } else {
                // Unique O.R. -> Verified directly
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

    /**
     * CONFIRM MANUAL OVERRIDE
     */
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
     * MAIN PDF GENERATION LOGIC
     */
    const handleGeneratePDF = async () => {
        setIsSaving(true);
        setBanner(null);

        try {
            // A. Update database for ALL documents in this grouped payment
            await Promise.all(documents.map((doc: any) =>
                requestService.releaseRequest(doc.id, {
                    orNumber: orNumber.trim(),
                    signatory,
                    isOverridden,
                    justification: isOverridden ? justification : undefined
                })
            ));

            setBanner({ type: 'success', text: `Saving verification... Generating ${documents.length} document(s).` });

            // B. Sequential PDF Generation Loop
            for (const doc of documents) {
                let finalData = doc;

                if (doc.documentType?.toLowerCase().includes('tax declaration')) {
                    try {
                        const trueRecord = await taxDeclarationService.getTaxDeclaration(doc.id);
                        if (trueRecord) finalData = trueRecord;
                    } catch (fetchErr) {
                        console.error(`Could not hydrate document ${doc.referenceNumber}`, fetchErr);
                    }
                }

                const docInstance = (
                    <TaxDeclarationPDF
                        data={finalData}
                        orNumber={orNumber}
                        signatory={signatory}
                    />
                );

                const blob = await pdf(docInstance).toBlob();
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;

                const safeName = (finalData.ownerName || requesterName).replace(/[^a-z0-9]/gi, '_');
                link.download = `${safeName}_${doc.referenceNumber}.pdf`;

                document.body.appendChild(link);
                link.click();

                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }

            setBanner({ type: 'success', text: 'Documents generated & payment recorded successfully. Returning to queue...' });
            setTimeout(() => {
                onBack();
            }, 2000);

        } catch (err: any) {
            console.error("PDF Generation Error:", err);
            setBanner({
                type: 'error',
                text: err?.response?.data?.error || err?.message || 'An error occurred during generation. Please try again.'
            });
        } finally {
            setIsSaving(false);
        }
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
                        {/* LEFT COLUMN: DOCUMENT LIST */}
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

                        {/* RIGHT COLUMN: VERIFICATION FORM */}
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
                                        <option value="CHINA CHAN-OLARIO, RN, REA">CHINA CHAN-OLARIO, RN, REA</option>
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
                                            <button onClick={handleGeneratePDF} disabled={isSaving} className="pd-btn pd-btn--print">
                                                {isSaving ? 'Processing...' : `Release & Download PDF`}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- MANUAL OVERRIDE / SHARED RECEIPT MODAL --- */}
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
        </div>
    );
}