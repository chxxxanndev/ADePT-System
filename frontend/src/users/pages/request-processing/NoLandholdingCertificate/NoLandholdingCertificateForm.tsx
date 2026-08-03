import { useState, useEffect } from 'react';
import type { User } from '../../../../auth-folder/types/auth';
import { noLandholdingService } from '../../../services/noLandholdingService';
import { requestService } from '../../../services/requestService';
import type { CompletedEntryData } from '../../../../users/types/taxDeclaration';
import type { NoLandholdingFormData, PronounType, PropertyCountType } from '../../../../users/types/noLandholding';
import { EMPTY_NO_LANDHOLDING_FORM } from '../../../../users/types/noLandholding';
import { useCart } from '../../../../users/hooks/TransactionCartContext';
import '../../../../users/styles/LandholdingCertificate.css';
import {
    AlertTriangleIcon,
    PlusIcon,
    ClipboardListIcon,
} from '../../../components/icons';
import { TransactionProgressPanel } from '../../../components/TransactionProgressPanel';

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

export function NoLandholdingCertificateForm({ user, entryData, onDiscard, onDiscardToSummary, onAddAnotherAfterDiscard, onAddAnother, onGoToSummary }: NoLandholdingCertificateFormProps) {
    const LS_KEY = `adept-nlh-${entryData.requestId}`;

    const [form, setForm] = useState<NoLandholdingFormData>(() => {
        try {
            const saved = localStorage.getItem(LS_KEY);
            if (saved) return { ...EMPTY_NO_LANDHOLDING_FORM(), ...JSON.parse(saved) };
        } catch { }
        return { ...EMPTY_NO_LANDHOLDING_FORM(), declarantName: entryData.declarantName || '' };
    });

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
            localStorage.removeItem(LS_KEY);

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
                            <h2 className="lh-card-title">Certificate of No Landholding</h2>
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

                    {/* ── Session progress card ── */}
                    <div className="txp-form-wrapper">
                        <TransactionProgressPanel
                            referenceNumber={entryData.referenceNumber}
                            currentDeclarant={entryData.declarantName} />
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