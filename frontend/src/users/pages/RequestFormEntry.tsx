import { useState, useEffect, useRef } from 'react';
import { requestService, type RequestFormData } from '../services/requestService';
import type { User } from '../../auth-folder/types/auth';
import type { CompletedEntryData } from '../types/taxDeclaration';
import '../styles/RequestFormEntry.css';

// TEMP: extending RequestFormData locally until these fields are added to the
// real requestService.ts interface. Confirm with backend before relying on this.
interface ExtendedRequestFormData extends RequestFormData {
    propertyLocation: string;
    releasingStaffId: string;
    releaseDate: string;
    referenceNumber: string;
}

interface RequestFormEntryProps {
    user: User;
    onCancel: () => void;
    onEntryComplete: (data: CompletedEntryData) => void;
    onNavigateToProcessing: (view: string) => void;
    prefilledRequestData?: any | null;
}

function ToggleButtonPair({
    leftLabel,
    rightLabel,
    value,
    onChange,
}: {
    leftLabel: string;
    rightLabel: string;
    value: boolean | null;
    onChange: (val: boolean) => void;
}) {
    return (
        <div className="toggle-pair">
            <button
                type="button"
                className={`toggle-btn ${value === true ? 'toggle-btn-active' : ''}`}
                onClick={() => onChange(true)}
            >
                <span className="toggle-checkbox">{value === true && '✓'}</span>
                {leftLabel}
            </button>
            <button
                type="button"
                className={`toggle-btn ${value === false ? 'toggle-btn-active' : ''}`}
                onClick={() => onChange(false)}
            >
                <span className="toggle-checkbox">{value === false && '✓'}</span>
                {rightLabel}
            </button>
        </div>
    );
}

