import { useState, useEffect } from 'react';
import { requestService } from '../services/requestService';
import { InitialDocumentPreviewModal } from '../components/InitialDocumentPreviewModal';
import { pdf } from '@react-pdf/renderer';

// --- PDF TEMPLATE IMPORTS ---
import { CertOfNoLandholdingPDF } from '../components/templates/NoLandholdingPDF';
import { CertOfLandholdingPDF } from '../components/templates/LandholdingPDF';
import { TaxDeclarationPDF } from '../components/templates/TaxDeclarationPDF';

import '../styles/PaymentDetails.css';

interface PaymentDetailsProps {
    payment: any | null;
    onBack: () => void;
    onEditDocument?: (referenceNumber: string) => void;
}

// --- MOCK DATABASE SIGNATORIES (Replace with API call later) ---
const ACTIVE_SIGNATORIES = [
    { id: 'sig_1', name: 'ELVIRA T. ENAO, REA', title: 'Local Assessment Operations Officer IV', role: 'AUTHORIZED_REP' },
    { id: 'sig_2', name: 'ENGR. VICENTE P. DESOY, REA', title: 'Provincial Assessor', role: 'ASSESSOR' },
    { id: 'sig_3', name: 'CHINA CHAN-OLARIO, RN, REA, REB, Enp', title: 'Assistant Provincial Assessor', role: 'ASST_ASSESSOR' },
];

