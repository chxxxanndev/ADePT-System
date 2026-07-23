import { useState } from 'react';
import type { User } from '../../../../auth-folder/types/auth';
import { noLandholdingService } from '../../../services/noLandholdingService';
import type { CompletedEntryData } from '../../../../users/types/taxDeclaration';
import type { NoLandholdingFormData, PronounType, PropertyCountType } from '../../../../users/types/noLandholding';
import { EMPTY_NO_LANDHOLDING_FORM } from '../../../../users/types/noLandholding';
import { useCart } from '../../../../users/hooks/TransactionCartContext';
import '../../../../users/styles/LandholdingCertificate.css';
import {
    CheckCircleIcon,
    AlertTriangleIcon,
    SaveIcon,
    PlusIcon,
    ClipboardListIcon,
} from '../../../components/icons';

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
    onAddAnother: () => void;
    onGoToSummary: () => void;
}

export function NoLandholdingCertificateForm({ user, entryData, onBack, onAddAnother, onGoToSummary }: NoLandholdingCertificateFormProps) {
    const [form, setForm] = useState<NoLandholdingFormData>(() => ({ ...EMPTY_NO_LANDHOLDING_FORM(), declarantName: entryData.declarantName || '', }));
    const { addItem } = useCart();
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    const set = <K extends keyof NoLandholdingFormData>(field: K, value: NoLandholdingFormData[K]) => setForm((prev) => ({ ...prev, [field]: value }));

    // Support review action
    const handleSave = async (action: 'draft' | 'review' | 'add_another') => {
        if (!form.declarantName.trim()) return setSaveError('Declarant / Owner Name is required.');
        setSaveError('');
        setSaving(true);
        try {
            // REAL API CALL:
            await noLandholdingService.saveCertificate({
                requestId: entryData.requestId,
                declarantName: form.declarantName,
                pronoun: form.pronoun,
                propertyCount: form.propertyCount,
                dateGiven: form.dateGiven,
                givenAt: form.givenAt,
                purpose: form.purpose,
                action: action === 'draft' ? 'draft' : 'send_to_payment',
            }, user.id);

            if (action !== 'draft') {
                addItem({
                    id: entryData.requestId,
                    referenceNumber: entryData.referenceNumber,
                    documentType: 'Certificate of No Landholding',
                    fee: 40.00,
                    declarantName: entryData.declarantName,
                    requestedByName: entryData.requestedByName,
                });
            }

            // Instantly transition without the banner delay
            if (action === 'review') onGoToSummary();
            else if (action === 'add_another') onAddAnother();

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

<<<<<<< HEAD
                    {saved && (
                        <div className="lh-success-banner">
                            <span className="lh-success-icon"><CheckCircleIcon size={18} /></span>
                            <div className="lh-success-text">
                                <strong>Certificate saved successfully!</strong>
                                <span>Record stored. Sent to payment queue.</span>
                            </div>
                        </div>
                    )}

                    {saveError && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '12px 20px', margin: '0 32px 16px', color: '#b91c1c', fontSize: '0.88rem', fontWeight: 600 }}>
                            <AlertTriangleIcon size={16} /> {saveError}
                        </div>
                    )}
=======
                    {saveError && <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '12px 20px', margin: '0 32px 16px', color: '#b91c1c', fontSize: '0.88rem', fontWeight: 600 }}>⚠ {saveError}</div>}
>>>>>>> 83633769e55f045c730818fdbdd7f6f2748c7cc8

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

                    {/* ── Footer actions ── */}
                    <div className="lh-footer">
                        <div className="lh-footer-left">
                            <button type="button" id="nlh-btn-back" className="lh-btn lh-btn-back" onClick={onBack}>← Back</button>
                        </div>
                        <div className="lh-footer-right">
                            <button type="button" className="lh-btn lh-btn-draft" onClick={() => handleSave('draft')} disabled={saving}>
                                {saving ? <span className="lh-spinner" /> : <SaveIcon size={14} />} Save Draft
                            </button>
                            <button type="button" className="lh-btn lh-btn-add-another" onClick={() => handleSave('add_another')} disabled={saving} style={{ backgroundColor: '#10b981', color: 'white' }}>
                                {saving ? <span className="lh-spinner" /> : <PlusIcon size={14} />} Save & Add Another
                            </button>
                            <button type="button" className="lh-btn lh-btn-submit" onClick={() => handleSave('review')} disabled={saving}>
                                {saving ? <span className="lh-spinner" /> : <ClipboardListIcon size={14} />} Review Transaction
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}