function MultiSelectDropdown({
    options,
    selectedIds,
    onChange,
    placeholder,
}: {
    options: { id: string; name: string }[];
    selectedIds: string[];
    onChange: (ids: string[]) => void;
    placeholder: string;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const toggleOption = (id: string) => {
        if (selectedIds.includes(id)) {
            onChange(selectedIds.filter((i) => i !== id));
        } else {
            onChange([...selectedIds, id]);
        }
    };

    const label =
        selectedIds.length === 0
            ? placeholder
            : options
                .filter((o) => selectedIds.includes(o.id))
                .map((o) => o.name)
                .join(', ');

    return (
        <div className="custom-select" ref={ref}>
            <button
                type="button"
                className="custom-select-trigger"
                onClick={() => setOpen((o) => !o)}
            >
                <span className={selectedIds.length === 0 ? 'placeholder-text' : ''}>
                    {label}
                </span>
                <span className={`chevron ${open ? 'chevron-up' : ''}`}>▾</span>
            </button>
            {open && (
                <div className="custom-select-menu">
                    {options.length === 0 && (
                        <div className="custom-select-empty">No options available</div>
                    )}
                    {options.map((opt) => (
                        <label key={opt.id} className="custom-select-option">
                            <input
                                type="checkbox"
                                checked={selectedIds.includes(opt.id)}
                                onChange={() => toggleOption(opt.id)}
                            />
                            {opt.name}
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
}

function SingleSelectDropdown({
    options,
    value,
    onChange,
    placeholder,
}: {
    options: { id: string; name: string }[];
    value: string;
    onChange: (id: string) => void;
    placeholder: string;
}) {
    return (
        <div className="custom-select">
            <select
                className="native-select"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            >
                <option value="" disabled>
                    {placeholder}
                </option>
                {options.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                        {opt.name}
                    </option>
                ))}
            </select>
        </div>
    );
}

// Small inline icon set for section headers — kept dependency-free.
// Each SVG now has explicit width/height to prevent them from filling
// their container when CSS doesn't constrain them.
const PersonIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
);
const PlusCircleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v8M8 12h8" />
    </svg>
);
const ClipboardIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="5" y="4" width="14" height="17" rx="2" />
        <path d="M9 4V3a1 1 0 011-1h4a1 1 0 011 1v1M9 10h6M9 14h6M9 18h3" />
    </svg>
);
// Larger variant for the card header
const ClipboardIconLarge = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="5" y="4" width="14" height="17" rx="2" />
        <path d="M9 4V3a1 1 0 011-1h4a1 1 0 011 1v1M9 10h6M9 14h6M9 18h3" />
    </svg>
);

// Default options for "May I/We request for:" — used until/unless the
// backend metadata endpoint returns its own docTypes list (see fetchMeta below).
const DEFAULT_DOCUMENT_TYPES = [
    { id: 'ctc-latest-tax-dec', name: 'Certified True Copy of the Latest Tax Declaration' },
    { id: 'ctc-old-tax-dec', name: 'Certified True Copy of Old Tax Declaration' },
    { id: 'cert-property', name: 'Certificate of Property/Landholding' },
    { id: 'cert-no-property', name: 'Certificate of No Property/Landholding' },
];

// PLACEHOLDER: maps a document type's display name to the view/page it
// should proceed to. Swap these view keys for your real route names once
// they're finalized.
const DOCUMENT_TYPE_VIEW_MAP: Record<string, string> = {
    'Certified True Copy of the Latest Tax Declaration': 'tax-declaration',
    'Certified True Copy of Latest Tax Declaration': 'tax-declaration',
    'Certified True Copy of Old Tax Declaration': 'tax-declaration',
    'Certificate of Property/Landholding': 'certificate-land-holding',
    'Certificate of Landholding': 'certificate-land-holding',
    'Certificate of No Property/Landholding': 'certificate-no-landholding',
    'Certificate of No Landholding': 'certificate-no-landholding',
};

export function RequestFormEntry({
    user,
    onCancel,
    onEntryComplete,
    onNavigateToProcessing,
    prefilledRequestData,
}: RequestFormEntryProps) {
    const [submitting, setSubmitting] = useState(false);
    const [metadata, setMetadata] = useState<{
        docTypes: any[];
        purposes: any[];
        staff: any[];
    }>({
        docTypes: DEFAULT_DOCUMENT_TYPES,
        purposes: [],
        staff: [],
    });
    // New state for template handling and validation
    const [validationError, setValidationError] = useState<string>('');
    const [hasSavedTemplate, setHasSavedTemplate] = useState<boolean>(false);

    const [formData, setFormData] = useState<ExtendedRequestFormData>({
        declarantName: '',
        requestedByName: '',
        requestDate: new Date().toISOString().split('T')[0],
        purposeId: '',
        documentTypeIds: [],
        authRequired: false,
        actionTaken: 'PENDING',
        propertyLocation: '',
        releasingStaffId: '',
        releaseDate: '',
        referenceNumber: `REF-${new Date().getFullYear()}-0000`,
    });

    useEffect(() => {
        if (prefilledRequestData) {
            setFormData((prev) => ({
                ...prev,
                ...prefilledRequestData,
                referenceNumber: prefilledRequestData.referenceNumber || prefilledRequestData.control_number || `REF-${new Date().getFullYear()}-0000`,
                declarantName: prefilledRequestData.declarantName || prefilledRequestData.declarant_name || '',
                requestedByName: prefilledRequestData.requestedByName || prefilledRequestData.requested_by_name || '',
                requestDate: prefilledRequestData.requestDate || prefilledRequestData.request_date || new Date().toISOString().split('T')[0],
                authRequired: prefilledRequestData.authRequired !== undefined
                    ? prefilledRequestData.authRequired
                    : (prefilledRequestData.authorization_required || false),
                purposeId: prefilledRequestData.purposeId || prefilledRequestData.purpose_id || '',
                actionTaken: prefilledRequestData.actionTaken || prefilledRequestData.action_taken || 'PENDING',
                propertyLocation: prefilledRequestData.propertyLocation || prefilledRequestData.property_location || '',
                documentTypeIds: prefilledRequestData.documentTypeIds || [],
            }));
        }
        // Check for saved template on component mount
        const saved = localStorage.getItem('requestFormTemplate');
        if (saved) setHasSavedTemplate(true);
    }, [prefilledRequestData]);

    // Used in the form header subtitle
    const today = new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });

    useEffect(() => {
        let isMounted = true;
        const fetchMeta = async () => {
            try {
                const data = await requestService.getMetadata();
                if (isMounted && data) {
                    setMetadata({
                        docTypes:
                            Array.isArray(data.docTypes) && data.docTypes.length > 0
                                ? data.docTypes
                                : DEFAULT_DOCUMENT_TYPES,
                        purposes: Array.isArray(data.purposes) ? data.purposes : [],
                        // TODO(confirm): backend /api/requests/metadata does not
                        // guarantee a `staff` array in the current requestService.ts.
                        // Falls back to [] if absent — "Releasing Staff" dropdown
                        // will be empty until the backend adds this.
                        staff: Array.isArray((data as any).staff) ? (data as any).staff : [],
                    });
                }
            } catch (err) {
                console.error('Metadata fetch failed', err);
            }
        };
        fetchMeta();
        return () => {
            isMounted = false;
        };
    }, []);

    // Mapping of document type IDs to processing view keys (fallback if name mapping fails)
    const DOCUMENT_TYPE_ID_VIEW_MAP: Record<string, string> = {
        'dt1': 'tax-declaration', // Certified True Copy of the Latest Tax Declaration
        'dt2': 'tax-declaration', // Certified True Copy of Old Tax Declaration
        'dt3': 'certificate-land-holding', // Certificate of Property/Landholding
        'dt4': 'certificate-no-landholding', // Certificate of No Property/Landholding
    };

    const handleProceedToDocument = async () => {
        // Basic required fields validation
        if (!formData.declarantName || !formData.requestedByName || !formData.requestDate || formData.documentTypeIds.length === 0) {
            setValidationError('Please fill out all required fields before proceeding.');
            return;
        }
        setValidationError('');
        // Only the first selected document type is used to decide where to go.
        const selectedId = formData.documentTypeIds[0];
        const selectedDoc = metadata.docTypes.find((d) => d.id === selectedId);
        // Determine target view using ID map directly (more reliable)
        let view: string | undefined;
        if (selectedDoc) {
            // 1. Try explicit ID map or Name map
            view = DOCUMENT_TYPE_ID_VIEW_MAP[selectedDoc.id] || DOCUMENT_TYPE_VIEW_MAP[selectedDoc.name];

            // 2. Try substring mapping if the exact match fails (handles dynamic database items)
            if (!view) {
                const nameLower = selectedDoc.name.toLowerCase();
                if (nameLower.includes('tax declaration') || nameLower.includes('tax dec')) {
                    view = 'tax-declaration';
                } else if (nameLower.includes('no landholding') || nameLower.includes('no property')) {
                    view = 'certificate-no-landholding';
                } else if (nameLower.includes('landholding') || nameLower.includes('property')) {
                    view = 'certificate-land-holding';
                }
            }
        }
        if (!view) {
            alert(`No document page is set up yet for "${selectedDoc?.name ?? 'this document type'}".`);
            return;
        }

        setSubmitting(true);
        try {
            let savedRequest;
            if (formData.id) {
                // Update existing request (typo fix!)
                const res = await requestService.updateRequest(formData.id, formData);
                savedRequest = res.data || res;
            } else {
                // Create new request in database
                const res = await requestService.submitRequest(formData, user.id);
                savedRequest = res.data || res;
            }

            const actualRequestId = savedRequest?.id || formData.id || formData.referenceNumber;
            const actualReferenceNumber = savedRequest?.control_number || savedRequest?.referenceNumber || formData.referenceNumber;

            // Update local form state with final database values
            setFormData(prev => ({
                ...prev,
                id: actualRequestId,
                referenceNumber: actualReferenceNumber
            }));

            // Save entry data then navigate
            onEntryComplete({
                requestId: actualRequestId,
                referenceNumber: actualReferenceNumber,
                declarantName: formData.declarantName,
                requestedByName: formData.requestedByName,
                requestDate: formData.requestDate,
                purposeId: formData.purposeId,
                documentTypeIds: formData.documentTypeIds,
                actionTaken: formData.actionTaken,
                authRequired: formData.authRequired,
                propertyLocation: formData.propertyLocation,
            });

            // Slight async tick to ensure state propagation before view change
            setTimeout(() => onNavigateToProcessing(view), 0);
        } catch (err: any) {
            console.error('Failed to save request:', err);
            alert(err.response?.data?.error || 'Failed to save request. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSaveDraft = async () => {
        // SETBACK 1 & 5 FIXED (Forgiving Drafts): Allow saving as long as AT LEAST ONE name is typed.
        if (!formData.declarantName && !formData.requestedByName) {
            return alert('Please enter at least the Requester or Declarant name to save a draft.');
        }

        setSubmitting(true);
        try {
            if (formData.id) {
                await requestService.updateRequest(formData.id, formData);
            } else {
                const res = await requestService.submitRequest(formData, user.id);
                const savedRequest = res.data || res;
                if (savedRequest?.id) {
                    setFormData(prev => ({
                        ...prev,
                        id: savedRequest.id,
                        referenceNumber: savedRequest.control_number || savedRequest.referenceNumber || prev.referenceNumber
                    }));
                }
            }
            onCancel(); // Goes back to Request Hub
        } catch (err: any) {
            alert(err.response?.data?.error || 'Submit failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleResetForm = () => {
        if (confirm("Clear this form for a new client?")) {
            setFormData({
                declarantName: '',
                requestedByName: '',
                requestDate: new Date().toISOString().split('T')[0],
                purposeId: '',
                documentTypeIds: [],
                authRequired: false,
                actionTaken: 'PENDING',
                propertyLocation: '',
                releasingStaffId: '',
                releaseDate: '',
                referenceNumber: `REF-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
            });
            setValidationError('');
        }
    };

    return (
        <div className="rfe-page">
            <div className="rfe-page-inner">
                <div className="rfe-card">

                    {/* ── Card header ── */}
                    <div className="rfe-card-header">
                        <div className="rfe-card-header-left">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span className="rfe-header-icon">
                                    <ClipboardIconLarge />
                                </span>
                                <div>
                                    <h2 className="rfe-card-title">REQUEST FORM ENTRY</h2>
                                    <div className="rfe-card-subtitle">
                                        Property Record and Document Request · {today}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <span className="rfe-ref-chip">{formData.referenceNumber}</span>
                            {/* ✅ NEW RESET BUTTON */}
                            <button className="btn-reset-form" onClick={handleResetForm} title="Start fresh for a new client">
                                ↻ New Client
                            </button>
                        </div>
                    </div>

                    {/* ── Form body ── */}
                    <div className="rfe-form-body">

                        {/* ══ SECTION 1: Declarant Details ══ */}
                        <div className="rfe-section">
                            <div className="rfe-section-title">
                                <PersonIcon />
                                <span>Declarant Details</span>
                            </div>

                            <div className="rfe-field">
                                <label className="rfe-label">Name of Declarant</label>
                                <div className="input-with-clear"> {/* ✅ WRAPPER FOR CLEAR BTN */}
                                    <input
                                        className="rfe-input"
                                        type="text"
                                        placeholder="e.g. Juan D. Cruz"
                                        value={formData.declarantName}
                                        onChange={(e) =>
                                            setFormData({ ...formData, declarantName: e.target.value })
                                        }
                                    />
                                    {/* ✅ QUICK CLEAR BUTTON */}
                                    {formData.declarantName && (
                                        <button
                                            type="button"
                                            className="input-clear-btn"
                                            onClick={() => setFormData({ ...formData, declarantName: '' })}
                                            title="Clear Name"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="rfe-field" style={{ marginTop: 14 }}>
                                <label className="rfe-label">Location of the Property</label>
                                <SingleSelectDropdown
                                    options={[]} // TODO: wire to a barangay/municipality data source
                                    value={formData.propertyLocation}
                                    onChange={(val) =>
                                        setFormData({ ...formData, propertyLocation: val })
                                    }
                                    placeholder="Brgy., Municipality, Province"
                                />
                            </div>

                            <div className="rfe-field" style={{ marginTop: 14 }}>
                                <label className="rfe-label">Date of Request</label>
                                <input
                                    className="rfe-input"
                                    type="date"
                                    value={formData.requestDate}
                                    onChange={(e) =>
                                        setFormData({ ...formData, requestDate: e.target.value })
                                    }
                                />
                            </div>

                            <div className="rfe-field" style={{ marginTop: 14 }}>
                                <label className="rfe-label">Requested By</label>
                                <input
                                    className="rfe-input"
                                    type="text"
                                    placeholder="e.g. Juan D. Cruz"
                                    value={formData.requestedByName}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            requestedByName: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            <div className="rfe-field" style={{ marginTop: 14 }}>
                                <label className="rfe-label">Authorization</label>
                                <ToggleButtonPair
                                    leftLabel="Authorization Needed"
                                    rightLabel="Authorization Not Needed"
                                    value={formData.authRequired}
                                    onChange={(val) =>
                                        setFormData({ ...formData, authRequired: val })
                                    }
                                />
                            </div>
                        </div>

                        {/* ══ SECTION 2: Request Details ══ */}
                        <div className="rfe-section">
                            <div className="rfe-section-title">
                                <PlusCircleIcon />
                                <span>Request Details</span>
                            </div>

                            <div className="rfe-field">
                                <label className="rfe-label">May I/We request for:</label>
                                <MultiSelectDropdown
                                    options={metadata.docTypes}
                                    selectedIds={formData.documentTypeIds}
                                    onChange={(ids) =>
                                        setFormData({ ...formData, documentTypeIds: ids })
                                    }
                                    placeholder="Select Document Type(s)..."
                                />
                            </div>

                            <div className="rfe-field" style={{ marginTop: 14 }}>
                                <label className="rfe-label">Reason / Purpose</label>
                                <SingleSelectDropdown
                                    options={metadata.purposes}
                                    value={formData.purposeId}
                                    onChange={(val) =>
                                        setFormData({ ...formData, purposeId: val })
                                    }
                                    placeholder="Select Reason / Purpose..."
                                />
                            </div>
                        </div>

                        {/* ══ SECTION 3: Action Taken ══ */}
                        <div className="rfe-section">
                            <div className="rfe-section-title">
                                <ClipboardIcon />
                                <span>Action Taken</span>
                            </div>

                            <div className="rfe-field">
                                <ToggleButtonPair
                                    leftLabel="APPROVED"
                                    rightLabel="DISAPPROVED"
                                    value={
                                        formData.actionTaken === 'APPROVED'
                                            ? true
                                            : formData.actionTaken === 'DISAPPROVED'
                                                ? false
                                                : null
                                    }
                                    onChange={(val) =>
                                        setFormData({
                                            ...formData,
                                            actionTaken: val ? 'APPROVED' : 'DISAPPROVED',
                                        })
                                    }
                                />
                            </div>

                            <div className="rfe-return-archive-box">
                                <div className="rfe-return-archive-label">
                                    Document has been returned to archived:
                                </div>
                                <div className="rfe-field">
                                    <label className="rfe-label">Name of Releasing Staff</label>
                                    <SingleSelectDropdown
                                        options={metadata.staff}
                                        value={formData.releasingStaffId}
                                        onChange={(val) =>
                                            setFormData({ ...formData, releasingStaffId: val })
                                        }
                                        placeholder="Name of Releasing Staff"
                                    />
                                </div>
                                <div className="rfe-field" style={{ marginTop: 14 }}>
                                    <label className="rfe-label">Date</label>
                                    <input
                                        className="rfe-input"
                                        type="date"
                                        value={formData.releaseDate}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                releaseDate: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                            </div>

                            {/* NOTE: hardcoded per mockup */}
                            <div className="rfe-signature-block">
                                <div className="rfe-signature-name">ENGR. VICENTE P. DESOY, REA</div>
                                <div className="rfe-signature-title">PROVINCIAL ASSESSOR</div>
                            </div>
                        </div>
                    </div>

                    {/* ── Reuse advisory ── */}
                    <div className="form-reuse-notice">
                        <div className="form-reuse-notice-icon">💡</div>
                        <div className="form-reuse-notice-text">
                            <strong>This entry is reusable.</strong> After saving, this request form can generate
                            multiple document types (e.g. Tax Declaration <em>and</em> a Certificate of Land Holding)
                            for the same client — without re-filling the form.
                        </div>
                    </div>

                    {/* ── Template controls ── */}
                    <div className="rfe-template-controls">
                        <button className="rfe-btn-template" onClick={() => {
                            localStorage.setItem('requestFormTemplate', JSON.stringify(formData));
                            setHasSavedTemplate(true);
                        }}>💾 Save as Template</button>
                        {hasSavedTemplate && (
                            <button className="rfe-btn-template" onClick={() => {
                                const saved = localStorage.getItem('requestFormTemplate');
                                if (saved) setFormData(JSON.parse(saved));
                            }}>📋 Load Template</button>
                        )}
                    </div>

                    {/* ── Validation Warning ── */}
                    {validationError && (
                        <div className="warning-banner" role="alert">{validationError}</div>
                    )}

                    {/* ── Footer ── */}
                    <div className="rfe-footer">
                        <button
                            className="btn-submit"
                            onClick={handleSaveDraft}
                            disabled={submitting}
                        >
                            {submitting ? 'Saving…' : '💾 Save Draft'}
                        </button>
                        <button
                            className="btn-proceed"
                            type="button"
                            onClick={handleProceedToDocument}
                        >
                            Proceed to Document →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}