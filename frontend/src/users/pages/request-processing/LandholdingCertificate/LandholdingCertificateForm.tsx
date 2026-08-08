import { useState, useCallback, useEffect } from 'react';
import type { User } from '../../../../auth-folder/types/auth';
import type { CompletedEntryData } from '../../../types/taxDeclaration';
import type { LandholdingFormData, LandholdingPropertyRow } from '../../../types/landholding';
import { EMPTY_LANDHOLDING_FORM, EMPTY_LANDHOLDING_ROW } from '../../../types/landholding';
import { requestService } from '../../../services/requestService';

import '../../../styles/LandholdingCertificate.css';
import { landholdingService } from '../../../services/landholdingService';
import { useCart } from '../../../hooks/TransactionCartContext';
import {
    XIcon,
    AlertTriangleIcon,
    PlusIcon,
    ClipboardListIcon,
} from '../../../components/icons';
import { TransactionProgressPanel } from '../../../components/TransactionProgressPanel';
import { CustomSelect } from '../../../components/CustomSelect';
import { CustomDateInput } from '../../../components/CustomDateInput';

function ordinal(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatCertDate(isoDate: string): { day: string; month: string; year: string } {
    if (!isoDate) return { day: '___', month: '______', year: '____' };
    const d = new Date(isoDate + 'T00:00:00');
    return {
        day: ordinal(d.getDate()),
        month: d.toLocaleString('en-US', { month: 'long' }),
        year: d.getFullYear().toString(),
    };
}

function resolvePropertyLocationLabel(
    barangayId: string | undefined,
    barangays: { id: string; name: string; municipality_id: string }[],
    municipalityMap: Record<string, string>
): string {
    if (!barangayId) return '';
    const barangay = barangays.find((b) => b.id === barangayId);
    if (!barangay) return '';
    const municipalityName = municipalityMap[barangay.municipality_id] || '';
    return `${barangay.name}, ${municipalityName}, Z.N.`;
}

interface LandholdingCertificateFormProps {
    user: User;
    entryData: CompletedEntryData;
    onDiscard: () => void;
    onDiscardToSummary?: () => void;
    onAddAnotherAfterDiscard?: (base: {
        declarantName?: string;
        requestedByName?: string;
        propertyLocation?: string;
        purposeId?: string;
        authRequired?: boolean | null;
        actionTaken?: string;
    }) => void;
    onAddAnother: () => void;
    onGoToSummary: () => void;
}

function PropertyRowItem({ row, onUpdate, onRemove, canRemove }: { row: LandholdingPropertyRow; onUpdate: (id: string, field: keyof LandholdingPropertyRow, value: string) => void; onRemove: (id: string) => void; canRemove: boolean; }) {
    return (
        <tr>
            <td><input className="lh-input" placeholder="e.g. 03-0004-00053" value={row.tdArpNumber} onChange={(e) => onUpdate(row.id, 'tdArpNumber', e.target.value)} /></td>
            <td><input className="lh-input" placeholder="e.g. Banganon, Gutalac, ZN" value={row.locationOfProperty} onChange={(e) => onUpdate(row.id, 'locationOfProperty', e.target.value)} /></td>
            <td><input className="lh-input" placeholder="e.g. 62-C" value={row.lotNumber} onChange={(e) => onUpdate(row.id, 'lotNumber', e.target.value)} /></td>
            <td><input className="lh-input" placeholder="e.g. T-798" value={row.titleNumber} onChange={(e) => onUpdate(row.id, 'titleNumber', e.target.value)} /></td>
            <td><input className="lh-input" placeholder="e.g. 1.9999 has." value={row.area} onChange={(e) => onUpdate(row.id, 'area', e.target.value)} /></td>
            <td className="lh-td-right"><input className="lh-input" type="number" placeholder="0.00" value={row.assessedValue} onChange={(e) => onUpdate(row.id, 'assessedValue', e.target.value)} min="0" step="0.01" /></td>
            <td><button type="button" className="lh-row-remove-btn" onClick={() => onRemove(row.id)} disabled={!canRemove} title="Remove row"><XIcon size={13} /></button></td>
        </tr>
    );
}

export function LandholdingCertificateForm({ user, entryData, onDiscard, onDiscardToSummary, onAddAnotherAfterDiscard, onAddAnother, onGoToSummary }: LandholdingCertificateFormProps) {
    const LS_KEY = `adept-lh-${entryData.requestId}`;

    const [form, setForm] = useState<LandholdingFormData>(() => {
        try {
            const saved = localStorage.getItem(LS_KEY);
            if (saved) return { ...EMPTY_LANDHOLDING_FORM(), ...JSON.parse(saved) };
        } catch { }
        return { ...EMPTY_LANDHOLDING_FORM(), declarantName: entryData.declarantName || '' };
    });

    // Captured ONCE, at first render, before the "auto-persist to
    // localStorage" effect below has a chance to run and write the (still
    // empty) `form` back into LS_KEY. If we instead re-read
    // localStorage.getItem(LS_KEY) live inside the hydrate-from-backend
    // effect, it would always find a draft — the one the persist effect
    // just wrote a moment earlier on mount — and would skip fetching the
    // real backend data every time. That's exactly why Amend (which relies
    // on this fetch to pull in the deep-copied certificate) was showing up
    // blank.
    const [hadLocalDraftOnMount] = useState(() => !!localStorage.getItem(LS_KEY));

    const { addItem, items: cartItems } = useCart();
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    const [showDiscardModal, setShowDiscardModal] = useState(false);
    const [discarding, setDiscarding] = useState(false);
    const [discardError, setDiscardError] = useState('');
    const [showNextStepChoice, setShowNextStepChoice] = useState(false);

    // Auto-persist to localStorage on every change
    useEffect(() => {
        try { localStorage.setItem(LS_KEY, JSON.stringify(form)); } catch { }
    }, [form, LS_KEY]);

    useEffect(() => {
        let isMounted = true;
        const fetchAndApplyLocation = async () => {
            if (!entryData?.propertyLocation) return;
            try {
                const data = await requestService.getMetadata();
                if (!isMounted || !data) return;

                const barangays = Array.isArray((data as any).barangays) ? (data as any).barangays : [];
                const municipalities = Array.isArray((data as any).municipalities) ? (data as any).municipalities : [];
                const municipalityMap: Record<string, string> = {};
                municipalities.forEach((m: any) => { municipalityMap[m.id] = m.name; });

                const label = resolvePropertyLocationLabel(entryData.propertyLocation, barangays, municipalityMap);
                if (!label) return;

                setForm((prev) => ({
                    ...prev,
                    propertyRows: prev.propertyRows.map((r, idx) =>
                        idx === 0 && !r.locationOfProperty ? { ...r, locationOfProperty: label } : r
                    ),
                }));
            } catch (err) {
                console.error('Failed to resolve property location', err);
            }
        };
        fetchAndApplyLocation();
        return () => { isMounted = false; };
    }, [entryData?.propertyLocation]);

    // If this request already has saved document data on the backend (e.g.
    // it was cloned from a voided original during an Amend) and the staff
    // hasn't started a local draft yet, hydrate the form instead of leaving
    // it blank.
    useEffect(() => {
        let isMounted = true;
        const hydrateFromBackend = async () => {
            // Use the value captured on mount, NOT a fresh localStorage
            // read — see the comment where hadLocalDraftOnMount is declared.
            if (hadLocalDraftOnMount) return;
            try {
                const result = await requestService.getDocumentData(entryData.requestId);
                if (isMounted && result?.documentPrefix === 'LH' && result.data) {
                    setForm((prev) => ({
                        ...prev,
                        ...result.data,
                        propertyRows: result.data.propertyRows?.length
                            ? result.data.propertyRows
                            : prev.propertyRows,
                    }));
                }
            } catch {
                // No existing data to prefill — fine, form just stays as-is.
            }
        };
        hydrateFromBackend();
        return () => { isMounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entryData.requestId, hadLocalDraftOnMount]);

    const set = (field: keyof LandholdingFormData, value: string) => setForm((prev) => ({ ...prev, [field]: value }));
    const updateRow = useCallback((id: string, field: keyof LandholdingPropertyRow, value: string) => { setForm((prev) => ({ ...prev, propertyRows: prev.propertyRows.map((r) => r.id === id ? { ...r, [field]: value } : r) })); }, []);
    const addRow = () => setForm((prev) => ({ ...prev, propertyRows: [...prev.propertyRows, EMPTY_LANDHOLDING_ROW()] }));
    const removeRow = (id: string) => setForm((prev) => ({ ...prev, propertyRows: prev.propertyRows.filter((r) => r.id !== id) }));

    const isAmendMode = !!entryData?.amendedFromReference;

    const handleSave = async (action: 'review' | 'add_another') => {
        if (!form.declarantName.trim()) return setSaveError('Declarant / Owner Name is required.');
        if (form.propertyRows.some((r) => !r.tdArpNumber.trim())) return setSaveError('TD/ARP No. is required for every property row.');

        setSaveError('');
        setSaving(true);
        try {
            await landholdingService.saveCertificate({
                requestId: entryData.requestId,
                declarantName: form.declarantName,
                ownershipType: form.ownershipType,
                propertyRows: form.propertyRows,
                dateGiven: form.dateGiven,
                givenAt: form.givenAt,
                purpose: form.purpose,
                action: 'send_to_payment',
            }, user.id);
            localStorage.removeItem(LS_KEY);

            addItem({
                id: entryData.requestId,
                referenceNumber: entryData.referenceNumber,
                documentType: 'Certificate of Landholding',
                fee: 40.00,
                declarantName: entryData.declarantName,
                requestedByName: entryData.requestedByName,
            });

            if (action === 'review') onGoToSummary();
            else if (action === 'add_another' && !isAmendMode) onAddAnother();
            else onGoToSummary();
        } catch (err: any) {
            setSaveError(err?.response?.data?.error || 'Failed to save. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleConfirmDiscard = async () => {
        setDiscarding(true);
        setDiscardError('');
        try {
            await requestService.updateRequest(entryData.requestId, { status: 'CANCELLED' });
            try { localStorage.removeItem(LS_KEY); } catch { }
            setShowDiscardModal(false);

            if (cartItems.length > 0) {
                setShowNextStepChoice(true);
            } else {
                onDiscard();
            }
        } catch (err) {
            setDiscardError('Failed to discard this document. Please try again.');
        } finally {
            setDiscarding(false);
        }
    };

    const certDate = formatCertDate(form.dateGiven);

    return (
        <div className="lh-page">
            <div className="lh-page-inner">
                <div className="lh-card">
                    <div className="lh-card-header">
                        <div className="lh-card-header-left">
                            <h2 className="lh-card-title">Certificate of Landholding</h2>
                            <span className="lh-card-subtitle">Entry form — fill in to generate the certificate text</span>
                        </div>
                        <span className="lh-ref-chip">{entryData.referenceNumber}</span>
                    </div>

                    {saveError && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '12px 20px', margin: '0 32px 16px', color: '#b91c1c', fontSize: '0.88rem', fontWeight: 600 }}>
                            <AlertTriangleIcon size={16} /> {saveError}
                        </div>
                    )}

                    <div className="lh-form-body">
                        {/* ══ SECTION 1: Declarant Details ══ */}
                        <div className="lh-section">
                            <div className="lh-section-title">Declarant Details</div>
                            <div className="lh-row lh-row-2">
                                <div className="lh-field">
                                    <label className="lh-label">Name of Declarant</label>
                                    <input id="lh-declarant-name" className="lh-input" placeholder="e.g. Wilfredo Salmorin" value={form.declarantName} onChange={(e) => set('declarantName', e.target.value)} />
                                </div>
                                <div className="lh-field">
                                    <label className="lh-label">Ownership</label>
                                    <CustomSelect
                                        value={form.ownershipType}
                                        onChange={(id) => set('ownershipType', id as any)}
                                        options={[
                                            { id: 'single', label: 'Single owner — is / owner / property' },
                                            { id: 'multiple', label: 'Multiple owners — are / owners / properties' },
                                        ]}
                                        placeholder="Select ownership"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ══ SECTION 2: Property Details ══ */}
                        <div className="lh-table-section">
                            <div className="lh-table-header-bar">
                                <span>Property Details</span>
                                <button type="button" className="lh-add-row-btn" onClick={addRow}>
                                    <PlusIcon size={13} /> Add Property
                                </button>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="lh-property-table">
                                    <thead>
                                        <tr>
                                            <th style={{ minWidth: 150 }}>TD/ARP No.</th>
                                            <th style={{ minWidth: 280 }}>Location of Prop.</th>
                                            <th style={{ minWidth: 100 }}>Lot No.</th>
                                            <th style={{ minWidth: 110 }}>Title No.</th>
                                            <th style={{ minWidth: 120 }}>Area</th>
                                            <th className="lh-th-right" style={{ minWidth: 150 }}>Assd. Value (PHP)</th>
                                            <th style={{ width: 40 }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {form.propertyRows.map((row) => (
                                            <PropertyRowItem key={row.id} row={row} onUpdate={updateRow} onRemove={removeRow} canRemove={form.propertyRows.length > 1} />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* ══ SECTION 3: Certification Details ══ */}
                        <div className="lh-section" style={{ borderBottom: 'none', marginBottom: 0 }}>
                            <div className="lh-section-title">Certification Details</div>
                            <div className="lh-row lh-row-3">
                                <div className="lh-field"><label className="lh-label">Date Given</label><CustomDateInput id="lh-date-given" className="lh-input" value={form.dateGiven} onChange={(v) => set('dateGiven', v)} /></div>
                                <div className="lh-field"><label className="lh-label">Given At</label><input id="lh-given-at" className="lh-input" placeholder="e.g. Dipolog City" value={form.givenAt} onChange={(e) => set('givenAt', e.target.value)} /></div>
                                <div className="lh-field">
                                    <label className="lh-label" style={{ visibility: 'hidden' }}>–</label>
                                    <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 8, padding: '11px 14px', fontSize: '0.88rem', color: '#29237a', fontWeight: 600, lineHeight: 1.4 }}>
                                        Given this <u><strong>{certDate.day}</strong></u> day of <u><strong>{certDate.month} {certDate.year}</strong></u>, at {form.givenAt || '________'}
                                    </div>
                                </div>
                            </div>
                            <div className="lh-field"><label className="lh-label">Purpose / Intent</label><input id="lh-purpose" className="lh-input" placeholder="for whatever legal purpose/intent it may serve best" value={form.purpose} onChange={(e) => set('purpose', e.target.value)} /></div>
                        </div>

                    </div>

                    {/* ── Session progress card ── */}
                    <div className="txp-form-wrapper">
                        <TransactionProgressPanel
                            referenceNumber={entryData.referenceNumber}
                            currentDeclarant={entryData.declarantName}
                        />
                    </div>

                    {/* ── Footer actions ── */}
                    <div className="lh-footer">
                        <div className="lh-footer-left">
                            <button
                                type="button"
                                className="lh-btn"
                                style={{ background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3' }}
                                onClick={() => setShowDiscardModal(true)}
                                disabled={saving}
                            >
                                ✕ Discard Document
                            </button>
                        </div>
                        <div className="lh-footer-right">
                            {!isAmendMode && (
                                <button type="button" className="lh-btn lh-btn-secondary" onClick={() => handleSave('add_another')} disabled={saving}>
                                    <ClipboardListIcon size={16} /> Save & Add Another
                                </button>
                            )}
                            <button type="button" className="lh-btn lh-btn-primary" onClick={() => handleSave('review')} disabled={saving}>
                                {saving ? 'Saving...' : 'Review Transaction →'}
                            </button>
                        </div>
                    </div>

                </div>
            </div>

            {/* ── Discard Modal ── */}
            {showDiscardModal && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}
                    onClick={() => !discarding && setShowDiscardModal(false)}
                >
                    <div
                        style={{ background: '#ffffff', borderRadius: '16px', padding: '28px', maxWidth: '420px', width: '100%', boxShadow: '0 20px 40px -8px rgba(0,0,0,0.35)' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
                            <div style={{ background: '#ffe4e6', borderRadius: '999px', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <AlertTriangleIcon size={22} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1e293b' }}>Discard this document?</h3>
                                <p style={{ margin: '6px 0 0', fontSize: '0.9rem', color: '#64748b', lineHeight: 1.5 }}>
                                    Reference <strong style={{ color: '#334155' }}>{entryData.referenceNumber}</strong> will be permanently cancelled.
                                    {cartItems.length > 0 && (
                                        <> Your other <strong style={{ color: '#334155' }}>{cartItems.length} saved document{cartItems.length === 1 ? '' : 's'}</strong> will not be affected.</>
                                    )} This can't be undone.
                                </p>
                            </div>
                        </div>
                        {discardError && (
                            <div style={{ background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', borderRadius: '8px', padding: '10px 14px', fontSize: '0.85rem', fontWeight: 600, marginBottom: '16px' }}>
                                {discardError}
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button type="button" onClick={() => setShowDiscardModal(false)} disabled={discarding} style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
                                Keep Editing
                            </button>
                            <button type="button" onClick={handleConfirmDiscard} disabled={discarding} style={{ background: '#e11d48', color: '#fff', border: '1px solid #e11d48', padding: '10px 20px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', fontSize: '0.9rem', opacity: discarding ? 0.7 : 1 }}>
                                {discarding ? 'Discarding...' : 'Yes, Discard'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showNextStepChoice && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}
                    onClick={() => setShowNextStepChoice(false)}
                >
                    <div
                        style={{ background: '#ffffff', borderRadius: '16px', padding: '28px', maxWidth: '420px', width: '100%', boxShadow: '0 20px 40px -8px rgba(0,0,0,0.35)' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1e293b' }}>What would you like to do next?</h3>
                        <p style={{ margin: '10px 0 20px', fontSize: '0.9rem', color: '#64748b', lineHeight: 1.5 }}>
                            You still have <strong style={{ color: '#334155' }}>{cartItems.length} document{cartItems.length === 1 ? '' : 's'}</strong> saved
                            in this transaction. Add another document, or go review and submit what's already saved.
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            {!isAmendMode && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowNextStepChoice(false);
                                        if (onAddAnotherAfterDiscard) {
                                            onAddAnotherAfterDiscard({
                                                declarantName: entryData.declarantName,
                                                requestedByName: entryData.requestedByName,
                                                propertyLocation: entryData.propertyLocation,
                                                purposeId: entryData.purposeId,
                                                authRequired: entryData.authRequired,
                                                actionTaken: entryData.actionTaken,
                                            });
                                        } else {
                                            onDiscard();
                                        }
                                    }}
                                    style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}
                                >
                                    Add Another Document
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => { setShowNextStepChoice(false); (onDiscardToSummary ?? onGoToSummary)(); }}
                                style={{ background: '#4f46e5', color: '#fff', border: '1px solid #4f46e5', padding: '10px 20px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', fontSize: '0.9rem' }}
                            >
                                Proceed to Transaction Summary
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}