// --- HELPER TO GET CURRENT DATES FOR PDFs ---
const getFormattedDates = () => {
    const today = new Date();
    const day = today.getDate().toString();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthYear = `${monthNames[today.getMonth()]} ${today.getFullYear()}`;
    const datePaid = today.toLocaleDateString('en-PH', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    return { day, monthYear, datePaid };
};

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

    // --- WORKFLOW STATES ---
    const [workflowStep, setWorkflowStep] = useState<'PAYMENT' | 'SIGNATORIES' | 'COMPLETED'>('PAYMENT');
    const [isGeneratingPdf, setIsGeneratingPdf] = useState<string | null>(null);

    // --- SIGNATORY SELECTIONS STATE ---
    const [docSignatories, setDocSignatories] = useState<Record<string, any>>({});

    // --- INLINE PREVIEW STATE ---
    const [activePreview, setActivePreview] = useState<{ docId: string; url: string; label: string } | null>(null);

    useEffect(() => {
        if (payment && payment.documents) {
            setDocuments(payment.documents);

            // Pre-fill default signatories based on document type
            const initialSigs: Record<string, any> = {};
            payment.documents.forEach((doc: any) => {
                const isTD = doc.referenceNumber.startsWith('TD');
                initialSigs[doc.id] = {
                    primary: ACTIVE_SIGNATORIES.find(s => s.role === 'AUTHORIZED_REP'),
                    secondary: isTD ? null : ACTIVE_SIGNATORIES.find(s => s.role === 'ASST_ASSESSOR')
                };
            });
            setDocSignatories(initialSigs);
        }
    }, [payment]);

    // Revoke object URLs to prevent memory leaks when unmounting or regenerating
    useEffect(() => {
        return () => {
            setActivePreview(prev => {
                if (prev?.url) URL.revokeObjectURL(prev.url);
                return null;
            });
        };
    }, []);

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

    // --- O.R. VERIFICATION ---
    const handleVerify = async () => {
        const errors: { orNumber?: string } = {};
        const trimmed = orNumber.trim();

        if (!trimmed) {
            errors.orNumber = 'Enter the Treasurer O.R. number.';
        } else if (!/^\d+$/.test(trimmed)) {
            errors.orNumber = 'O.R. number must contain digits only.';
        }

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

    const handleUpdateSuccess = (updatedDoc: any) => {
        setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
        setBanner({ type: 'success', text: `Successfully updated details for ${updatedDoc.referenceNumber}.` });
        setSelectedDocForPreview(null);
    };

    // --- STEP 1: LOCK PAYMENT ---
    const handleLockPayment = async () => {
        setBanner(null);
        try {
            await Promise.all(documents.map((doc: any) =>
                requestService.releaseRequest(doc.id, {
                    orNumber: orNumber.trim(),
                    isOverridden,
                    justification: isOverridden ? justification : undefined
                })
            ));

            setBanner({ type: 'success', text: 'Payment locked successfully. Please assign signatories.' });
            setWorkflowStep('SIGNATORIES');
        } catch (err: any) {
            setBanner({ type: 'error', text: err?.response?.data?.error || err?.message || 'Failed to update transaction in database.' });
        }
    };

    // --- STEP 2: ASSIGN SIGNATORIES ---
    const handleSignatoryChange = (docId: string, roleType: 'primary' | 'secondary', sigId: string) => {
        const selectedSig = ACTIVE_SIGNATORIES.find(s => s.id === sigId);
        setDocSignatories(prev => ({
            ...prev,
            [docId]: { ...prev[docId], [roleType]: selectedSig }
        }));
    };

    const handleFinalizeDocuments = () => {
        setBanner(null);
        setWorkflowStep('COMPLETED');

        // Auto-generate the first document for preview
        if (documents.length > 0) {
            handlePrintDocument(documents[0]);
        }
    };

    // --- STEP 3: PDF GENERATION (INLINE PREVIEW) ---
    const handlePrintDocument = async (doc: any) => {
        setIsGeneratingPdf(doc.id);
        try {
            const { day, monthYear, datePaid } = getFormattedDates();
            const sigs = docSignatories[doc.id];
            let PDFComponent;

            if (doc.referenceNumber.startsWith('NLH')) {
                PDFComponent = <CertOfNoLandholdingPDF
                    ownerName={doc.declarantName || doc.declarant_name}
                    day={day} monthYear={monthYear} orNumber={orNumber} datePaid={datePaid}
                    signatory1Name={sigs?.primary?.name} signatory1Title={sigs?.primary?.title}
                    signatory2Name={sigs?.secondary?.name} signatory2Title={sigs?.secondary?.title}
                />;
            } else if (doc.referenceNumber.startsWith('LH')) {
                PDFComponent = <CertOfLandholdingPDF
                    ownerName={doc.declarantName || doc.declarant_name}
                    properties={doc.properties || doc.data?.properties || []}
                    day={day} monthYear={monthYear} orNumber={orNumber} datePaid={datePaid}
                    signatory1Name={sigs?.primary?.name} signatory1Title={sigs?.primary?.title}
                    signatory2Name={sigs?.secondary?.name} signatory2Title={sigs?.secondary?.title}
                />;
            } else if (doc.referenceNumber.startsWith('TD')) {
                PDFComponent = <TaxDeclarationPDF
                    data={doc.data || doc}
                    orNumber={orNumber} datePaid={datePaid}
                    certifiedByName={sigs?.primary?.name}
                    certifiedByTitle={sigs?.primary?.title}
                />;
            } else {
                alert("Unknown document type for printing.");
                setIsGeneratingPdf(null);
                return;
            }

            const blob = await pdf(PDFComponent).toBlob();
            const pdfUrl = URL.createObjectURL(blob);

            // Clean up old preview URL before setting new one to avoid leaks
            setActivePreview(prev => {
                if (prev?.url) URL.revokeObjectURL(prev.url);
                return { docId: doc.id, url: pdfUrl, label: doc.referenceNumber };
            });

        } catch (error) {
            console.error("Failed to generate PDF:", error);
            alert("Error generating the PDF document. Check console for details.");
        } finally {
            setIsGeneratingPdf(null);
        }
    };

    return (
        <div className="pd-page page-transition">
            <div className="pd-panel">
                <div className="pd-header-banner">
                    {workflowStep === 'PAYMENT' && <button onClick={onBack} className="pd-header-back-btn" title="Back to Queue">&larr;</button>}

                    <div className="pd-header-text">
                        <h2 className="pd-header-title">
                            {workflowStep === 'PAYMENT' && 'Step 1: Final Verification & Payment'}
                            {workflowStep === 'SIGNATORIES' && 'Step 2: Assign Signatories'}
                            {workflowStep === 'COMPLETED' && 'Final Signatory & Lock'}
                        </h2>
                        <span className="pd-header-subtitle">
                            {workflowStep === 'COMPLETED' ? `Documents processed for ` : `Prepare documents for `}
                            <strong>{requesterName}</strong>
                        </span>
                    </div>
                </div>

                <div className="pd-body">
                    {banner && <div className={`pd-banner pd-banner--${banner.type}`}>{banner.text}</div>}

                    {/* --- VIEW 1: PAYMENT FORM --- */}
                    {workflowStep === 'PAYMENT' && (
                        <div className="pd-split-layout">
                            {/* LEFT COLUMN: REVIEW */}
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
                                            {documents.map((doc: any, i: number) => {
                                                const docTypeDisplay = doc.documentType || (
                                                    doc.referenceNumber.startsWith('TD') ? 'Tax Declaration' :
                                                        doc.referenceNumber.startsWith('NLH') ? 'Certificate of No Landholding' :
                                                            'Certificate of Landholding'
                                                );

                                                return (
                                                    <tr key={doc.id || i}>
                                                        <td className="pd-doc-ref">{doc.referenceNumber}</td>
                                                        <td className="pd-doc-type">{docTypeDisplay}</td>
                                                        <td className="pd-doc-declarant">{doc.declarantName || doc.declarant_name}</td>
                                                        <td style={{ textAlign: 'right' }}>
                                                            <button
                                                                onClick={() => setSelectedDocForPreview(doc)}
                                                                style={{ color: '#4f46e5', backgroundColor: '#e0e7ff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 500, cursor: 'pointer', fontSize: '13px' }}
                                                                title="Preview initial form details & edit typos"
                                                            >
                                                                👁 Preview / Edit Details
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
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
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            placeholder="e.g. 1234567"
                                            value={orNumber}
                                            onChange={(e) => {
                                                const digitsOnly = e.target.value.replace(/\D/g, '');
                                                setOrNumber(digitsOnly);
                                                setIsVerified(false);
                                                setIsOverridden(false);
                                            }}
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
                                                    onClick={handleLockPayment}
                                                    className="pd-btn pd-btn--print"
                                                    style={{ backgroundColor: '#22c55e', color: 'white' }}
                                                >
                                                    Lock & Complete Payment &rarr;
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- VIEW 2: SIGNATORIES ASSIGNMENT --- */}
                    {workflowStep === 'SIGNATORIES' && (
                        <div className="pd-signatory-view">
                            <p className="pd-helper-text">Please confirm the signatories for the documents below. They have been pre-filled with standard defaults based on the document type.</p>

                            <div className="pd-sig-list">
                                {documents.map(doc => {
                                    const isTD = doc.referenceNumber.startsWith('TD');
                                    const docTypeDisplay = doc.documentType || (isTD ? 'Tax Declaration' : doc.referenceNumber.startsWith('NLH') ? 'Certificate of No Landholding' : 'Certificate of Landholding');

                                    return (
                                        <div key={doc.id} className="pd-sig-card">
                                            <div className="pd-sig-card-header">
                                                <span className="pd-doc-ref">{doc.referenceNumber}</span>
                                                <span className="pd-doc-type" style={{ marginLeft: '10px' }}>{docTypeDisplay} - {doc.declarantName || doc.declarant_name}</span>
                                            </div>

                                            <div className="pd-sig-selectors" style={{ gridTemplateColumns: isTD ? '1fr' : '1fr 1fr' }}>
                                                <div className="pd-form-group">
                                                    <label className="pd-field-label">
                                                        {isTD ? 'Certified Copy (Authorized Signatory)' : 'Signatory 1 (Local Assessment Officer)'}
                                                    </label>
                                                    <select
                                                        className="pd-field-select"
                                                        value={docSignatories[doc.id]?.primary?.id || ''}
                                                        onChange={(e) => handleSignatoryChange(doc.id, 'primary', e.target.value)}
                                                    >
                                                        {ACTIVE_SIGNATORIES.map(sig => (
                                                            <option key={sig.id} value={sig.id}>{sig.name} - {sig.title}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {!isTD && (
                                                    <div className="pd-form-group">
                                                        <label className="pd-field-label">Signatory 2 (Assistant Provincial Assessor)</label>
                                                        <select
                                                            className="pd-field-select"
                                                            value={docSignatories[doc.id]?.secondary?.id || ''}
                                                            onChange={(e) => handleSignatoryChange(doc.id, 'secondary', e.target.value)}
                                                        >
                                                            <option value="">-- None --</option>
                                                            {ACTIVE_SIGNATORIES.map(sig => (
                                                                <option key={sig.id} value={sig.id}>{sig.name} - {sig.title}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="pd-sig-footer">
                                <button onClick={handleFinalizeDocuments} className="pd-btn pd-btn--print" style={{ width: 'auto', padding: '16px 40px' }}>
                                    Generate & Preview Documents &rarr;
                                </button>
                            </div>
                        </div>
                    )}

                    {/* --- VIEW 3: SPLIT INLINE PDF VIEWER (Inspiration from Img 4) --- */}
                    {workflowStep === 'COMPLETED' && (
                        <div className="pd-split-layout pd-split-layout--viewer animation-fade-in">
                            {/* LEFT COLUMN: PDF VIEWER CONTAINER */}
                            <div className="pd-col-left">
                                <div className="pd-pdf-viewer-container">
                                    {activePreview ? (
                                        <iframe
                                            src={`${activePreview.url}#toolbar=0&navpanes=0&scrollbar=0`}
                                            className="pd-pdf-iframe"
                                            title="PDF Document Preview"
                                        />
                                    ) : (
                                        <div className="pd-pdf-placeholder">
                                            <span style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}>📄</span>
                                            Select a document from the sidebar to preview
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* RIGHT COLUMN: CONTROLS & DOCUMENT LIST */}
                            <div className="pd-col-right pd-sidebar-controls">

                                <div className="pd-success-header">
                                    <div className="pd-success-icon-small">✓</div>
                                    <div>
                                        <h3>Payment Verified</h3>
                                        <p>O.R. #{orNumber}</p>
                                    </div>
                                </div>

                                <div className="pd-section-label" style={{ margin: '12px 0 8px 0' }}>Select Document to View</div>

                                <div className="pd-print-list-compact">
                                    {documents.map((doc: any) => {
                                        const docTypeDisplay = doc.documentType || (doc.referenceNumber.startsWith('TD') ? 'Tax Declaration' : doc.referenceNumber.startsWith('NLH') ? 'Certificate of No Landholding' : 'Certificate of Landholding');
                                        const isActive = activePreview?.docId === doc.id;

                                        return (
                                            <div
                                                className={`pd-compact-card ${isActive ? 'pd-compact-card--active' : ''}`}
                                                key={doc.id}
                                                onClick={() => !isActive && handlePrintDocument(doc)}
                                            >
                                                <div className="pd-compact-info">
                                                    <span className="pd-doc-ref">{doc.referenceNumber}</span>
                                                    <span className="pd-doc-type" style={{ fontSize: '11px' }}>{docTypeDisplay}</span>
                                                </div>
                                                <div className="pd-compact-action">
                                                    {isGeneratingPdf === doc.id ? (
                                                        <span className="pd-status-text">⏳ Loading...</span>
                                                    ) : isActive ? (
                                                        <span className="pd-status-text active-text">👁 Viewing</span>
                                                    ) : (
                                                        <button className="pd-btn pd-btn--tiny-view">View</button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="pd-sidebar-actions-bottom">
                                    {activePreview ? (
                                        <a
                                            href={activePreview.url}
                                            download={`${activePreview.label}.pdf`}
                                            className="pd-btn pd-btn--download-large"
                                        >
                                            ⬇ Download Current PDF
                                        </a>
                                    ) : (
                                        <button className="pd-btn pd-btn--download-large disabled" disabled>
                                            ⬇ Download Current PDF
                                        </button>
                                    )}

                                    <button onClick={onBack} className="pd-btn pd-btn--secondary-outline">
                                        Finish & Return to Queue
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
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

                            <p>
                                Official Receipt <strong>#{orNumber}</strong> is already recorded in the system
                                {existingRequestInfo?.referenceNumber && (
                                    <span> (Ref: {existingRequestInfo.referenceNumber} - {existingRequestInfo.declarantName})</span>
                                )}.
                            </p>

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