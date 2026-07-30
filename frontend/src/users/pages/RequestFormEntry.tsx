import { useState, useEffect, useRef } from 'react';
import { requestService, type RequestFormData } from '../services/requestService';
import type { User } from '../../auth-folder/types/auth';
import type { CompletedEntryData } from '../types/taxDeclaration';
import { ForwardToStaffModal } from '../components/ForwardToStaffModal';
import '../styles/RequestFormEntry.css';
import { CheckIcon, SaveIcon, LightbulbIcon } from '../components/icons';
import { addAdminAuditEntry } from '../../admin/services/auditLogService';
import { TransactionProgressBar } from '../components/TransactionProgressPanel';

interface ExtendedRequestFormData extends RequestFormData {
    id?: string;
    propertyLocation: string;
    referenceNumber: string;
    purposeOtherText: string;
}

interface RequestFormEntryProps {
    user: User;
    onCancel: () => void;
    onEntryComplete: (data: CompletedEntryData) => void;
    onNavigateToProcessing: (view: string) => void;
    prefilledRequestData?: any | null;
}

// --- UI HELPERS ---
function ToggleButtonPair({ leftLabel, rightLabel, value, onChange }: { leftLabel: string; rightLabel: string; value: boolean | null; onChange: (val: boolean) => void; }) {
    return (
        <div className="toggle-pair">
            <button type="button" className={`toggle-btn ${value === true ? 'toggle-btn-active' : ''}`} onClick={() => onChange(true)}><span className="toggle-checkbox">{value === true && <CheckIcon size={13} />}</span>{leftLabel}</button>
            <button type="button" className={`toggle-btn ${value === false ? 'toggle-btn-active' : ''}`} onClick={() => onChange(false)}><span className="toggle-checkbox">{value === false && <CheckIcon size={13} />}</span>{rightLabel}</button>
        </div>
    );
}

