import { useState, useEffect, useRef } from 'react';
import { requestService, type RequestFormData } from '../services/requestService';
import type { User } from '../../auth-folder/types/auth';
import type { CompletedEntryData } from '../types/taxDeclaration';
import '../styles/RequestFormEntry.css';

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

// Map for Navigation
const DOCUMENT_TYPE_ID_VIEW_MAP: Record<string, string> = {
    'dt1': 'tax-declaration',
    'dt2': 'tax-declaration',
    'dt3': 'certificate-land-holding',
    'dt4': 'certificate-no-landholding',
};

export function RequestFormEntry({
    user,
    onCancel,
    onEntryComplete,
    onNavigateToProcessing,
    prefilledRequestData,
}: RequestFormEntryProps) {
    const [submitting, setSubmitting] = useState(false);
    const [validationError, setValidationError] = useState<string>('');
    const [hasSavedTemplate, setHasSavedTemplate] = useState<boolean>(false);

    const [metadata, setMetadata] = useState<{
        docTypes: any[];
        purposes: any[];
        staff: any[];
        propertyLocations: { id: string; name: string }[];
    }>({
        docTypes: [],
        purposes: [],
        staff: [],
        propertyLocations: [],
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
        purposeOtherText: '',
        referenceNumber: `REF-${new Date().getFullYear()}-0000`, // Initial Placeholder
    });

    // 1. Fetch Metadata (Barangays, etc) - This makes the list dropdown again
    useEffect(() => {
        let isMounted = true;
        const fetchMeta = async () => {
            try {
                const data = await requestService.getMetadata();
                if (isMounted && data) {
                    const municipalityMap: Record<string, string> = {};
                    (data.municipalities ?? []).forEach((m: any) => { municipalityMap[m.id] = m.name; });

                    const propertyLocations = (data.barangays ?? []).map((b: any) => ({
                        id: b.id,
                        name: `${b.name}, ${municipalityMap[b.municipality_id] ?? ''}`.replace(/,\s*$/, ''),
                    }));

                    setMetadata({
                        docTypes: data.docTypes || [],
                        purposes: data.purposes || [],
                        staff: data.staff || [],
                        propertyLocations,
                    });
                }
            } catch (err) { console.error('Metadata fetch failed', err); }
        };
        fetchMeta();
        return () => { isMounted = false; };
    }, []);

    // 2. Real-time Prefix Logic: Updates the UI Chip before saving
    useEffect(() => {
        if (formData.documentTypeIds.length > 0) {
            const selectedId = formData.documentTypeIds[0];
            const doc = metadata.docTypes.find(d => d.id === selectedId);
            const prefix = doc?.prefix || 'REF';
            setFormData(prev => ({
                ...prev,
                referenceNumber: `${prefix}-${new Date().getFullYear()}-XXXX` // Dynamic Preview
            }));
        }
    }, [formData.documentTypeIds, metadata.docTypes]);

    // Handle Prefills (Cloning logic)
    useEffect(() => {
        if (prefilledRequestData) {
            setFormData((prev) => ({
                ...prev,
                ...prefilledRequestData,
                // We keep the declarant data but clear the ID to force a NEW unique reference number
                id: undefined,
                referenceNumber: prev.referenceNumber,
                declarantName: prefilledRequestData.declarantName || prefilledRequestData.declarant_name || '',
                requestedByName: prefilledRequestData.requestedByName || prefilledRequestData.requested_by_name || '',
            }));
        }
    }, [prefilledRequestData]);

    const handleProceedToDocument = async () => {
        if (!formData.declarantName || !formData.requestedByName || formData.documentTypeIds.length === 0) {
            setValidationError('Please fill out all required fields before proceeding.');
            return;
        }
        setValidationError('');

        const selectedId = formData.documentTypeIds[0];
        const view = DOCUMENT_TYPE_ID_VIEW_MAP[selectedId] || 'tax-declaration';

        setSubmitting(true);
        try {
            // ALWAYS Submit new to generate a unique ID per document (per your requirement)
            const res = await requestService.submitRequest({ ...formData, status: 'PENDING_PAYMENT' }, user.id);
            const savedRequest = res.data || res;

            // Real-time Update: Replace the UI placeholder with the real DB code
            const dbRef = savedRequest.reference_number;
            const dbId = savedRequest.id;

            setFormData(prev => ({ ...prev, id: dbId, referenceNumber: dbRef }));

            onEntryComplete({
                requestId: dbId,
                referenceNumber: dbRef,
                declarantName: formData.declarantName,
                requestedByName: formData.requestedByName,
                requestDate: formData.requestDate,
                purposeId: formData.purposeId,
                documentTypeIds: formData.documentTypeIds,
                actionTaken: formData.actionTaken,
                authRequired: formData.authRequired,
                propertyLocation: formData.propertyLocation,
            });

            setTimeout(() => onNavigateToProcessing(view), 0);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to save request.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSaveDraft = async () => {
        if (!formData.declarantName) return alert('Name required to save draft.');
        setSubmitting(true);
        try {
            const res = await requestService.submitRequest({ ...formData, status: 'DRAFT' }, user.id);
            const saved = res.data || res;
            setFormData(prev => ({ ...prev, id: saved.id, referenceNumber: saved.reference_number }));
            onCancel();
        } catch (err) { alert('Draft failed'); }
        finally { setSubmitting(false); }
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

    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    return (
        <div className="rfe-page">
            <div className="rfe-page-inner">
                <div className="rfe-card">
                    <div className="rfe-card-header">
                        <div className="rfe-card-header-left">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span className="rfe-header-icon"><ClipboardIconLarge /></span>
                                <div>
                                    <h2 className="rfe-card-title">REQUEST FORM ENTRY</h2>
                                    <div className="rfe-card-subtitle">Property Record Request · {today}</div>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <span className="rfe-ref-chip">{formData.referenceNumber}</span>
                            <button className="btn-reset-form" onClick={handleResetForm}>↻ New Client</button>
                        </div>
                    </div>

                    <div className="rfe-form-body">
                        {/* Section: Declarant Details */}
                        <div className="rfe-section">
                            <div className="rfe-section-title"><PersonIcon /><span>Declarant Details</span></div>
                            <div className="rfe-field">
                                <label className="rfe-label">Name of Declarant</label>
                                <input className="rfe-input" type="text" placeholder="e.g. Juan D. Cruz" value={formData.declarantName} onChange={(e) => setFormData({ ...formData, declarantName: e.target.value })} />
                            </div>
                            <div className="rfe-field" style={{ marginTop: 14 }}>
                                <label className="rfe-label">Location of the Property</label>
                                <SearchableSelectDropdown options={metadata.propertyLocations} value={formData.propertyLocation} onChange={(val) => setFormData({ ...formData, propertyLocation: val })} placeholder="Brgy., Municipality, Province" />
                            </div>
                            <div className="rfe-field" style={{ marginTop: 14 }}>
                                <label className="rfe-label">Requested By</label>
                                <input className="rfe-input" type="text" placeholder="e.g. Juan D. Cruz" value={formData.requestedByName} onChange={(e) => setFormData({ ...formData, requestedByName: e.target.value })} />
                            </div>
                        </div>

                        {/* Section: Request Details */}
                        <div className="rfe-section">
                            <div className="rfe-section-title"><PlusCircleIcon /><span>Request Details</span></div>
                            <div className="rfe-field">
                                <label className="rfe-label">May I/We request for:</label>
                                <MultiSelectDropdown options={metadata.docTypes} selectedIds={formData.documentTypeIds} onChange={(ids) => setFormData({ ...formData, documentTypeIds: ids })} placeholder="Select Document Type(s)..." />
                            </div>
                            <div className="rfe-field" style={{ marginTop: 14 }}>
                                <label className="rfe-label">Reason / Purpose</label>
                                <SingleSelectDropdown options={metadata.purposes} value={formData.purposeId} onChange={(val) => setFormData({ ...formData, purposeId: val })} placeholder="Select Reason / Purpose..." />
                            </div>
                        </div>

                        {/* Section: Action Taken */}
                        <div className="rfe-section">
                            <div className="rfe-section-title"><ClipboardIcon /><span>Action Taken</span></div>
                            <ToggleButtonPair leftLabel="APPROVED" rightLabel="DISAPPROVED" value={formData.actionTaken === 'APPROVED'} onChange={(val) => setFormData({ ...formData, actionTaken: val ? 'APPROVED' : 'DISAPPROVED' })} />
                        </div>
                    </div>

                    {validationError && <div className="warning-banner" role="alert">{validationError}</div>}

                    <div className="rfe-footer">
                        <button className="btn-submit" onClick={handleSaveDraft} disabled={submitting}>{submitting ? 'Saving…' : '💾 Save Draft'}</button>
                        <button className="btn-proceed" type="button" onClick={handleProceedToDocument} disabled={submitting}>
                            {submitting ? 'Processing...' : 'Proceed to Document →'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- SUB-COMPONENTS (With Original Formatting) ---

function ToggleButtonPair({ leftLabel, rightLabel, value, onChange }: any) {
    return (
        <div className="toggle-pair">
            <button type="button" className={`toggle-btn ${value === true ? 'toggle-btn-active' : ''}`} onClick={() => onChange(true)}>{leftLabel}</button>
            <button type="button" className={`toggle-btn ${value === false ? 'toggle-btn-active' : ''}`} onClick={() => onChange(false)}>{rightLabel}</button>
        </div>
    );
}

function MultiSelectDropdown({ options, selectedIds, onChange, placeholder }: any) {
    const [open, setOpen] = useState(false);
    const toggle = (id: string) => onChange(selectedIds.includes(id) ? selectedIds.filter((i: any) => i !== id) : [...selectedIds, id]);
    return (
        <div className="custom-select">
            <button type="button" className="custom-select-trigger" onClick={() => setOpen(!open)}>
                {selectedIds.length === 0 ? placeholder : options.filter((o: any) => selectedIds.includes(o.id)).map((o: any) => o.name).join(', ')}
            </button>
            {open && <div className="custom-select-menu">{options.map((opt: any) => (
                <label key={opt.id} className="custom-select-option"><input type="checkbox" checked={selectedIds.includes(opt.id)} onChange={() => toggle(opt.id)} /> {opt.name}</label>
            ))}</div>}
        </div>
    );
}

function SingleSelectDropdown({ options, value, onChange, placeholder }: any) {
    return (
        <div className="custom-select">
            <select className="native-select" value={value} onChange={(e) => onChange(e.target.value)}>
                <option value="" disabled>{placeholder}</option>
                {options.map((opt: any) => <option key={opt.id} value={opt.id}>{opt.name || opt.label}</option>)}
            </select>
        </div>
    );
}

function SearchableSelectDropdown({ options, value, onChange, placeholder }: any) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const selected = options.find((o: any) => o.id === value);
    useEffect(() => { setQuery(selected ? selected.name : ''); }, [value, selected]);
    const filtered = query === '' ? options : options.filter((o: any) => o.name.toLowerCase().includes(query.toLowerCase()));
    return (
        <div className="custom-select">
            <input className="rfe-input" value={query} onChange={(e) => { setQuery(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder={placeholder} />
            {open && <div className="custom-select-menu">{filtered.map((opt: any) => (
                <div key={opt.id} className="custom-select-option" onClick={() => { onChange(opt.id); setOpen(false); }}>{opt.name}</div>
            ))}</div>}
        </div>
    );
}

const PersonIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" /></svg>;
const PlusCircleIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></svg>;
const ClipboardIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3a1 1 0 011-1h4a1 1 0 011 1v1M9 10h6" /></svg>;
const ClipboardIconLarge = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3a1 1 0 011-1h4a1 1 0 011 1v1M9 10h6" /></svg>;