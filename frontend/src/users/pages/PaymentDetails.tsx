import { useState, useEffect } from 'react';
import { requestService } from '../services/requestService';
import { addAdminAuditEntry } from '../../admin/services/auditLogService';
import { InitialDocumentPreviewModal } from '../components/InitialDocumentPreviewModal';
import { DocumentVerificationPanel } from '../pages/DocumentVerificationPanel';
import { DocumentReleasePanel } from '../pages/DocumentReleasePanel';
import { pdf } from '@react-pdf/renderer';

import { CertOfNoLandholdingPDF } from '../components/templates/NoLandholdingPDF';
import { CertOfLandholdingPDF } from '../components/templates/LandholdingPDF';
import { TaxDeclarationPDF } from '../components/templates/TaxDeclarationPDF';
import { landholdingService } from '../services/landholdingService';
import { taxDeclarationService } from '../services/taxDeclarationService';

import { fetchAllStaff, fetchSignatories, type StaffMember } from '../../admin/services/userManagementService';
import '../styles/PaymentDetails.css';

interface PaymentDetailsProps {
    payment: any | null;
    onBack: () => void; // still used to leave the screen manually (e.g. back arrow on step 1)
    onReleased?: () => void; // called after a successful release — navigate to Transaction Registry
    onEditDocument?: (referenceNumber: string) => void;
}

const DEFAULT_SIGNATORIES = [
    { id: 'sig_1', name: 'ELVIRA T. ENAO, REA', title: 'Local Assessment Operations Officer IV', role: 'AUTHORIZED_REP' },
    { id: 'sig_2', name: 'ENGR. VICENTE P. DESOY, REA', title: 'Provincial Assessor', role: 'ASSESSOR' },
    { id: 'sig_3', name: 'CHINA CHAN-OLARIO, RN, REA, REB, Enp', title: 'Assistant Provincial Assessor', role: 'ASST_ASSESSOR' },
];

