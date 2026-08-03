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
    onBack: () => void;
    onReleased?: () => void;
    onReleasedReprint?: () => void;   // NEW — where reprint releases go instead
    onSavedForLater?: () => void;
    onEditDocument?: (referenceNumber: string) => void;
}

const isReprintReference = (referenceNumber: string) => /-R\d+$/.test(referenceNumber || '');

const DEFAULT_SIGNATORIES = [
    { id: 'sig_1', name: 'ELVIRA T. ENAO, REA', title: 'Local Assessment Operations Officer IV', role: 'AUTHORIZED_REP' },
    { id: 'sig_2', name: 'ENGR. VICENTE P. DESOY, REA', title: 'Provincial Assessor', role: 'ASSESSOR' },
    { id: 'sig_3', name: 'CHINA CHAN-OLARIO, RN, REA, REB, Enp', title: 'Assistant Provincial Assessor', role: 'ASST_ASSESSOR' },
];

// Default property-table layout (row height / text sizes / column widths, %)
// for Landholding certs. Column widths mirror the template's built-in
// defaults so an un-adjusted table renders identically to before this
// feature existed.
const DEFAULT_TABLE_SPACING = {
    rowHeight: 22,
    fontSize: 9,
    headerFontSize: 10,
    colWidths: { marginLeft: 0, td: 18, location: 26, lot: 12, title: 12, area: 14, assessed: 18, marginRight: 0 },
};

// Default signatory text sizing / block width for Landholding certs.
// Gives staff a way to shrink the font or widen the block when a
// signatory's name or title is too long to fit cleanly at the default size.
const DEFAULT_SIGNATORY_STYLE = {
    nameFontSize: 11,
    titleFontSize: 11,
    blockWidth: 250,
    // Per-signatory horizontal nudge (pt) — moves that signatory's whole
    // block (name + title together) left/right of its default position.
    offsetX1: 0,
    offsetX2: 0,
};

type TableSpacing = typeof DEFAULT_TABLE_SPACING;
type SignatoryStyle = typeof DEFAULT_SIGNATORY_STYLE;

