import { useState, useEffect, useRef } from 'react';
import { requestService, type RequestFormData } from '../services/requestService';
import type { User } from '../../auth-folder/types/auth';
import type { CompletedEntryData } from '../types/taxDeclaration';
import '../styles/RequestFormEntry.css';
import { CheckIcon, SaveIcon, LightbulbIcon } from '../components/icons';

interface ExtendedRequestFormData extends RequestFormData {
    id?: string;
    propertyLocation: string;
    releasingStaffId: string;
    releaseDate: string;
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
function MultiSelectDropdown({ options, selectedIds, onChange, placeholder }: { options: { id: string; name: string }[]; selectedIds: string[]; onChange: (ids: string[]) => void; placeholder: string; }) {
    const [open, setOpen] = useState(false); const ref = useRef<HTMLDivElement>(null);
    useEffect(() => { const handleClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener('mousedown', handleClick); return () => document.removeEventListener('mousedown', handleClick); }, []);
    const toggleOption = (id: string) => { if (selectedIds.includes(id)) onChange(selectedIds.filter((i) => i !== id)); else onChange([...selectedIds, id]); };
    const label = selectedIds.length === 0 ? placeholder : options.filter((o) => selectedIds.includes(o.id)).map((o) => o.name).join(', ');
    return (
        <div className="custom-select" ref={ref}>
            <button type="button" className="custom-select-trigger" onClick={() => setOpen((o) => !o)}><span className={selectedIds.length === 0 ? 'placeholder-text' : ''}>{label}</span><span className={`chevron ${open ? 'chevron-up' : ''}`}>▾</span></button>
            {open && (<div className="custom-select-menu">{options.length === 0 && <div className="custom-select-empty">No options available</div>}{options.map((opt) => (<label key={opt.id} className="custom-select-option"><input type="checkbox" checked={selectedIds.includes(opt.id)} onChange={() => toggleOption(opt.id)} />{opt.name}</label>))}</div>)}
        </div>
    );
}
function SingleSelectDropdown({ options, value, onChange, placeholder }: { options: { id: string; name: string }[]; value: string; onChange: (id: string) => void; placeholder: string; }) {
    return (<div className="custom-select"><select className="native-select" value={value} onChange={(e) => onChange(e.target.value)}><option value="" disabled>{placeholder}</option>{options.map((opt) => (<option key={opt.id} value={opt.id}>{opt.name}</option>))}</select></div>);
}
function SearchableSelectDropdown({ options, value, onChange, placeholder }: { options: { id: string; name: string }[]; value: string; onChange: (id: string) => void; placeholder: string; }) {
    const [open, setOpen] = useState(false); const [query, setQuery] = useState(''); const ref = useRef<HTMLDivElement>(null); const selected = options.find((o) => o.id === value);
    useEffect(() => { setQuery(selected ? selected.name : ''); }, [value]);
    useEffect(() => { const handleClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery(selected ? selected.name : ''); } }; document.addEventListener('mousedown', handleClick); return () => document.removeEventListener('mousedown', handleClick); }, [selected]);
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
const PlusCircleIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></svg>);
const ClipboardIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3a1 1 0 011-1h4a1 1 0 011 1v1M9 10h6M9 14h6M9 18h3" /></svg>);
const ClipboardIconLarge = () => (<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3a1 1 0 011-1h4a1 1 0 011 1v1M9 10h6M9 14h6M9 18h3" /></svg>);

// --- CONSTANTS ---
const DOCUMENT_TYPE_ID_VIEW_MAP: Record<string, string> = {
    'ctc-latest-tax-dec': 'tax-declaration',
    'ctc-old-tax-dec': 'tax-declaration',
    'cert-property': 'certificate-land-holding',
    'cert-no-property': 'certificate-no-landholding',
};

const DOCUMENT_TYPE_VIEW_MAP: Record<string, string> = {
    'Certified True Copy of the Latest Tax Declaration': 'tax-declaration',
    'Certified True Copy of Old Tax Declaration': 'tax-declaration',
    'Certificate of Property/Landholding': 'certificate-land-holding',
    'Certificate of No Property/Landholding': 'certificate-no-landholding',
    'Certificate of Landholding': 'certificate-land-holding',
    'Certificate of No Landholding': 'certificate-no-landholding',
};

const VIEW_PREFIX_MAP: Record<string, string> = {
    'tax-declaration': 'TD',
    'certificate-land-holding': 'LH',
    'certificate-no-landholding': 'NLH',
};

const PURPOSE_OPTIONS = [
    { id: 'settling-tax-obligation', name: 'For Settling of Tax Obligation', code: 'TAX_OBLIGATION' },
    { id: 'court-legal-purposes', name: 'For Court and other legal purposes', code: 'COURT_LEGAL' },
    { id: 'others', name: 'Others', code: 'OTHERS' },
];

function isOthersPurpose(purposeId: string, purposes: any[]): boolean {
    const p = purposes.find((p) => p.id === purposeId);
    if (!p) return false;
    return p.code === 'OTHERS' || (p.name || '').trim().toLowerCase() === 'others';
}

// ----------------------------------------------

export function RequestFormEntry({ user, onCancel, onEntryComplete, onNavigateToProcessing, prefilledRequestData }: RequestFormEntryProps) {
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [isProceeding, setIsProceeding] = useState(false);
    const [metadata, setMetadata] = useState<{ docTypes: any[]; purposes: any[]; staff: any[]; propertyLocations: { id: string; name: string }[]; }>({ docTypes: [], purposes: PURPOSE_OPTIONS, staff: [], propertyLocations: [], });
    const [validationError, setValidationError] = useState<string>('');

    const [formData, setFormData] = useState<ExtendedRequestFormData>({
        declarantName: '', requestedByName: '', requestDate: new Date().toISOString().split('T')[0], purposeId: '', documentTypeIds: [], authRequired: false, actionTaken: 'PENDING', propertyLocation: '', releasingStaffId: '', releaseDate: '', purposeOtherText: '', referenceNumber: `REF-${new Date().getFullYear()}-0000`,
    });

    // Determine if "Certificate of No Landholding" (NLH) is currently selected
    const isNoLandholdingSelected = formData.documentTypeIds.some((id) => {
        const selectedDoc = metadata.docTypes.find((d) => d.id === id);
        const view = selectedDoc
            ? (DOCUMENT_TYPE_ID_VIEW_MAP[selectedDoc.id] || DOCUMENT_TYPE_VIEW_MAP[selectedDoc.name])
            : undefined;
        return view === 'certificate-no-landholding';
    });

    // Cleanup logic: If NLH is selected, reset propertyLocation to prevent sending redundant values
    useEffect(() => {
        if (isNoLandholdingSelected && formData.propertyLocation !== '') {
            setFormData((prev) => ({ ...prev, propertyLocation: '' }));
        }
    }, [isNoLandholdingSelected, formData.propertyLocation]);

    // Prefill Logic
    useEffect(() => {
        if (prefilledRequestData) {
            setFormData((prev) => ({
                ...prev,
                ...prefilledRequestData,
                id: prefilledRequestData.id || prefilledRequestData.requestId || undefined,
                referenceNumber: prefilledRequestData.referenceNumber || prefilledRequestData.control_number || `REF-${new Date().getFullYear()}-0000`,
                declarantName: prefilledRequestData.declarantName || prefilledRequestData.declarant_name || '',
                requestedByName: prefilledRequestData.requestedByName || prefilledRequestData.requested_by_name || '',
                requestDate: prefilledRequestData.requestDate || prefilledRequestData.request_date || new Date().toISOString().split('T')[0],
                authRequired: prefilledRequestData.authRequired !== undefined ? prefilledRequestData.authRequired : (prefilledRequestData.authorization_required || false),
                purposeId: prefilledRequestData.purposeId || prefilledRequestData.purpose_id || '',
                actionTaken: prefilledRequestData.actionTaken || prefilledRequestData.action_taken || 'PENDING',
                propertyLocation: prefilledRequestData.propertyLocation || prefilledRequestData.property_location || '',
                documentTypeIds: prefilledRequestData.documentTypeIds || [],
            }));
        }
    }, [prefilledRequestData]);

    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    // Fetch Metadata
    useEffect(() => {
        let isMounted = true;
        const fetchMeta = async () => {
            try {
                const data = await requestService.getMetadata();
                if (isMounted && data) {
                    const municipalityMap: Record<string, string> = {};
                    (data.municipalities ?? []).forEach((m: any) => { municipalityMap[m.id] = m.name; });
                    const propertyLocations = (data.barangays ?? []).map((b: any) => ({ id: b.id, name: `${b.name}, ${municipalityMap[b.municipality_id] ?? ''}`.replace(/,\s*$/, ''), }));
                    setMetadata({
                        docTypes: Array.isArray(data.docTypes) && data.docTypes.length > 0 ? data.docTypes : [],
                        purposes: PURPOSE_OPTIONS, staff: Array.isArray((data as any).staff) ? (data as any).staff : [], propertyLocations,
                    });
                }
            } catch (err) { console.error('Metadata fetch failed', err); }
        };
        fetchMeta(); return () => { isMounted = false; };
    }, []);

    // Reference Number Logic
    useEffect(() => {
        if (formData.id) return;
        if (formData.documentTypeIds.length === 0) { setFormData((prev) => ({ ...prev, referenceNumber: `REF-${new Date().getFullYear()}-XXXX`, })); return; }
        const selectedId = formData.documentTypeIds[0];
        const selectedDoc = metadata.docTypes.find((d) => d.id === selectedId);

        const view = selectedDoc
            ? (DOCUMENT_TYPE_ID_VIEW_MAP[selectedDoc.id] || DOCUMENT_TYPE_VIEW_MAP[selectedDoc.name])
            : undefined;

        const prefix = (view && VIEW_PREFIX_MAP[view]) || 'REF';
        setFormData((prev) => ({ ...prev, referenceNumber: `${prefix}-${new Date().getFullYear()}-XXXX`, }));
    }, [formData.documentTypeIds, formData.id, metadata.docTypes]);

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
            const requestPayload = { ...formData, status: 'IN_PROGRESS' };

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
            const draftPayload = { ...formData, status: 'DRAFT' };
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
                releasingStaffId: '',
                releaseDate: '',
                purposeOtherText: '',
                referenceNumber: `REF-${new Date().getFullYear()}-0000`,
            });
            setValidationError('');
        }
    };

    return (
        <div className="rfe-page">
            <div className="rfe-page-inner">
                <div className="rfe-card">
                    <div className="rfe-card-header">
                        <div className="rfe-card-header-left">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span className="rfe-header-icon"><ClipboardIconLarge /></span>
                                <div><h2 className="rfe-card-title">REQUEST FORM ENTRY</h2><div className="rfe-card-subtitle">Property Record and Document Request · {today}</div></div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <span className="rfe-ref-chip">{formData.referenceNumber}</span>
                            <button className="btn-reset-form" onClick={handleResetForm} title="Start fresh for a new client">↻ New Client</button>
                        </div>
                    </div>

                    <div className="rfe-form-body">
                        {/* Section 1 */}
                        <div className="rfe-section">
                            <div className="rfe-section-title"><PersonIcon /><span>Declarant Details</span></div>
                            <div className="rfe-field">
                                <label className="rfe-label">Name of Declarant</label>
                                <div className="input-with-clear">
                                    <input className="rfe-input" type="text" placeholder="e.g. Juan D. Cruz" value={formData.declarantName} onChange={(e) => setFormData({ ...formData, declarantName: e.target.value })} />
                                    {formData.declarantName && (<button type="button" className="input-clear-btn" onClick={() => setFormData({ ...formData, declarantName: '' })} title="Clear Name">×</button>)}
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

                        {/* Section 2 */}
                        <div className="rfe-section">
                            <div className="rfe-section-title"><PlusCircleIcon /><span>Request Details</span></div>
                            <div className="rfe-field"><label className="rfe-label">May I/We request for:</label><MultiSelectDropdown options={metadata.docTypes} selectedIds={formData.documentTypeIds} onChange={(ids) => setFormData({ ...formData, documentTypeIds: ids })} placeholder="Select Document Type(s)..." /></div>
                            <div className="rfe-field" style={{ marginTop: 14 }}><label className="rfe-label">Reason / Purpose</label>{isOthersPurpose(formData.purposeId, metadata.purposes) ? (<div className="input-with-clear"><input className="rfe-input" type="text" autoFocus placeholder="Type purpose here..." value={formData.purposeOtherText} onChange={(e) => setFormData({ ...formData, purposeOtherText: e.target.value })} /><button type="button" className="input-clear-btn" title="Choose a different reason" onClick={() => setFormData({ ...formData, purposeId: '', purposeOtherText: '' })}>×</button></div>) : (<SingleSelectDropdown options={metadata.purposes} value={formData.purposeId} onChange={(val) => setFormData({ ...formData, purposeId: val, purposeOtherText: '' })} placeholder="Select Reason / Purpose..." />)}</div>
                        </div>

                        {/* Section 3 */}
                        <div className="rfe-section">
                            <div className="rfe-section-title"><ClipboardIcon /><span>Action Taken</span></div>
                            <div className="rfe-field"><ToggleButtonPair leftLabel="APPROVED" rightLabel="DISAPPROVED" value={formData.actionTaken === 'APPROVED' ? true : formData.actionTaken === 'DISAPPROVED' ? false : null} onChange={(val) => setFormData({ ...formData, actionTaken: val ? 'APPROVED' : 'DISAPPROVED', })} /></div>
                            <div className="rfe-return-archive-box">
                                <div className="rfe-return-archive-label">Document has been returned to archived:</div>
                                <div className="rfe-field"><label className="rfe-label">Name of Releasing Staff</label><SingleSelectDropdown options={metadata.staff} value={formData.releasingStaffId} onChange={(val) => setFormData({ ...formData, releasingStaffId: val })} placeholder="Name of Releasing Staff" /></div>
                                <div className="rfe-field" style={{ marginTop: 14 }}><label className="rfe-label">Date</label><input className="rfe-input" type="date" value={formData.releaseDate} onChange={(e) => setFormData({ ...formData, releaseDate: e.target.value, })} /></div>
                            </div>
                            <div className="rfe-signature-block"><div className="rfe-signature-name">ENGR. VICENTE P. DESOY, REA</div><div className="rfe-signature-title">PROVINCIAL ASSESSOR</div></div>
                        </div>
                    </div>

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
                        <button
                            type="button"
                            className="btn-submit"
                            onClick={handleSaveDraft}
                            disabled={isSavingDraft || isProceeding}
                        >
                            {isSavingDraft ? 'Saving Draft…' : <><SaveIcon size={14} /> Save Draft</>}
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
    );
}