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

    const handleVerify = () => {
        const errors: { orNumber?: string; signatory?: string } = {};
        if (!orNumber.trim()) errors.orNumber = 'Enter the Treasurer O.R. number.';
        if (!signatory) errors.signatory = 'Select an authorized signatory.';
        setFieldErrors(errors);

        if (Object.keys(errors).length > 0) {
            setBanner({ type: 'error', text: 'Please complete the verification details.' });
            return;
        }
        setBanner(null);
        setIsVerified(true);
    };

    /**
     * MAIN PDF GENERATION LOGIC
     * 1. Updates database status
     * 2. Fetches "True Results" (Hydration) for Tax Declarations
     * 3. Programmatically generates and downloads PDFs
     */
    const handleGeneratePDF = async () => {
        setIsSaving(true);
        setBanner(null);
        
        try {
            // A. Update database: Mark all documents as Released
            await Promise.all(documents.map((doc: any) =>
                requestService.releaseRequest(doc.id, { orNumber, signatory })
            ));

            setBanner({ type: 'success', text: `Saving verification... Generating ${documents.length} document(s).` });

            // B. Sequential PDF Generation Loop
            for (const doc of documents) {
                let finalData = doc;
                
                // HYDRATION: If it's a Tax Dec, we need boundaries/rows from the database
                if (doc.documentType.toLowerCase().includes('tax declaration')) {
                    try {
                        const trueRecord = await taxDeclarationService.getTaxDeclaration(doc.id);
                        if (trueRecord) finalData = trueRecord;
                    } catch (fetchErr) {
                        console.error(`Could not hydrate document ${doc.referenceNumber}`, fetchErr);
                        // Falls back to summary data if hydration fails
                    }
                }

                // 1. Create the React-PDF instance
                const docInstance = (
                    <TaxDeclarationPDF 
                        data={finalData} 
                        orNumber={orNumber} 
                        signatory={signatory} 
                    />
                );

                // 2. Generate the Blob (in-browser)
                const blob = await pdf(docInstance).toBlob();
                
                // 3. Create a temporary hidden link to trigger the download
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                
                // Filename: DeclarantName_DocType.pdf
                const safeName = (finalData.ownerName || requesterName).replace(/[^a-z0-9]/gi, '_');
                link.download = `${safeName}_${doc.referenceNumber}.pdf`;
                
                document.body.appendChild(link);
                link.click();
                
                // 4. Cleanup to prevent memory leaks
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }

            // Success feedback and return to queue
            setBanner({ type: 'success', text: 'Documents generated successfully. Returning to queue...' });
            setTimeout(() => {
                onBack(); 
            }, 2000);

        } catch (err) {
            console.error("PDF Generation Error:", err);
            setBanner({ type: 'error', text: 'An error occurred during generation. Please try again.' });
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

                                <div className="pd-form-group">
                                    <label className="pd-field-label">Official Receipt (O.R.) Number</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 1234567"
                                        value={orNumber}
                                        onChange={(e) => {
                                            setOrNumber(e.target.value);
                                            setIsVerified(false);
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
                                        <button onClick={handleVerify} className="pd-btn pd-btn--verify">Verify Receipt</button>
                                    ) : (
                                        <div className="pd-verified-actions">
                                            <button onClick={() => setIsVerified(false)} className="pd-btn pd-btn--edit-verify">Edit</button>
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
        </div>
    );
}