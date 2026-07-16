import { useState } from 'react';
import type { User } from '../../../../auth-folder/types/auth';
import type { CompletedEntryData } from '../../../types/taxDeclaration';
import type { NoLandholdingFormData, PronounType, PropertyCountType } from '../../../types/noLandholding';
import { EMPTY_NO_LANDHOLDING_FORM } from '../../../types/noLandholding';
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

interface NoLandholdingCertificateFormProps {
    user: User;
    entryData: CompletedEntryData;
    onBack: () => void;
    onBackToDashboard: () => void;
    onAddAnother: () => void;
    onGoToPendingPayments: () => void;
}

export function NoLandholdingCertificateForm({ user, entryData, onBack, onBackToDashboard, onAddAnother, onGoToPendingPayments }: NoLandholdingCertificateFormProps) {
    const [form, setForm] = useState<NoLandholdingFormData>(() => ({ ...EMPTY_NO_LANDHOLDING_FORM(), declarantName: entryData.declarantName || '', }));
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [printAsCtc, setPrintAsCtc] = useState(false);

    const set = <K extends keyof NoLandholdingFormData>(field: K, value: NoLandholdingFormData[K]) => setForm((prev) => ({ ...prev, [field]: value }));

    // PHASE 1 LOGIC: Send to Payment & Return to Dashboard
    const handleSave = async (action: 'draft' | 'send_to_payment' | 'add_another') => {
        if (!form.declarantName.trim()) return setSaveError('Declarant / Owner Name is required.');
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
                            <h2 className="lh-card-title">Certificate of No Landholding</h2>
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

                    <div className="lh-ctc-toolbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 32px', background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input type="checkbox" id="ctc-mode-checkbox" checked={printAsCtc} onChange={(e) => setPrintAsCtc(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                            <label htmlFor="ctc-mode-checkbox" style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#1e293b', cursor: 'pointer' }}>Print as Certified True Copy (CTC)</label>
                        </div>
                        {printAsCtc && <span style={{ background: '#dbeafe', color: '#1e40af', padding: '4px 12px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 'bold' }}>CTC Mode Active — Printable Stamp Overlay Enabled</span>}
                    </div>

                    <div className="lh-form-body">
                        {/* ══ SECTION 1: Declarant Details ══ */}
                        <div className="lh-section">
                            <div className="lh-section-title">Declarant Details</div>
                            <div className="lh-field" style={{ marginBottom: 14 }}>
                                <label className="lh-label">Name of Declarant</label>
                                <input id="nlh-declarant-name" className="lh-input" placeholder="e.g. Vivian V. Yanos" value={form.declarantName} onChange={(e) => set('declarantName', e.target.value)} />
                            </div>
                            <div className="lh-row lh-row-2">
                                <div className="lh-field">
                                    <label className="lh-label">Pronoun</label>
                                    <select id="nlh-pronoun" className="lh-select" value={form.pronoun} onChange={(e) => set('pronoun', e.target.value as PronounType)}>
                                        <option value="His">His</option>
                                        <option value="Her">Her</option>
                                        <option value="Their">Their</option>
                                    </select>
                                </div>
                                <div className="lh-field">
                                    <label className="lh-label">Property / Name Count</label>
                                    <select id="nlh-property-count" className="lh-select" value={form.propertyCount} onChange={(e) => set('propertyCount', e.target.value as PropertyCountType)}>
                                        <option value="singular">Singular — has / property / name</option>
                                        <option value="plural">Plural — have / properties / names</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* ══ SECTION 2: Certification Details ══ */}
                        <div className="lh-section" style={{ borderBottom: 'none', marginBottom: 0 }}>
                            <div className="lh-section-title">Certification Details</div>
                            <div className="lh-row lh-row-3">
                                <div className="lh-field"><label className="lh-label">Date Given</label><input id="nlh-date-given" className="lh-input" type="date" value={form.dateGiven} onChange={(e) => set('dateGiven', e.target.value)} /></div>
                                <div className="lh-field"><label className="lh-label">Given At</label><input id="nlh-given-at" className="lh-input" placeholder="e.g. Dipolog City" value={form.givenAt} onChange={(e) => set('givenAt', e.target.value)} /></div>
                                <div className="lh-field">
                                    <label className="lh-label" style={{ visibility: 'hidden' }}>–</label>
                                    <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 8, padding: '11px 14px', fontSize: '0.88rem', color: '#29237a', fontWeight: 600, lineHeight: 1.4 }}>
                                        Given this <u><strong>{certDate.day}</strong></u> day of <u><strong>{certDate.month} {certDate.year}</strong></u>, at {form.givenAt || '________'}
                                    </div>
                                </div>
                            </div>
                            <div className="lh-field"><label className="lh-label">Purpose / Intent</label><input id="nlh-purpose" className="lh-input" placeholder="for whatever legal purpose/intent it may serve best" value={form.purpose} onChange={(e) => set('purpose', e.target.value)} /></div>
                        </div>

                    </div>

                    {/* ── Footer actions (Phase 1 Logic) ── */}
                    <div className="lh-footer">
                        <div className="lh-footer-left">
                            <button type="button" id="nlh-btn-back" className="lh-btn lh-btn-back" onClick={onBack}>← Back</button>
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