import { useState } from 'react';
import { requestService } from '../services/requestService';
import '../styles/PaymentDetails.css';

// ==========================================
// 1. IMPORT YOUR TEAMMATE'S PDF UTILITY HERE
// ==========================================
// Example:
// import { generateOfficialDocumentPDF } from '../templates/pdfGenerator';

interface PaymentDetailsProps {
    payment: any | null;
    onBack: () => void;
    onEditDocument: (referenceNumber: string) => void;
}

export function PaymentDetails({ payment, onBack }: PaymentDetailsProps) {
    const [orNumber, setOrNumber] = useState('');
    const [signatory, setSignatory] = useState('');
    const [isVerified, setIsVerified] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<{ orNumber?: string; signatory?: string }>({});
    const [banner, setBanner] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

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

    // Format date nicely for the template, i uncomment ra if ma integrate na ang pdf templates
    // const today = new Date();
    // const formattedDate = today.toLocaleDateString('en-US', {
    //     month: 'long',
    //     day: 'numeric',
    //     year: 'numeric'
    // });

    const handleVerify = () => {
        const errors: { orNumber?: string; signatory?: string } = {};
        if (!orNumber.trim()) errors.orNumber = 'Enter the O.R. number printed on the Treasurer receipt.';
        if (!signatory) errors.signatory = 'Select the authorized signatory for verification.';
        setFieldErrors(errors);

        if (Object.keys(errors).length > 0) {
            setBanner({ type: 'error', text: 'Please complete the verification details.' });
            return;
        }
        setBanner(null);
        setIsVerified(true);
    };

    // ==========================================
    // 2. CONNECT AND TRIGGER THE PDF GENERATION
    // ==========================================
    const handleGeneratePDF = async () => {
        setIsSaving(true);
        setBanner(null);
        try {
            // A. Update database: Mark status as Paid/Verified with O.R. Info
            await Promise.all(documents.map((doc: any) =>
                requestService.releaseRequest(doc.id, { orNumber, signatory })
            ));

            setBanner({ type: 'success', text: `Verification saved. Generating document PDF...` });

            // B. Call teammate's template function to generate and download/print the PDF
            // Pass all form values directly to their generator
            /* 
            await generateOfficialDocumentPDF({
                requesterName,
                orNumber,
                signatory,
                totalAmount,
                documents,
                verificationDate: formattedDate
            });
            */

            // Temporary native feedback until your teammate's import is fully uncommented:
            console.log("PDF generated with data:", { orNumber, signatory, requesterName, documents });

            setTimeout(() => {
                onBack(); // Return to queue list after processing
            }, 1200);

        } catch (err) {
            setBanner({ type: 'error', text: 'Could not save verification. Please check your connection and try again.' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="pd-page page-transition">
            <div className="pd-panel">

                {/* --- Header Banner --- */}
                <div className="pd-header-banner">
                    <button onClick={onBack} className="pd-header-back-btn" title="Back to Queue">
                        &larr;
                    </button>
                    <div className="pd-header-text">
                        <h2 className="pd-header-title">Payment Verification</h2>
                        <span className="pd-header-subtitle">
                            Verify the Treasurer's O.R. and prepare documents for <strong>{requesterName}</strong>
                        </span>
                    </div>
                </div>

                <div className="pd-body">
                    {banner && (
                        <div className={`pd-banner pd-banner--${banner.type}`}>
                            {banner.text}
                        </div>
                    )}

                    <div className="pd-split-layout">

                        {/* --- LEFT COLUMN: REQUEST DATA --- */}
                        <div className="pd-col-left">
                            <div className="pd-section-label">Selected Documents ({documents.length})</div>
                            <div className="pd-doc-table-wrap">
                                <table className="pd-doc-table">
                                    <thead>
                                        <tr>
                                            <th>Reference No.</th>
                                            <th>Declarant (Owner)</th>
                                            <th>Document Type</th>
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
                                <div className="pd-total-label">Expected Payment Amount</div>
                                <div className="pd-total-value">{currency(totalAmount)}</div>
                            </div>
                        </div>

                        {/* --- RIGHT COLUMN: ENTRY FORM --- */}
                        <div className="pd-col-right">
                            <div className="pd-receipt-card">
                                <div className="pd-section-label">Treasurer O.R. Details</div>

                                <div className="pd-form-group">
                                    <label className="pd-field-label" htmlFor="pd-or-number">Official Receipt (O.R.) Number</label>
                                    <input
                                        id="pd-or-number"
                                        type="text"
                                        placeholder="e.g. OR-1234567"
                                        value={orNumber}
                                        onChange={(e) => {
                                            setOrNumber(e.target.value);
                                            setIsVerified(false);
                                            setFieldErrors(prev => ({ ...prev, orNumber: undefined }));
                                        }}
                                        disabled={isVerified}
                                        className={`pd-field-input${fieldErrors.orNumber ? ' pd-field-invalid' : ''}`}
                                    />
                                    {fieldErrors.orNumber && <span className="pd-field-error">{fieldErrors.orNumber}</span>}
                                </div>

                                <div className="pd-form-group">
                                    <label className="pd-field-label" htmlFor="pd-signatory">Authorized Signatory</label>
                                    <select
                                        id="pd-signatory"
                                        value={signatory}
                                        onChange={(e) => {
                                            setSignatory(e.target.value);
                                            setFieldErrors(prev => ({ ...prev, signatory: undefined }));
                                        }}
                                        disabled={isVerified}
                                        className="pd-field-select"
                                    >
                                        <option value="">-- Select Signatory --</option>
                                        <option value="ENGR. VICENTE P. DESOY">ENGR. VICENTE P. DESOY</option>
                                        <option value="ELVIRA T. ENAO">ELVIRA T. ENAO</option>
                                    </select>
                                    {fieldErrors.signatory && <span className="pd-field-error">{fieldErrors.signatory}</span>}
                                </div>

                                <div className="pd-actions-row">
                                    {!isVerified ? (
                                        <button onClick={handleVerify} className="pd-btn pd-btn--verify">
                                            Verify Receipt
                                        </button>
                                    ) : (
                                        <div className="pd-verified-actions">
                                            <button onClick={() => setIsVerified(false)} className="pd-btn pd-btn--edit-verify">
                                                Edit details
                                            </button>
                                            <button onClick={handleGeneratePDF} disabled={isSaving} className="pd-btn pd-btn--print">
                                                {isSaving ? 'Processing...' : `Confirm & Generate PDF`}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}