const getFormattedDates = () => {
    const today = new Date();
    const day = today.getDate().toString();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthYear = `${monthNames[today.getMonth()]} ${today.getFullYear()}`;
    const datePaid = today.toLocaleDateString('en-PH', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    return { day, monthYear, datePaid };
};

export function PaymentDetails({ payment, onBack, onReleased }: PaymentDetailsProps) {
    // Resuming from the "Pending for Release" queue means this payment already
    // has an O.R. number attached (set by releaseRequest when status flipped
    // to PAID) — in that case skip VERIFICATION and land straight on RELEASE.
    const [orNumber, setOrNumber] = useState(payment?.orNumber || '');
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

    // Step 1 = O.R. verification only. Step 2 = generation, signatory confirmation & release.
    const [workflowStep, setWorkflowStep] = useState<'VERIFICATION' | 'RELEASE'>(
        payment?.orNumber ? 'RELEASE' : 'VERIFICATION'
    );
    const [isGeneratingPdf, setIsGeneratingPdf] = useState<string | null>(null);
    const [docSignatories, setDocSignatories] = useState<Record<string, any>>({});
    const [activePreview, setActivePreview] = useState<{ docId: string; url: string; label: string } | null>(null);
    const [releaseStaff, setReleaseStaff] = useState<{ id: string; name: string }[]>([]);
    const [activeSignatories, setActiveSignatories] = useState(DEFAULT_SIGNATORIES);

    useEffect(() => {
        const loadFromStaffFallback = () => {
            fetchAllStaff()
                .then((staffList) => {
                    const assigned = staffList.filter((s: StaffMember) => s.account_status === 'ACTIVE' && s.is_signatory);
                    if (assigned.length > 0) {
                        const dynamicSigs = [
                            ...assigned.map((s) => {
                                const mi = s.middle_initial ? `${s.middle_initial.replace(/\.$/, '')}. ` : '';
                                return {
                                    id: s.id,
                                    name: `${s.first_name} ${mi}${s.last_name}${s.suffix ? `, ${s.suffix}` : ''}`.replace(/\s+/g, ' ').trim(),
                                    title: s.position || (s.admin_level ? `${s.admin_level} Admin` : 'Local Assessment Operations Officer IV'),
                                    role: 'AUTHORIZED_REP',
                                };
                            }),
                            ...DEFAULT_SIGNATORIES.filter((s) => s.role !== 'AUTHORIZED_REP'),
                        ];
                        setActiveSignatories(dynamicSigs);
                    }
                })
                .catch((err) => console.error('Failed to load active signatories from staff list:', err));
        };

        fetchSignatories()
            .then((sigs) => {
                if (sigs && sigs.length > 0) {
                    setActiveSignatories(sigs.map(s => ({
                        id: String(s.id),
                        name: s.suffix ? `${s.name}, ${s.suffix}` : s.name,
                        title: s.position || s.title || '',
                        role: s.role || 'AUTHORIZED_REP'
                    })));
                } else {
                    loadFromStaffFallback();
                }
            })
            .catch(() => {
                loadFromStaffFallback();
            });
    }, []);

    useEffect(() => {
        requestService.getMetadata()
            .then((meta) => setReleaseStaff(Array.isArray(meta?.staff) ? meta.staff : []))
            .catch((err) => console.error('Failed to load staff list:', err));
    }, []);

    useEffect(() => {
        if (payment && payment.documents) {
            setDocuments(payment.documents);

            const primarySig = activeSignatories.find(s => s.role === 'AUTHORIZED_REP') || activeSignatories[0];
            const secondarySig = activeSignatories.find(s => s.role === 'ASST_ASSESSOR');

            // Pre-filled defaults — staff confirms/edits these at the release step, not here.
            const initialSigs: Record<string, any> = {};
            payment.documents.forEach((doc: any) => {
                const isTD = doc.referenceNumber.startsWith('TD');
                initialSigs[doc.id] = {
                    primary: primarySig,
                    secondary: isTD ? null : secondarySig
                };
            });
            setDocSignatories(initialSigs);
        }
    }, [payment, activeSignatories]);

    useEffect(() => {
        return () => {
            setActivePreview(prev => {
                if (prev?.url) URL.revokeObjectURL(prev.url);
                return null;
            });
        };
    }, []);

    // Resuming straight into RELEASE (from Pending for Release) skips the
    // VERIFICATION step entirely, so nothing has generated a preview yet —
    // handleConfirmAndGenerate normally does that, but it never runs on this
    // path. Fire once documents + signatories are both populated.
    useEffect(() => {
        if (workflowStep === 'RELEASE' && documents.length > 0 && !activePreview && !isGeneratingPdf) {
            handlePrintDocument(documents[0]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workflowStep, documents]);

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

    const handleSignatoryChange = (docId: string, roleType: 'primary' | 'secondary', sigId: string) => {
        const selectedSig = activeSignatories.find(s => s.id === sigId);
        setDocSignatories(prev => {
            const updated = { ...prev, [docId]: { ...prev[docId], [roleType]: selectedSig } };
            const doc = documents.find(d => d.id === docId);
            if (doc && activePreview?.docId === docId) {
                // regenerate with the freshly updated signatory
                setTimeout(() => handlePrintDocument(doc, updated), 0);
            }
            return updated;
        });
    };

    // --- STEP 1 CONFIRM: LOCK O.R., GENERATE DOCUMENTS, MOVE TO RELEASE STEP ---
    const handleConfirmAndGenerate = async () => {
        setBanner(null);
        try {
            await Promise.all(documents.map((doc: any) =>
                requestService.releaseRequest(doc.id, {
                    orNumber: orNumber.trim(),
                    isOverridden,
                    justification: isOverridden ? justification : undefined,
                })
            ));

            setWorkflowStep('RELEASE');
            if (documents.length > 0) {
                handlePrintDocument(documents[0]);
            }
        } catch (err: any) {
            setBanner({ type: 'error', text: err?.response?.data?.error || err?.message || 'Failed to update transaction in database.' });
        }
    };

    // --- PDF GENERATION (INLINE PREVIEW) ---
    // Accepts an optional signatories map override so a just-changed dropdown
    // reflects immediately without waiting for a state re-read.
    const handlePrintDocument = async (doc: any, signatoriesOverride?: Record<string, any>) => {
        setIsGeneratingPdf(doc.id);
        try {
            const { day, monthYear, datePaid } = getFormattedDates();
            const sigs = (signatoriesOverride || docSignatories)[doc.id];
            let PDFComponent;

            if (doc.referenceNumber.startsWith('NLH')) {
                PDFComponent = <CertOfNoLandholdingPDF
                    ownerName={doc.declarantName || doc.declarant_name}
                    day={day} monthYear={monthYear} orNumber={orNumber} datePaid={datePaid}
                    signatory1Name={sigs?.primary?.name} signatory1Title={sigs?.primary?.title}
                    signatory2Name={sigs?.secondary?.name} signatory2Title={sigs?.secondary?.title}
                />;
            } else if (doc.referenceNumber.startsWith('LH')) {
                let landholdingProperties = doc.properties || doc.data?.properties;

                if (!landholdingProperties) {
                    try {
                        const cert = await landholdingService.getByRequestId(doc.id);
                        landholdingProperties = cert?.properties || [];
                    } catch (err) {
                        console.error('Failed to fetch landholding properties:', err);
                        landholdingProperties = [];
                    }
                }

                PDFComponent = <CertOfLandholdingPDF
                    ownerName={doc.declarantName || doc.declarant_name}
                    properties={landholdingProperties}
                    day={day} monthYear={monthYear} orNumber={orNumber} datePaid={datePaid}
                    signatory1Name={sigs?.primary?.name} signatory1Title={sigs?.primary?.title}
                    signatory2Name={sigs?.secondary?.name} signatory2Title={sigs?.secondary?.title}
                />;
            } else if (doc.referenceNumber.startsWith('TD')) {
                let tdData = doc.data;

                if (!tdData) {
                    try {
                        tdData = await taxDeclarationService.getTaxDeclaration(doc.id);
                    } catch (err) {
                        console.error('Failed to fetch tax declaration:', err);
                        tdData = {};
                    }
                }

                PDFComponent = <TaxDeclarationPDF
                    data={tdData || {}}
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

    const handleMarkAsReleased = async (releasedBy: string) => {
        await Promise.all(documents.map((doc: any) =>
            requestService.markAsReleased(doc.id, releasedBy)
        ));
        addAdminAuditEntry({
            type: 'document_released',
            description: `Released ${documents.length} document(s) to ${requesterName}`,
        }).catch(() => { });
    };

    return (
        <div className="pd-page page-transition">
            <div className="pd-panel">
                <div className="pd-header-banner">
                    {workflowStep === 'VERIFICATION' && (
                        <button onClick={onBack} className="pd-header-back-btn" title="Back to Queue">&larr;</button>
                    )}

                    <div className="pd-header-text">
                        <h2 className="pd-header-title">
                            {workflowStep === 'VERIFICATION'
                                ? 'Final Verification & Payment'
                                : 'Document Generation & Release'}
                        </h2>
                        <span className="pd-header-subtitle">
                            {workflowStep === 'RELEASE' ? 'Documents processed for ' : 'Prepare documents for '}
                            <strong>{requesterName}</strong>
                        </span>
                    </div>
                </div>

                <div className="pd-body">
                    {banner && <div className={`pd-banner pd-banner--${banner.type}`}>{banner.text}</div>}

                    {workflowStep === 'VERIFICATION' && (
                        <DocumentVerificationPanel
                            documents={documents}
                            requesterName={requesterName}
                            totalAmount={totalAmount}
                            orNumber={orNumber}
                            onOrNumberChange={(val) => { setOrNumber(val); setIsVerified(false); setIsOverridden(false); }}
                            isVerified={isVerified}
                            isVerifying={isVerifying}
                            isOverridden={isOverridden}
                            justification={justification}
                            fieldErrors={fieldErrors}
                            onVerify={handleVerify}
                            onEditVerify={handleEditVerify}
                            onPreviewDoc={setSelectedDocForPreview}
                            onConfirmAndGenerate={handleConfirmAndGenerate}
                        />
                    )}

                    {workflowStep === 'RELEASE' && (
                        <DocumentReleasePanel
                            documents={documents}
                            orNumber={orNumber}
                            activePreview={activePreview}
                            isGeneratingPdf={isGeneratingPdf}
                            onSelectDocument={handlePrintDocument}
                            activeSignatories={activeSignatories}
                            docSignatories={docSignatories}
                            onSignatoryChange={handleSignatoryChange}
                            releaseStaffOptions={releaseStaff}
                            onMarkAsReleased={handleMarkAsReleased}
                            onReleased={onReleased ?? onBack}
                        />
                    )}
                </div>
            </div>

            {selectedDocForPreview && (
                <InitialDocumentPreviewModal
                    documentItem={selectedDocForPreview}
                    onClose={() => setSelectedDocForPreview(null)}
                    onUpdateSuccess={handleUpdateSuccess}
                />
            )}

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
                                <textarea
                                    className={`pd-field-textarea${justificationError ? ' pd-field-invalid' : ''}`}
                                    rows={3}
                                    value={justification}
                                    onChange={(e) => { setJustification(e.target.value); setJustificationError(''); }}
                                />
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