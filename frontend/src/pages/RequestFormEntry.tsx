import { useState, useEffect, useRef } from 'react';
import { requestService, type RequestFormData } from '../services/requestService';
import type { User } from '../types/auth';
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
    /** Called when the entry form is successfully saved. Unlocks Request Processing. */
    onEntryComplete?: (data: CompletedEntryData) => void;
    /** Called when user clicks "Proceed to Processing" — navigates to the specific doc type view. */
    onNavigateToProcessing?: (view: string) => void;
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

// Small inline icon set for section headers — swap for your existing icon
// library (e.g. lucide-react) if you have one; kept dependency-free for now.
const PersonIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
);
const PlusCircleIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v8M8 12h8" />
    </svg>
);
const ClipboardIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

export function RequestFormEntry({ user, onCancel, onEntryComplete, onNavigateToProcessing }: RequestFormEntryProps) {
    const [submitting, setSubmitting] = useState(false);
    const [savedEntry, setSavedEntry] = useState<CompletedEntryData | null>(null);
    const [metadata, setMetadata] = useState<{
        docTypes: any[];
        purposes: any[];
        staff: any[];
    }>({
        docTypes: DEFAULT_DOCUMENT_TYPES,
        purposes: [],
        staff: [],
    });

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

    // Derived header display values from the real User shape (firstName/lastName)
    const fullName = `${user.firstName} ${user.lastName}`;
    const initial = user.firstName ? user.firstName.charAt(0).toUpperCase() : '?';
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

    const handleSave = async () => {
        if (!formData.declarantName) return alert('Declarant Name is required');
        setSubmitting(true);
        try {
            let savedRequestId: string;
            try {
                const result = await requestService.submitRequest(formData, user.id);
                savedRequestId = result?.data?.id ?? `mock-${Date.now()}`;
            } catch (netErr: any) {
                // Graceful fallback for mock/offline mode
                if (!netErr.response) {
                    console.warn('[RequestFormEntry] Backend unreachable — using mock request ID.');
                    savedRequestId = `mock-${Date.now()}`;
                } else {
                    throw netErr;
                }
            }

            const completedData: CompletedEntryData = {
                requestId: savedRequestId,
                referenceNumber: formData.referenceNumber,
                declarantName: formData.declarantName,
                requestedByName: formData.requestedByName,
                requestDate: formData.requestDate,
                purposeId: formData.purposeId,
                documentTypeIds: formData.documentTypeIds,
                actionTaken: formData.actionTaken,
                authRequired: formData.authRequired,
                propertyLocation: formData.propertyLocation,
            };

            setSavedEntry(completedData);
            onEntryComplete?.(completedData);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Submit failed');
        } finally {
            setSubmitting(false);
        }
    };

    /**
     * Determine which processing view to navigate to based on selected doc types.
     * Defaults to 'tax-declaration' if unable to determine.
     */
    const getProcessingView = (): string => {
        const ids = formData.documentTypeIds;
        if (!ids.length) return 'tax-declaration';
        // Use the first selected document type label/id to route
        // (Real mapping should come from metadata docTypes array)
        const firstId = ids[0].toLowerCase();
        if (firstId.includes('land') && firstId.includes('no')) return 'certificate-no-landholding';
        if (firstId.includes('land')) return 'certificate-land-holding';
        return 'tax-declaration';
    };

    const handleProceed = () => {
        if (!savedEntry) {
            alert('Please save the request first before proceeding.');
            return;
        }
        onNavigateToProcessing?.(getProcessingView());
    };

    return (
        <div className="request-page">
            <div className="assessordesk-header">
                <div className="assessordesk-brand">
                    <span className="assessordesk-logo">🏛️</span>
                    <div>
                        <div className="assessordesk-title">
                            ASSESSOR<span className="accent">DESK</span>
                        </div>
                        <div className="assessordesk-subtitle">Office Of The Provincial Assessor</div>
                    </div>
                </div>
                <div className="assessordesk-user">
                    <span className="user-avatar">{initial}</span>
                    <div>
                        <div className="user-name">{fullName}</div>
                        <div className="user-date">{today}</div>
                    </div>
                </div>
            </div>

            <div className="request-form-container">
                <div className="form-card">
                    <div className="form-header">
                        <div className="form-header-title">
                            <span className="form-header-icon">
                                <ClipboardIcon />
                            </span>
                            <div>
                                <h2>REQUEST FORM ENTRY</h2>
                                <div className="form-subtitle">
                                    Property Record and Document Request
                                </div>
                            </div>
                        </div>
                        <span className="ref-badge">{formData.referenceNumber}</span>
                    </div>

                    <div className="form-body">
                        {/* Declarant Details */}
                        <div className="form-section">
                            <div className="section-title">
                                <PersonIcon />
                                <span>Declarant Details</span>
                            </div>

                            <div className="form-group">
                                <label>Name of Declarant</label>
                                <input
                                    className="form-input"
                                    type="text"
                                    placeholder="e.g. John D. Joe"
                                    value={formData.declarantName}
                                    onChange={(e) =>
                                        setFormData({ ...formData, declarantName: e.target.value })
                                    }
                                />
                            </div>

                            <div className="form-group">
                                <label>Location of the Property</label>
                                <SingleSelectDropdown
                                    options={[]} // TODO: wire to a barangay/municipality data source
                                    value={formData.propertyLocation}
                                    onChange={(val) =>
                                        setFormData({ ...formData, propertyLocation: val })
                                    }
                                    placeholder="Brgy., Municipality, Province"
                                />
                            </div>

                            <div className="form-group">
                                <label>Date</label>
                                <input
                                    className="form-input"
                                    type="date"
                                    value={formData.requestDate}
                                    onChange={(e) =>
                                        setFormData({ ...formData, requestDate: e.target.value })
                                    }
                                />
                            </div>

                            <div className="form-group">
                                <label>Requested By</label>
                                <input
                                    className="form-input"
                                    type="text"
                                    placeholder="e.g. John D. Joe"
                                    value={formData.requestedByName}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            requestedByName: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            <div className="form-group">
                                <label>Authorization</label>
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

                        {/* Request Details */}
                        <div className="form-section">
                            <div className="section-title">
                                <PlusCircleIcon />
                                <span>Request Details</span>
                            </div>

                            <div className="form-group">
                                <label>May I/We request for:</label>
                                <MultiSelectDropdown
                                    options={metadata.docTypes}
                                    selectedIds={formData.documentTypeIds}
                                    onChange={(ids) =>
                                        setFormData({ ...formData, documentTypeIds: ids })
                                    }
                                    placeholder="Select Document Type..."
                                />
                            </div>

                            <div className="form-group">
                                <label>Reason/Purpose</label>
                                <SingleSelectDropdown
                                    options={metadata.purposes}
                                    value={formData.purposeId}
                                    onChange={(val) =>
                                        setFormData({ ...formData, purposeId: val })
                                    }
                                    placeholder="Select Reason/Purpose..."
                                />
                            </div>
                        </div>

                        {/* Action Taken */}
                        <div className="form-section">
                            <div className="section-title">
                                <ClipboardIcon />
                                <span>Action Taken</span>
                            </div>

                            <div className="form-group">
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

                            <div className="return-archive-box">
                                <div className="return-archive-label">
                                    Document has been returned to archived:
                                </div>
                                <div className="form-group">
                                    <label>Name of Releasing Staff</label>
                                    <SingleSelectDropdown
                                        options={metadata.staff}
                                        value={formData.releasingStaffId}
                                        onChange={(val) =>
                                            setFormData({ ...formData, releasingStaffId: val })
                                        }
                                        placeholder="Name of Releasing Staff"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Date</label>
                                    <input
                                        className="form-input"
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

                            {/* NOTE: hardcoded per mockup — swap for a settings-driven
                                approver name once you confirm where that should come from */}
                            <div className="signature-block">
                                <div className="signature-name">ENGR. VICENTE P. DESOY, REA</div>
                                <div className="signature-title">PROVINCIAL ASSESSOR</div>
                            </div>
                        </div>
                    </div>

                    <div className="form-footer">
                        <button className="btn-back" onClick={onCancel}>
                            Back to Dashboard
                        </button>
                        <button
                            className="btn-print"
                            type="button"
                            onClick={() => window.print()}
                        >
                            Print Form
                        </button>
                        <button
                            className="btn-submit"
                            onClick={handleSave}
                            disabled={submitting || !!savedEntry}
                        >
                            {submitting ? 'Saving...' : savedEntry ? '✓ Saved' : 'Save Request'}
                        </button>
                        {savedEntry && (
                            <button
                                className="btn-submit"
                                type="button"
                                style={{ background: 'linear-gradient(135deg, #059669, #10b981)', marginLeft: 0 }}
                                onClick={handleProceed}
                            >
                                Proceed to Processing →
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}