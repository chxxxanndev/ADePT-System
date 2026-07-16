import { useState, useCallback } from 'react';
import type { User } from '../../../../auth-folder/types/auth';
import type { CompletedEntryData } from '../../../types/taxDeclaration';
import type { LandholdingFormData, LandholdingPropertyRow } from '../../../types/landholding';
import { EMPTY_LANDHOLDING_FORM, EMPTY_LANDHOLDING_ROW } from '../../../types/landholding';
import { requestService } from '../../../services/requestService';
import '../../../styles/LandholdingCertificate.css';

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

function formatPeso(val: string): string {
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    return num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface LandholdingCertificateFormProps {
    user: User;
    entryData: CompletedEntryData;
    onBack: () => void;
    onBackToDashboard: () => void;
    onAddAnother: () => void;
    onGoToPendingPayments: () => void;
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
            <td><button type="button" className="lh-row-remove-btn" onClick={() => onRemove(row.id)} disabled={!canRemove} title="Remove row">✕</button></td>
        </tr>
    );
}

export function LandholdingCertificateForm({ user, entryData, onBack, onBackToDashboard, onAddAnother, onGoToPendingPayments }: LandholdingCertificateFormProps) {
    const [form, setForm] = useState<LandholdingFormData>(() => ({ ...EMPTY_LANDHOLDING_FORM(), declarantName: entryData.declarantName || '', }));
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState('');

    const set = (field: keyof LandholdingFormData, value: string) => setForm((prev) => ({ ...prev, [field]: value }));
    const updateRow = useCallback((id: string, field: keyof LandholdingPropertyRow, value: string) => { setForm((prev) => ({ ...prev, propertyRows: prev.propertyRows.map((r) => r.id === id ? { ...r, [field]: value } : r) })); }, []);
    const addRow = () => setForm((prev) => ({ ...prev, propertyRows: [...prev.propertyRows, EMPTY_LANDHOLDING_ROW()] }));
    const removeRow = (id: string) => setForm((prev) => ({ ...prev, propertyRows: prev.propertyRows.filter((r) => r.id !== id) }));

    // PHASE 1 LOGIC: Send to Payment & return to Dashboard
    const handleSave = async (action: 'draft' | 'send_to_payment' | 'add_another') => {
        if (!form.declarantName.trim()) return setSaveError('Declarant / Owner Name is required.');
        if (form.propertyRows.some((r) => !r.tdArpNumber.trim())) return setSaveError('TD/ARP No. is required for every property row.');

        setSaveError('');
        setSaving(true);
        try {
            await new Promise((res) => setTimeout(res, 800)); // Mock API delay

            if (action !== 'draft') {
                await requestService.updateRequest(entryData.requestId, { ...entryData, status: 'PENDING_PAYMENT' });
            }

            setSaved(true);
            setTimeout(() => {
                if (action === 'send_to_payment') onGoToPendingPayments(); // <--- CALL IT HERE
                else if (action === 'add_another') onAddAnother();
            }, 1500);
        } catch (err: any) {
            setSaveError(err?.response?.data?.error || 'Failed to save. Please try again.');
        } finally {
            setSaving(false);
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

                    {saved && (
                        <div className="lh-success-banner">
                            <span className="lh-success-icon">✓</span>
                            <div className="lh-success-text">
                                <strong>Certificate saved successfully!</strong>
                                <span>Record stored. Sent to payment queue.</span>
                            </div>
                        </div>
                    )}

                    {saveError && <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '12px 20px', margin: '0 32px 16px', color: '#b91c1c', fontSize: '0.88rem', fontWeight: 600 }}>⚠ {saveError}</div>}

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
                                    <select id="lh-ownership-type" className="lh-select" value={form.ownershipType} onChange={(e) => set('ownershipType', e.target.value as any)}>
                                        <option value="single">Single owner — is / owner / property</option>
                                        <option value="multiple">Multiple owners — are / owners / properties</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* ══ SECTION 2: Property Details ══ */}
                        <div className="lh-table-section">
                            <div className="lh-table-header-bar">
                                <span>Property Details</span>
                                <button type="button" className="lh-add-row-btn" onClick={addRow}>+ Add Property</button>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="lh-property-table">
                                    <thead>
                                        <tr>
                                            <th style={{ minWidth: 150 }}>TD/ARP No.</th>
                                            <th style={{ minWidth: 180 }}>Location of Prop.</th>
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
                                <div className="lh-field"><label className="lh-label">Date Given</label><input id="lh-date-given" className="lh-input" type="date" value={form.dateGiven} onChange={(e) => set('dateGiven', e.target.value)} /></div>
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

                    {/* ── Footer actions (Phase 1 Logic) ── */}
                    <div className="lh-footer">
                        <div className="lh-footer-left">
                            <button type="button" className="lh-btn lh-btn-back" onClick={onBack}>← Back</button>
                        </div>
                        <div className="lh-footer-right">
                            <button type="button" className="lh-btn lh-btn-draft" onClick={() => handleSave('draft')} disabled={saving}>
                                {saving ? <span className="lh-spinner" /> : '💾'} Save Draft
                            </button>
                            <button type="button" className="lh-btn lh-btn-add-another" onClick={() => handleSave('add_another')} disabled={saving}>
                                {saving ? <span className="lh-spinner" /> : '➕'} Send & Add Another
                            </button>
                            <button type="button" className="lh-btn lh-btn-submit" onClick={() => handleSave('send_to_payment')} disabled={saving}>
                                {saving ? <span className="lh-spinner" /> : '💳'} Send to Payment
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}