function SingleSelectDropdown({ options, selectedId, onChange, placeholder, disabled }: {
    options: { id: string; name: string }[];
    selectedId: string;
    onChange: (id: string) => void;
    placeholder: string;
    disabled?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);
    const selected = options.find((o) => o.id === selectedId);
    return (
        <div className="custom-select" ref={ref}>
            <button
                type="button"
                className="custom-select-trigger"
                onClick={() => !disabled && setOpen((o) => !o)}
                disabled={disabled}
                style={disabled ? { background: '#f3f4f6', color: '#6b7280', cursor: 'not-allowed' } : undefined}
            >
                <span className={!selected ? 'placeholder-text' : ''}>{selected ? selected.name : placeholder}</span>
                {!disabled && <span className={`chevron ${open ? 'chevron-up' : ''}`}>▾</span>}
            </button>
            {open && !disabled && (
                <div className="custom-select-menu">
                    {options.length === 0 && <div className="custom-select-empty">No options available</div>}
                    {options.map((opt) => (
                        <div key={opt.id} className="custom-select-option" onClick={() => { onChange(opt.id); setOpen(false); }}>
                            {opt.name}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function SearchableSelectDropdown({ options, value, onChange, placeholder }: { options: { id: string; name: string }[]; value: string; onChange: (id: string) => void; placeholder: string; }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const ref = useRef<HTMLDivElement>(null);
    const selected = options.find((o) => o.id === value);

    useEffect(() => {
        setQuery(selected ? selected.name : '');
    }, [value, options]);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
                setQuery(selected ? selected.name : '');
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [selected]);

    const filtered = query.trim() === '' ? options : options.filter((o) => o.name.toLowerCase().includes(query.trim().toLowerCase()));
    const handleSelect = (opt: { id: string; name: string }) => { onChange(opt.id); setQuery(opt.name); setOpen(false); };
    return (
        <div className="custom-select" ref={ref}>
            <input className="rfe-input" type="text" placeholder={placeholder} value={query} onChange={(e) => { setQuery(e.target.value); setOpen(true); if (selected && e.target.value !== selected.name) onChange(''); }} onFocus={() => setOpen(true)} />
            {open && (<div className="custom-select-menu">{filtered.length === 0 && <div className="custom-select-empty">No matches found</div>}{filtered.map((opt) => (<div key={opt.id} className="custom-select-option" onClick={() => handleSelect(opt)}>{opt.name}</div>))}</div>)}
        </div>
    );
}

const PersonIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" /></svg>);
const ClipboardIconLarge = () => (<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3a1 1 0 011-1h4a1 1 0 011 1v1M9 10h6M9 14h6M9 18h3" /></svg>);

// --- CONSTANTS ---
const DOCUMENT_TYPE_ID_VIEW_MAP: Record<string, string> = {
    'ctc-latest-tax-dec': 'tax-declaration',
    'cert-property': 'certificate-land-holding',
    'cert-no-property': 'certificate-no-landholding',
};

const DOCUMENT_TYPE_VIEW_MAP: Record<string, string> = {
    'Tax Declaration': 'tax-declaration',
    'Certificate of Property/Landholding': 'certificate-land-holding',
    'Certificate of No Property/Landholding': 'certificate-no-landholding',
    'Certificate of Landholding': 'certificate-land-holding',
    'Certificate of No Landholding': 'certificate-no-landholding',
};

const PURPOSE_OPTIONS = [
    { id: 'settling-tax-obligation', name: 'For Settling of Tax Obligation', code: 'TAX_OBLIGATION' },
    { id: 'court-legal-purposes', name: 'For Court and other legal purposes', code: 'COURT_LEGAL' },
    { id: 'others', name: 'Others', code: 'OTHERS' },
];

// ----------------------------------------------

export function RequestFormEntry({ user, onCancel, onEntryComplete, onNavigateToProcessing, prefilledRequestData }: RequestFormEntryProps) {
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [isProceeding, setIsProceeding] = useState(false);
    const [metadata, setMetadata] = useState<{ docTypes: any[]; purposes: any[]; staff: any[]; propertyLocations: { id: string; name: string }[]; }>({ docTypes: [], purposes: PURPOSE_OPTIONS, staff: [], propertyLocations: [], });
    const [validationError, setValidationError] = useState<string>('');
    const [showForwardModal, setShowForwardModal] = useState(false);
    const [metadataLoading, setMetadataLoading] = useState(true);
    const [metadataError, setMetadataError] = useState('');
    const [docTypeLocked, setDocTypeLocked] = useState(false);

    const [formData, setFormData] = useState<ExtendedRequestFormData>({
        declarantName: '', requestedByName: '', requestDate: new Date().toISOString().split('T')[0], purposeId: '', documentTypeIds: [], authRequired: false, actionTaken: 'PENDING', propertyLocation: '', purposeOtherText: '', referenceNumber: `REF-${new Date().getFullYear()}-0000`,
    });

    const displayReferenceNumber = (() => {
        const year = new Date().getFullYear();
        if (formData.documentTypeIds.length === 0) {
            return `REF-${year}-XXXX`;
        }
        const selectedDoc = metadata.docTypes.find((d) => d.id === formData.documentTypeIds[0]);
        const prefix = selectedDoc?.prefix || 'REF';
        return `${prefix}-${year}-XXXX`;
    })();

    const isNoLandholdingSelected = formData.documentTypeIds.some((id) => {
        const selectedDoc = metadata.docTypes.find((d) => d.id === id);
        const view = selectedDoc
            ? (DOCUMENT_TYPE_ID_VIEW_MAP[selectedDoc.id] || DOCUMENT_TYPE_VIEW_MAP[selectedDoc.name])
            : undefined;
        return view === 'certificate-no-landholding';
    });

    useEffect(() => {
        if (isNoLandholdingSelected && formData.propertyLocation !== '') {
            setFormData((prev) => ({ ...prev, propertyLocation: '' }));
        }
    }, [isNoLandholdingSelected, formData.propertyLocation]);

    useEffect(() => {
        if (prefilledRequestData) {
            setFormData((prev) => ({
                ...prev,
                id: prefilledRequestData.id || prefilledRequestData.requestId,
                referenceNumber:
                    prefilledRequestData.reference_number ||
                    prefilledRequestData.control_number ||
                    prefilledRequestData.referenceNumber,
                declarantName:
                    prefilledRequestData.declarant_name ||
                    prefilledRequestData.declarantName ||
                    '',
                requestedByName:
                    prefilledRequestData.requested_by_name ||
                    prefilledRequestData.requestedByName ||
                    '',
                requestDate:
                    prefilledRequestData.request_date ||
                    prefilledRequestData.requestDate ||
                    new Date().toISOString().split('T')[0],
                propertyLocation:
                    prefilledRequestData.property_location ||
                    prefilledRequestData.propertyLocation ||
                    '',
                documentTypeIds:
                    prefilledRequestData.documentTypeIds || [],
                authRequired:
                    prefilledRequestData.authorization_required ??
                    prefilledRequestData.authRequired ??
                    false,
                actionTaken:
                    prefilledRequestData.action_taken ||
                    prefilledRequestData.actionTaken ||
                    'PENDING',
            }));

            // Lock/unlock document type based on prefilled data
            setDocTypeLocked(!!prefilledRequestData.lockedDocType);
        }
    }, [prefilledRequestData]);

    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    const fetchMeta = async () => {
        setMetadataLoading(true);
        setMetadataError('');
        try {
            const data = await requestService.getMetadata();
            if (data) {
                const municipalityMap: Record<string, string> = {};
                (data.municipalities ?? []).forEach((m: any) => { municipalityMap[m.id] = m.name; });
                const propertyLocations = (data.barangays ?? []).map((b: any) => ({
                    id: b.id,
                    name: `${b.name}, ${municipalityMap[b.municipality_id] ?? ''}`.replace(/,\s*$/, ''),
                }));
                setMetadata({
                    docTypes: Array.isArray(data.docTypes) ? data.docTypes : [],
                    purposes: PURPOSE_OPTIONS,
                    staff: Array.isArray((data as any).staff) ? (data as any).staff : [],
                    propertyLocations,
                });
            }
        } catch (err: any) {
            console.error('Metadata fetch failed', err);
            setMetadataError('Failed to load document types. Please retry.');
        } finally {
            setMetadataLoading(false);
        }
    };

    useEffect(() => {
        fetchMeta();
    }, []);

    useEffect(() => {
        if (formData.id) return;

        if (formData.documentTypeIds.length === 0) {
            if (!formData.referenceNumber || formData.referenceNumber.endsWith('-0000')) {
                setFormData(prev => ({ ...prev, referenceNumber: `REF-${new Date().getFullYear()}-XXXX` }));
            }
            return;
        }

        const selectedId = formData.documentTypeIds[0];
        const selectedDoc = metadata.docTypes.find((d) => d.id === selectedId);
        const newPrefix = selectedDoc?.prefix || 'REF';
        const currentYear = new Date().getFullYear();

        if (formData.referenceNumber.includes('XXXX') || formData.referenceNumber.includes('-0000')) {
            const newRef = `${newPrefix}-${currentYear}-XXXX`;
            if (formData.referenceNumber !== newRef) {
                setFormData(prev => ({ ...prev, referenceNumber: newRef }));
            }
        }
    }, [formData.documentTypeIds, formData.id, metadata.docTypes]);

    const handleOpenForwardModal = () => {
        if (!formData.declarantName && !formData.requestedByName) {
            setValidationError('Please enter at least the Requester or Declarant name before forwarding.');
            return;
        }
        setValidationError('');
        setShowForwardModal(true);
    };

    const handleConfirmForward = async (staffId: string, note: string) => {
        let requestId = formData.id;

        try {
            if (!requestId) {
                const draftPayload = { ...formData, status: 'DRAFT', staffAuthId: user.id, encodedBy: user.staffId };
                const res = await requestService.submitRequest(draftPayload, user.id);
                const savedRequest = res.data || res;
                requestId = savedRequest.id;
                setFormData((prev) => ({
                    ...prev,
                    id: requestId,
                    referenceNumber: savedRequest.reference_number || savedRequest.control_number || prev.referenceNumber,
                }));
            } else {
                await requestService.updateRequest(requestId, { ...formData, status: 'DRAFT' });
            }
        } catch (err) {
            console.error('Failed to save request before forwarding', err);
            alert('Failed to save the request. Please try again.');
            return;
        }

        if (!requestId) {
            alert('Failed to save the request before forwarding. Please try again.');
            return;
        }

        try {
            await requestService.forwardRequest(requestId, staffId, note);
            setShowForwardModal(false);
            onCancel();
        } catch (err) {
            console.error('Failed to forward request', err);
            alert('Failed to forward the request. Please try again.');
        }
    };

    const handleProceedToDocument = async () => {
        if (!formData.declarantName || !formData.requestedByName || formData.documentTypeIds.length === 0) {
            setValidationError('Please fill out Declarant, Requester, and select at least one Document Type.');
            return;
        }
        setValidationError('');

        const selectedId = formData.documentTypeIds[0];
        const selectedDoc = metadata.docTypes.find((d) => d.id === selectedId);

        const view = selectedDoc
            ? (DOCUMENT_TYPE_ID_VIEW_MAP[selectedDoc.id] || DOCUMENT_TYPE_VIEW_MAP[selectedDoc.name])
            : undefined;

        if (!view) {
            alert(`No document page is configured for "${selectedDoc?.name || 'this document type'}". Please contact administrator.`);
            return;
        }

        setIsProceeding(true);
        try {
            let savedRequest;
            const requestPayload = { ...formData, status: 'IN_PROGRESS', staffAuthId: user.id, encodedBy: user.staffId };

            if (formData.id) {
                const res = await requestService.updateRequest(formData.id, requestPayload);
                savedRequest = res.data || res;
            } else {
                const res = await requestService.submitRequest(requestPayload, user.id);
                savedRequest = res.data || res;
            }

            const actualId = savedRequest?.id || formData.id;
            const actualRef = savedRequest?.reference_number || savedRequest?.control_number || formData.referenceNumber;

            const completedData: CompletedEntryData = {
                ...formData,
                requestId: actualId,
                referenceNumber: actualRef,
            };

            onEntryComplete(completedData);

            addAdminAuditEntry({
                type: 'document_pending',
                description: `Pending document request submitted — Ref# ${actualRef || actualId || 'N/A'}`,
            }).catch(() => {});

            setTimeout(() => {
                onNavigateToProcessing(view);
            }, 100);

        } catch (err: any) {
            console.error("Redirection process failed:", err);
            alert(err.response?.data?.error || 'Failed to save request. Redirection cancelled.');
        } finally {
            setIsProceeding(false);
        }
    };

    const handleSaveDraft = async () => {
        if (!formData.declarantName && !formData.requestedByName) return alert('Please enter at least the Requester or Declarant name to save a draft.');
        setIsSavingDraft(true);
        try {
            const draftPayload = { ...formData, status: 'DRAFT', staffAuthId: user.id, encodedBy: user.staffId };
            if (formData.id) {
                await requestService.updateRequest(formData.id, draftPayload);
            } else {
                const res = await requestService.submitRequest(draftPayload, user.id);
                const savedRequest = res.data || res;
                if (savedRequest?.id) {
                    setFormData(prev => ({
                        ...prev,
                        id: savedRequest.id,
                        referenceNumber: savedRequest.control_number || savedRequest.reference_number || prev.referenceNumber
                    }));
                }
            }
            onCancel();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Save failed');
        } finally {
            setIsSavingDraft(false);
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
                purposeOtherText: '',
                referenceNumber: `REF-${new Date().getFullYear()}-0000`,
            });
            setValidationError('');
            setDocTypeLocked(false);
        }
    };

    return (
        <div className="rfe-page">
            <div className="rfe-page-inner">
                <div className="rfe-card">
                    {/* ── Persistent session progress bar (only visible once ≥1 doc is saved) ── */}
                    <TransactionProgressBar />

                    <div className="rfe-card-header">
                        <div className="rfe-card-header-left">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span className="rfe-header-icon"><ClipboardIconLarge /></span>
                                <div><h2 className="rfe-card-title">REQUEST FORM ENTRY</h2><div className="rfe-card-subtitle">Property Record and Document Request · {today}</div></div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <span className="rfe-ref-chip">{displayReferenceNumber}</span>
                            <button className="btn-reset-form" onClick={handleResetForm} title="Start fresh for a new client">↻ New Client</button>
                        </div>
                    </div>

                    <ForwardToStaffModal
                        open={showForwardModal}
                        staffOptions={metadata.staff}
                        currentStaffId={user.staffId}
                        referenceNumber={formData.referenceNumber}
                        onClose={() => setShowForwardModal(false)}
                        onConfirm={handleConfirmForward}
                    />

                    <div className="rfe-form-body">
                        {/* Section 1 */}
                        <div className="rfe-section">
                            <div className="rfe-section-title"><PersonIcon /><span>Declarant Details</span></div>
                            <div className="rfe-field">
                                <label className="rfe-label">Name of Declarant</label>
                                <div className="input-with-clear">
                                    <input id="declarantName" name="declarantName" className="rfe-input" type="text" placeholder="e.g. Juan D. Cruz" value={formData.declarantName} onChange={(e) => setFormData({ ...formData, declarantName: e.target.value })} />
                                    {formData.declarantName && (<button type="button" className="input-clear-btn" onClick={() => setFormData({ ...formData, declarantName: '' })} title="Clear Name">×</button>)}
                                </div>
                                <div className="rfe-field" style={{ marginTop: 14 }}>
                                    <label className="rfe-label">May I/We request for:</label>
                                    {metadataError ? (
                                        <div className="warning-banner" style={{ margin: '4px 0' }}>
                                            {metadataError}{' '}
                                            <button type="button" onClick={fetchMeta} style={{ textDecoration: 'underline', fontWeight: 700 }}>
                                                Retry
                                            </button>
                                        </div>
                                    ) : (
                                        <SingleSelectDropdown
                                            options={metadata.docTypes}
                                            selectedId={formData.documentTypeIds[0] || ''}
                                            onChange={(id) => setFormData({ ...formData, documentTypeIds: [id] })}
                                            placeholder={metadataLoading ? 'Loading document types…' : 'Select Document Type...'}
                                            disabled={docTypeLocked}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Hide "Location of the Property" if Certificate of No Landholding (NLH) is chosen */}
                            {!isNoLandholdingSelected && (
                                <div className="rfe-field" style={{ marginTop: 14 }}>
                                    <label className="rfe-label">Location of the Property</label>
                                    <SearchableSelectDropdown options={metadata.propertyLocations} value={formData.propertyLocation} onChange={(val) => setFormData({ ...formData, propertyLocation: val })} placeholder="Brgy., Municipality, Province" />
                                </div>
                            )}

                            <div className="rfe-field" style={{ marginTop: 14 }}><label className="rfe-label">Date of Request</label><input className="rfe-input" type="date" value={formData.requestDate} onChange={(e) => setFormData({ ...formData, requestDate: e.target.value })} /></div>
                            <div className="rfe-field" style={{ marginTop: 14 }}><label className="rfe-label">Requested By</label><input className="rfe-input" type="text" placeholder="e.g. Juan D. Cruz" value={formData.requestedByName} onChange={(e) => setFormData({ ...formData, requestedByName: e.target.value, })} /></div>
                            <div className="rfe-field" style={{ marginTop: 14 }}><label className="rfe-label">Authorization</label><ToggleButtonPair leftLabel="Authorization Needed" rightLabel="Authorization Not Needed" value={formData.authRequired} onChange={(val) => setFormData({ ...formData, authRequired: val })} /></div>
                        </div>

                        {/* Section 3 */}
                        <div className="rfe-section">
                            <div className="rfe-return-archive-box">
                                <label className="rfe-label" htmlFor="releasing-staff-select">Encoded By: </label>
                                {/* Automatically displays the logged-in user's name in a read-only format */}
                                <input
                                    id="releasing-staff-select"
                                    className="rfe-input"
                                    type="text"
                                    value={`${user.firstName} ${user.lastName}`}
                                    disabled
                                    style={{ backgroundColor: '#f3f4f6', color: '#6b7280', cursor: 'not-allowed', fontWeight: 500 }}
                                />
                            </div>
                        </div>
                    </div> {/* <--- THIS IS THE DIV THAT WAS MISSING! */}

                    {/* SESSION BANNER */}
                    <div className="form-reuse-notice">
                        <div className="form-reuse-notice-icon"><LightbulbIcon size={20} /></div>
                        <div className="form-reuse-notice-text">
                            <strong>Active Session (Requested by: {formData.requestedByName || 'Client'}):</strong> Common details are saved to speed up typing.
                            You can add multiple documents for <strong>different declarants</strong> under this same transaction by clicking <strong>"Save & Add Another"</strong> or <strong>"Add Another Document"</strong> on the next screens.
                        </div>
                    </div>

                    {validationError && (<div className="warning-banner" role="alert">{validationError}</div>)}

                    <div className="rfe-footer">
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button
                                type="button"
                                className="btn-submit"
                                onClick={handleSaveDraft}
                                disabled={isSavingDraft || isProceeding}
                            >
                                {isSavingDraft ? 'Saving Draft…' : <><SaveIcon size={14} /> Save Draft</>}
                            </button>
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button className="btn-forward" type="button" onClick={handleOpenForwardModal} disabled={isSavingDraft || isProceeding}>
                                📨 Forward to Staff
                            </button>
                            <button
                                type="button"
                                className="btn-proceed"
                                onClick={handleProceedToDocument}
                                disabled={isSavingDraft || isProceeding}
                            >
                                {isProceeding ? 'Processing…' : 'Proceed to Document →'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}