const getFormattedDates = () => {
    const today = new Date();
    const day = today.getDate().toString();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthYear = `${monthNames[today.getMonth()]} ${today.getFullYear()}`;
    const datePaid = today.toLocaleDateString('en-PH', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    return { day, monthYear, datePaid };
};

export function PaymentDetails({ payment, onBack, onReleased, onReleasedReprint, onSavedForLater }: PaymentDetailsProps) {
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
    // Per-document signature-layout spacing (Landholding certs only for now).
    // Seeded from the certificate's saved values the first time a doc is
    // previewed, then staff can nudge it live via the +/- steppers in
    // DocumentReleasePanel — each nudge regenerates the preview immediately.
    const [docSpacing, setDocSpacing] = useState<Record<string, { top: number; gap: number }>>({});
    // Receipt block (Cert. Fee / O.R. No. / Dated) position + row spacing —
    // same seed-then-live-nudge pattern as docSpacing above.
    const [docReceiptSpacing, setDocReceiptSpacing] = useState<Record<string, { bottom: number; left: number; rowGap: number }>>({});
    // Property table layout (row height, row/header text size, per-column
    // widths) — same seed-then-live-nudge pattern, Landholding certs only.
    const [docTableSpacing, setDocTableSpacing] = useState<Record<string, TableSpacing>>({});
    // Signatory text sizing / block width — same seed-then-live-nudge
    // pattern, Landholding certs only. Exists so a very long name/title
    // has somewhere to go besides clipping or overflowing the layout.
    const [docSignatoryStyle, setDocSignatoryStyle] = useState<Record<string, SignatoryStyle>>({});
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

    // Live spacing nudge from the +/- steppers — mirrors handleSignatoryChange:
    // update state, then immediately regenerate the preview if this doc is
    // the one currently showing.
    const handleSpacingChange = (docId: string, field: 'top' | 'gap', value: number) => {
        setDocSpacing(prev => {
            const current = prev[docId] || { top: 60, gap: 65 };
            const updated = { ...prev, [docId]: { ...current, [field]: value } };
            const doc = documents.find(d => d.id === docId);
            if (doc && activePreview?.docId === docId) {
                setTimeout(() => handlePrintDocument(doc, undefined, updated), 0);
            }
            return updated;
        });
    };

    const handleReceiptSpacingChange = (docId: string, field: 'bottom' | 'left' | 'rowGap', value: number) => {
        setDocReceiptSpacing(prev => {
            const current = prev[docId] || { bottom: 100, left: 80, rowGap: 2 };
            const updated = { ...prev, [docId]: { ...current, [field]: value } };
            const doc = documents.find(d => d.id === docId);
            if (doc && activePreview?.docId === docId) {
                setTimeout(() => handlePrintDocument(doc, undefined, undefined, updated), 0);
            }
            return updated;
        });
    };

    // Live table-layout nudge (row height / text sizes) — same pattern as
    // the spacing handlers above.
    const handleTableSpacingChange = (docId: string, field: 'rowHeight' | 'fontSize' | 'headerFontSize', value: number) => {
        setDocTableSpacing(prev => {
            const current = prev[docId] || DEFAULT_TABLE_SPACING;
            const updated = { ...prev, [docId]: { ...current, [field]: value } };
            const doc = documents.find(d => d.id === docId);
            if (doc && activePreview?.docId === docId) {
                setTimeout(() => handlePrintDocument(doc, undefined, undefined, undefined, updated), 0);
            }
            return updated;
        });
    };

    // Bulk column-width update — used by the drag-to-resize bar, which
    // always changes two adjacent columns at once (grow one, shrink its
    // neighbor by the same amount) so the row keeps summing to ~100%
    // without staff having to balance the numbers themselves.
    const handleColWidthsChange = (docId: string, updates: Partial<TableSpacing['colWidths']>) => {
        setDocTableSpacing(prev => {
            const current = prev[docId] || DEFAULT_TABLE_SPACING;
            const updated = {
                ...prev,
                [docId]: { ...current, colWidths: { ...current.colWidths, ...updates } },
            };
            const doc = documents.find(d => d.id === docId);
            if (doc && activePreview?.docId === docId) {
                setTimeout(() => handlePrintDocument(doc, undefined, undefined, undefined, updated), 0);
            }
            return updated;
        });
    };

    // Live signatory text-size / block-width nudge — same pattern as the
    // other spacing handlers. Exists so a long name or title has somewhere
    // to go besides clipping.
    const handleSignatoryStyleChange = (docId: string, field: keyof SignatoryStyle, value: number) => {
        setDocSignatoryStyle(prev => {
            const current = prev[docId] || DEFAULT_SIGNATORY_STYLE;
            const updated = { ...prev, [docId]: { ...current, [field]: value } };
            const doc = documents.find(d => d.id === docId);
            if (doc && activePreview?.docId === docId) {
                setTimeout(() => handlePrintDocument(doc, undefined, undefined, undefined, undefined, updated), 0);
            }
            return updated;
        });
    };

    // --- Per-section "Reset to default" handlers, one per accordion in the
    // release panel. Kept separate (rather than one global reset) so
    // fixing a fat-fingered value in one section doesn't wipe out
    // deliberate adjustments made in another. ---
    const handleResetSpacing = (docId: string) => {
        setDocSpacing(prev => {
            const updated = { ...prev, [docId]: { top: 60, gap: 65 } };
            const doc = documents.find(d => d.id === docId);
            if (doc && activePreview?.docId === docId) {
                setTimeout(() => handlePrintDocument(doc, undefined, updated), 0);
            }
            return updated;
        });
    };

    const handleResetReceiptSpacing = (docId: string) => {
        setDocReceiptSpacing(prev => {
            const updated = { ...prev, [docId]: { bottom: 100, left: 80, rowGap: 2 } };
            const doc = documents.find(d => d.id === docId);
            if (doc && activePreview?.docId === docId) {
                setTimeout(() => handlePrintDocument(doc, undefined, undefined, updated), 0);
            }
            return updated;
        });
    };

    const handleResetTableSpacing = (docId: string) => {
        setDocTableSpacing(prev => {
            const updated = { ...prev, [docId]: DEFAULT_TABLE_SPACING };
            const doc = documents.find(d => d.id === docId);
            if (doc && activePreview?.docId === docId) {
                setTimeout(() => handlePrintDocument(doc, undefined, undefined, undefined, updated), 0);
            }
            return updated;
        });
    };

    const handleResetSignatoryStyle = (docId: string) => {
        setDocSignatoryStyle(prev => {
            const updated = { ...prev, [docId]: DEFAULT_SIGNATORY_STYLE };
            const doc = documents.find(d => d.id === docId);
            if (doc && activePreview?.docId === docId) {
                setTimeout(() => handlePrintDocument(doc, undefined, undefined, undefined, undefined, updated), 0);
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
    // Accepts optional overrides for signatories, signature spacing, receipt
    // spacing, table layout, and signatory text sizing so a just-changed
    // control reflects immediately without waiting for a state re-read.
    const handlePrintDocument = async (
        doc: any,
        signatoriesOverride?: Record<string, any>,
        spacingOverride?: Record<string, { top: number; gap: number }>,
        receiptSpacingOverride?: Record<string, { bottom: number; left: number; rowGap: number }>,
        tableSpacingOverride?: Record<string, TableSpacing>,
        signatoryStyleOverride?: Record<string, SignatoryStyle>
    ) => {
        setIsGeneratingPdf(doc.id);
        try {
            const { day, monthYear, datePaid } = getFormattedDates();
            const sigs = (signatoriesOverride || docSignatories)[doc.id];
            const liveSpacing = (spacingOverride || docSpacing)[doc.id];
            const liveReceiptSpacing = (receiptSpacingOverride || docReceiptSpacing)[doc.id];
            const liveTableSpacing = (tableSpacingOverride || docTableSpacing)[doc.id];
            const liveSignatoryStyle = (signatoryStyleOverride || docSignatoryStyle)[doc.id];
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
                let fetchedSpacing = { top: doc.signatory_top_spacing, gap: doc.signatory_gap_spacing };
                let fetchedReceiptSpacing = {
                    bottom: doc.receipt_bottom_position,
                    left: doc.receipt_left_position,
                    rowGap: doc.receipt_row_spacing,
                };
                // Table layout fields are optional on the backend record —
                // if the columns don't exist yet, these all resolve to
                // undefined and the defaults below kick in.
                let fetchedTableSpacing = {
                    rowHeight: doc.table_row_height,
                    fontSize: doc.table_font_size,
                    headerFontSize: doc.table_header_font_size,
                    colWidths: doc.table_col_widths,
                };
                // Signatory text sizing is likewise optional on the backend
                // record — undefined columns just fall through to defaults.
                let fetchedSignatoryStyle = {
                    nameFontSize: doc.signatory_name_font_size,
                    titleFontSize: doc.signatory_title_font_size,
                    blockWidth: doc.signatory_block_width,
                    offsetX1: doc.signatory_1_offset_x,
                    offsetX2: doc.signatory_2_offset_x,
                };

                if (!landholdingProperties || fetchedSpacing.top == null || fetchedReceiptSpacing.bottom == null) {
                    try {
                        const cert = await landholdingService.getByRequestId(doc.id);
                        landholdingProperties = landholdingProperties || cert?.properties || [];
                        fetchedSpacing = {
                            top: fetchedSpacing.top ?? cert?.signatory_top_spacing,
                            gap: fetchedSpacing.gap ?? cert?.signatory_gap_spacing,
                        };
                        fetchedReceiptSpacing = {
                            bottom: fetchedReceiptSpacing.bottom ?? cert?.receipt_bottom_position,
                            left: fetchedReceiptSpacing.left ?? cert?.receipt_left_position,
                            rowGap: fetchedReceiptSpacing.rowGap ?? cert?.receipt_row_spacing,
                        };
                        fetchedTableSpacing = {
                            rowHeight: fetchedTableSpacing.rowHeight ?? (cert as any)?.table_row_height,
                            fontSize: fetchedTableSpacing.fontSize ?? (cert as any)?.table_font_size,
                            headerFontSize: fetchedTableSpacing.headerFontSize ?? (cert as any)?.table_header_font_size,
                            colWidths: fetchedTableSpacing.colWidths ?? (cert as any)?.table_col_widths,
                        };
                        fetchedSignatoryStyle = {
                            nameFontSize: fetchedSignatoryStyle.nameFontSize ?? (cert as any)?.signatory_name_font_size,
                            titleFontSize: fetchedSignatoryStyle.titleFontSize ?? (cert as any)?.signatory_title_font_size,
                            blockWidth: fetchedSignatoryStyle.blockWidth ?? (cert as any)?.signatory_block_width,
                            offsetX1: fetchedSignatoryStyle.offsetX1 ?? (cert as any)?.signatory_1_offset_x,
                            offsetX2: fetchedSignatoryStyle.offsetX2 ?? (cert as any)?.signatory_2_offset_x,
                        };
                    } catch (err) {
                        console.error('Failed to fetch landholding properties:', err);
                        landholdingProperties = landholdingProperties || [];
                    }
                }

                // Seed docSpacing / docReceiptSpacing / docTableSpacing /
                // docSignatoryStyle on first load of this document so the
                // sidebar controls have real starting values to display/edit.
                if (!docSpacing[doc.id]) {
                    setDocSpacing(prev => ({
                        ...prev,
                        [doc.id]: { top: fetchedSpacing.top ?? 60, gap: fetchedSpacing.gap ?? 65 },
                    }));
                }
                if (!docReceiptSpacing[doc.id]) {
                    setDocReceiptSpacing(prev => ({
                        ...prev,
                        [doc.id]: {
                            bottom: fetchedReceiptSpacing.bottom ?? 100,
                            left: fetchedReceiptSpacing.left ?? 80,
                            rowGap: fetchedReceiptSpacing.rowGap ?? 2,
                        },
                    }));
                }
                if (!docTableSpacing[doc.id]) {
                    setDocTableSpacing(prev => ({
                        ...prev,
                        [doc.id]: {
                            rowHeight: fetchedTableSpacing.rowHeight ?? DEFAULT_TABLE_SPACING.rowHeight,
                            fontSize: fetchedTableSpacing.fontSize ?? DEFAULT_TABLE_SPACING.fontSize,
                            headerFontSize: fetchedTableSpacing.headerFontSize ?? DEFAULT_TABLE_SPACING.headerFontSize,
                            colWidths: fetchedTableSpacing.colWidths ?? DEFAULT_TABLE_SPACING.colWidths,
                        },
                    }));
                }
                if (!docSignatoryStyle[doc.id]) {
                    setDocSignatoryStyle(prev => ({
                        ...prev,
                        [doc.id]: {
                            nameFontSize: fetchedSignatoryStyle.nameFontSize ?? DEFAULT_SIGNATORY_STYLE.nameFontSize,
                            titleFontSize: fetchedSignatoryStyle.titleFontSize ?? DEFAULT_SIGNATORY_STYLE.titleFontSize,
                            blockWidth: fetchedSignatoryStyle.blockWidth ?? DEFAULT_SIGNATORY_STYLE.blockWidth,
                            offsetX1: fetchedSignatoryStyle.offsetX1 ?? DEFAULT_SIGNATORY_STYLE.offsetX1,
                            offsetX2: fetchedSignatoryStyle.offsetX2 ?? DEFAULT_SIGNATORY_STYLE.offsetX2,
                        },
                    }));
                }

                const finalSpacing = liveSpacing || { top: fetchedSpacing.top ?? 60, gap: fetchedSpacing.gap ?? 65 };
                const finalReceiptSpacing = liveReceiptSpacing || {
                    bottom: fetchedReceiptSpacing.bottom ?? 100,
                    left: fetchedReceiptSpacing.left ?? 80,
                    rowGap: fetchedReceiptSpacing.rowGap ?? 2,
                };
                const finalTableSpacing = liveTableSpacing || {
                    rowHeight: fetchedTableSpacing.rowHeight ?? DEFAULT_TABLE_SPACING.rowHeight,
                    fontSize: fetchedTableSpacing.fontSize ?? DEFAULT_TABLE_SPACING.fontSize,
                    headerFontSize: fetchedTableSpacing.headerFontSize ?? DEFAULT_TABLE_SPACING.headerFontSize,
                    colWidths: fetchedTableSpacing.colWidths ?? DEFAULT_TABLE_SPACING.colWidths,
                };
                const finalSignatoryStyle = liveSignatoryStyle || {
                    nameFontSize: fetchedSignatoryStyle.nameFontSize ?? DEFAULT_SIGNATORY_STYLE.nameFontSize,
                    titleFontSize: fetchedSignatoryStyle.titleFontSize ?? DEFAULT_SIGNATORY_STYLE.titleFontSize,
                    blockWidth: fetchedSignatoryStyle.blockWidth ?? DEFAULT_SIGNATORY_STYLE.blockWidth,
                    offsetX1: fetchedSignatoryStyle.offsetX1 ?? DEFAULT_SIGNATORY_STYLE.offsetX1,
                    offsetX2: fetchedSignatoryStyle.offsetX2 ?? DEFAULT_SIGNATORY_STYLE.offsetX2,
                };

                PDFComponent = <CertOfLandholdingPDF
                    ownerName={doc.declarantName || doc.declarant_name}
                    properties={landholdingProperties}
                    day={day} monthYear={monthYear} orNumber={orNumber} datePaid={datePaid}
                    signatory1Name={sigs?.primary?.name} signatory1Title={sigs?.primary?.title}
                    signatory2Name={sigs?.secondary?.name} signatory2Title={sigs?.secondary?.title}
                    signatoryTopSpacing={finalSpacing.top}
                    signatoryGapSpacing={finalSpacing.gap}
                    signatoryNameFontSize={finalSignatoryStyle.nameFontSize}
                    signatoryTitleFontSize={finalSignatoryStyle.titleFontSize}
                    signatoryBlockWidth={finalSignatoryStyle.blockWidth}
                    signatory1HorizontalOffset={finalSignatoryStyle.offsetX1}
                    signatory2HorizontalOffset={finalSignatoryStyle.offsetX2}
                    receiptBottomPosition={finalReceiptSpacing.bottom}
                    receiptLeftPosition={finalReceiptSpacing.left}
                    receiptRowSpacing={finalReceiptSpacing.rowGap}
                    tableRowHeight={finalTableSpacing.rowHeight}
                    tableFontSize={finalTableSpacing.fontSize}
                    tableHeaderFontSize={finalTableSpacing.headerFontSize}
                    colWidths={finalTableSpacing.colWidths}
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

    const handleQueueForRelease = async () => {
        (onSavedForLater ?? onBack)();
    };

    return (
        <div className="pd-page page-transition">
            {workflowStep === 'VERIFICATION' && (
                <nav className="pd-breadcrumbs" aria-label="Breadcrumb">
                    <button type="button" className="pd-breadcrumb-link" onClick={onBack}>
                        Pending Payments
                    </button>
                    <span className="pd-breadcrumb-sep">›</span>
                    <span className="pd-breadcrumb-current">Verification and Payment</span>
                </nav>
            )}

            <div className="pd-panel">
                <div className="pd-header-banner">
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
                            docSpacing={docSpacing}
                            onSpacingChange={handleSpacingChange}
                            onResetSpacing={handleResetSpacing}
                            docReceiptSpacing={docReceiptSpacing}
                            onReceiptSpacingChange={handleReceiptSpacingChange}
                            onResetReceiptSpacing={handleResetReceiptSpacing}
                            docTableSpacing={docTableSpacing}
                            onTableSpacingChange={handleTableSpacingChange}
                            onColWidthsChange={handleColWidthsChange}
                            onResetTableSpacing={handleResetTableSpacing}
                            docSignatoryStyle={docSignatoryStyle}
                            onSignatoryStyleChange={handleSignatoryStyleChange}
                            onResetSignatoryStyle={handleResetSignatoryStyle}
                            releaseStaffOptions={releaseStaff}
                            onMarkAsReleased={handleMarkAsReleased}
                            onReleased={() => {
                                const isReprint = documents.some((doc: any) => isReprintReference(doc.referenceNumber));
                                (isReprint ? (onReleasedReprint ?? onReleased ?? onBack) : (onReleased ?? onBack))();
                            }}
                            onQueueForRelease={handleQueueForRelease}
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