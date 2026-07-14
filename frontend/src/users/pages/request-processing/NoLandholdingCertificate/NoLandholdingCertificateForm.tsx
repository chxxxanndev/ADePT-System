import { useState } from 'react';
import type { User } from '../../../../auth-folder/types/auth';
import type { CompletedEntryData } from '../../../types/taxDeclaration';
import type { NoLandholdingFormData, PronounType, PropertyCountType } from '../../../types/noLandholding';
import { EMPTY_NO_LANDHOLDING_FORM } from '../../../types/noLandholding';
import '../../../styles/LandholdingCertificate.css';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const DEFAULT_PRIMARY_SIGNATORIES = [
    'ELVIRA T. ENAO, REA',
    'ENGR. FLORIPES R. BAEL, REA, REB',
    'ISAGANI B. EMBOL, REA',
];

const DEFAULT_SECONDARY_SIGNATORIES = [
    'CHINA CHAN-OLARIO, RN, REA, REB, Enp',
    'ENGR. VICENTE P. DESOY, REA',
];

const SIGNATORY_TITLES = [
    'Local Assessment Operations Officer IV',
    'Local Assessment Operations Officer III',
    'Local Assessment Operations Officer II',
    'Assistant Provincial Assessor',
    'Provincial Assessor',
    'OIC - Provincial Assessor',
    'Municipal Assessor',
];

// ─────────────────────────────────────────────────────────────
// Helper: ordinal suffix
// ─────────────────────────────────────────────────────────────
function ordinal(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ─────────────────────────────────────────────────────────────
// Helper: format date → { day, month, year }
// ─────────────────────────────────────────────────────────────
function formatCertDate(isoDate: string): { day: string; month: string; year: string } {
    if (!isoDate) return { day: '___', month: '______', year: '____' };
    const d = new Date(isoDate + 'T00:00:00');
    return {
        day: ordinal(d.getDate()),
        month: d.toLocaleString('en-US', { month: 'long' }),
        year: d.getFullYear().toString(),
    };
}

// ─────────────────────────────────────────────────────────────
// Helper: build the certificate body sentence
// ─────────────────────────────────────────────────────────────
function buildCertBody(
    declarantName: string,
    pronoun: PronounType,
    count: PropertyCountType,
): { namePart: string; bodySentence: string } {
    // "has/have" is identical for both counts in the Philippine legal phrasing
    const hasHave = 'has/have';
    const propPart = 'no real property/properties declared';
    const pronounPhrase = count === 'singular'
        ? `in ${pronoun.toLowerCase()}/her/their name/s`
        : `in ${pronoun.toLowerCase()}/her/their name/s`;

    return {
        namePart: declarantName || '________________________',
        bodySentence: `${hasHave} ${propPart} ${pronounPhrase} either singly or collectively within the taxing jurisdiction of this province per office records.`,
    };
}


// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────
interface NoLandholdingCertificateFormProps {
    user: User;
    entryData: CompletedEntryData;
    onBack: () => void;
    onBackToDashboard: () => void;
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export function NoLandholdingCertificateForm({
    user: _user,
    entryData,
    onBack,
    onBackToDashboard,
}: NoLandholdingCertificateFormProps) {
    const [form, setForm] = useState<NoLandholdingFormData>(() => ({
        ...EMPTY_NO_LANDHOLDING_FORM(),
        declarantName: entryData.declarantName || '',
    }));

    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [printAsCtc, setPrintAsCtc] = useState(false);

    // Signatory lists (expandable)
    const [primarySignatories, setPrimarySignatories] = useState<string[]>(DEFAULT_PRIMARY_SIGNATORIES);
    const [secondarySignatories, setSecondarySignatories] = useState<string[]>(DEFAULT_SECONDARY_SIGNATORIES);
    const [signatoryTitles, setSignatoryTitles] = useState<string[]>(SIGNATORY_TITLES);

    // ── Field helper ──
    const set = <K extends keyof NoLandholdingFormData>(field: K, value: NoLandholdingFormData[K]) =>
        setForm((prev) => ({ ...prev, [field]: value }));

    // ── Save ──
    const handleSave = async (finalize = false) => {
        if (!form.declarantName.trim()) {
            setSaveError('Declarant / Owner Name is required.');
            return;
        }
        setSaveError('');
        setSaving(true);
        try {
            // TODO: wire to a real noLandholdingService.save() when backend is ready.
            await new Promise((res) => setTimeout(res, 800));
            setSaved(true);
            if (finalize) {
                setTimeout(() => onBackToDashboard(), 1800);
            }
        } catch (err: any) {
            setSaveError(err?.response?.data?.error || 'Failed to save. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handlePrint = () => window.print();

    // ── Derived values ──
    const certDate = formatCertDate(form.dateGiven);
    const { namePart, bodySentence } = buildCertBody(form.declarantName, form.pronoun, form.propertyCount);

    // ─────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────
    return (
        <div className="lh-page">
            <div className="lh-page-inner">
                <div className="lh-card">

                    {/* ── Card header ── */}
                    <div className="lh-card-header">
                        <div className="lh-card-header-left">
                            <h2 className="lh-card-title">Certificate of No Landholding</h2>
                            <span className="lh-card-subtitle">
                                Entry form — fill in to generate the certificate text
                            </span>
                        </div>
                        <span className="lh-ref-chip">{entryData.referenceNumber}</span>
                    </div>

                    {/* ── Success banner ── */}
                    {saved && (
                        <div className="lh-success-banner">
                            <span className="lh-success-icon">✓</span>
                            <div className="lh-success-text">
                                <strong>Certificate saved successfully!</strong>
                                <span>Record has been stored. You may print or finalize.</span>
                            </div>
                        </div>
                    )}

                    {/* ── Error banner ── */}
                    {saveError && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            background: '#fee2e2', border: '1.5px solid #fca5a5',
                            borderRadius: 10, padding: '12px 20px', margin: '0 32px 16px',
                            color: '#b91c1c', fontSize: '0.88rem', fontWeight: 600,
                        }}>
                            ⚠ {saveError}
                        </div>
                    )}

                    {/* Certified True Copy mode toggle (interactive toolbar) */}
                    <div className="lh-ctc-toolbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 32px', background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                                type="checkbox"
                                id="ctc-mode-checkbox"
                                checked={printAsCtc}
                                onChange={(e) => setPrintAsCtc(e.target.checked)}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <label htmlFor="ctc-mode-checkbox" style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#1e293b', cursor: 'pointer' }}>
                                Print as Certified True Copy (CTC)
                            </label>
                        </div>
                        {printAsCtc && (
                            <span style={{ background: '#dbeafe', color: '#1e40af', padding: '4px 12px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 'bold' }}>
                                CTC Mode Active — Printable Stamp Overlay Enabled
                            </span>
                        )}
                    </div>

                    {printAsCtc && (
                        <div className="print-ctc-watermark" style={{
                            position: 'fixed',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%) rotate(-45deg)',
                            fontSize: '4.5rem',
                            color: 'rgba(220, 38, 38, 0.12)',
                            fontWeight: 'bold',
                            border: '8px solid rgba(220, 38, 38, 0.12)',
                            padding: '16px 40px',
                            borderRadius: '16px',
                            pointerEvents: 'none',
                            zIndex: 9999,
                            whiteSpace: 'nowrap',
                            textAlign: 'center'
                        }}>
                            CERTIFIED TRUE COPY
                        </div>
                    )}

                    {/* ── Form body ── */}
                    <div className="lh-form-body">

                        {/* ══ SECTION 1: Declarant Details ══ */}
                        <div className="lh-section">
                            <div className="lh-section-title">Declarant Details</div>

                            {/* Name */}
                            <div className="lh-field" style={{ marginBottom: 14 }}>
                                <label className="lh-label">Name of Declarant</label>
                                <input
                                    id="nlh-declarant-name"
                                    className="lh-input"
                                    placeholder="e.g. Vivian V. Yanos"
                                    value={form.declarantName}
                                    onChange={(e) => set('declarantName', e.target.value)}
                                />
                            </div>

                            <div className="lh-row lh-row-2">
                                {/* Pronoun */}
                                <div className="lh-field">
                                    <label className="lh-label">Pronoun</label>
                                    <select
                                        id="nlh-pronoun"
                                        className="lh-select"
                                        value={form.pronoun}
                                        onChange={(e) => set('pronoun', e.target.value as PronounType)}
                                    >
                                        <option value="His">His</option>
                                        <option value="Her">Her</option>
                                        <option value="Their">Their</option>
                                    </select>
                                </div>

                                {/* Property / Name Count */}
                                <div className="lh-field">
                                    <label className="lh-label">Property / Name Count</label>
                                    <select
                                        id="nlh-property-count"
                                        className="lh-select"
                                        value={form.propertyCount}
                                        onChange={(e) => set('propertyCount', e.target.value as PropertyCountType)}
                                    >
                                        <option value="singular">Singular — has / property / name</option>
                                        <option value="plural">Plural — have / properties / names</option>
                                    </select>
                                </div>
                            </div>

                            {/* Live preview */}
                            <div className="lh-preview-card">
                                <div className="lh-preview-title">Certificate Text Preview</div>
                                <div className="lh-preview-body">
                                    <strong>TO WHOM IT MAY CONCERN:</strong>
                                    <br /><br />
                                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<strong>THIS IS TO CERTIFY</strong> that{' '}
                                    <span className="lh-preview-name">{namePart}</span>{' '}
                                    {bodySentence}
                                </div>
                            </div>
                        </div>

                        {/* ══ SECTION 2: Certification Details ══ */}
                        <div className="lh-section">
                            <div className="lh-section-title">Certification Details</div>

                            <div className="lh-row lh-row-3">
                                <div className="lh-field">
                                    <label className="lh-label">Date Given</label>
                                    <input
                                        id="nlh-date-given"
                                        className="lh-input"
                                        type="date"
                                        value={form.dateGiven}
                                        onChange={(e) => set('dateGiven', e.target.value)}
                                    />
                                </div>
                                <div className="lh-field">
                                    <label className="lh-label">Given At</label>
                                    <input
                                        id="nlh-given-at"
                                        className="lh-input"
                                        placeholder="e.g. Dipolog City"
                                        value={form.givenAt}
                                        onChange={(e) => set('givenAt', e.target.value)}
                                    />
                                </div>
                                <div className="lh-field">
                                    <label className="lh-label" style={{ visibility: 'hidden' }}>–</label>
                                    <div style={{
                                        background: '#eef2ff',
                                        border: '1px solid #c7d2fe',
                                        borderRadius: 8,
                                        padding: '11px 14px',
                                        fontSize: '0.88rem',
                                        color: '#29237a',
                                        fontWeight: 600,
                                        lineHeight: 1.4,
                                    }}>
                                        Given this <u><strong>{certDate.day}</strong></u> day of{' '}
                                        <u><strong>{certDate.month} {certDate.year}</strong></u>,{' '}
                                        at {form.givenAt || '________'}
                                    </div>
                                </div>
                            </div>

                            <div className="lh-field">
                                <label className="lh-label">Purpose / Intent</label>
                                <input
                                    id="nlh-purpose"
                                    className="lh-input"
                                    placeholder="for whatever legal purpose/intent it may serve best"
                                    value={form.purpose}
                                    onChange={(e) => set('purpose', e.target.value)}
                                />
                            </div>
                        </div>

                        {/* ══ SECTION 3: Signatories ══ */}
                        <div className="lh-sig-section">
                            <div className="lh-section-title" style={{ marginBottom: 0 }}>Signatories</div>
                            <div className="lh-sig-grid">

                                {/* Primary signatory */}
                                <div className="lh-sig-block">
                                    <div className="lh-field">
                                        <label className="lh-label">Primary Signatory Name</label>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <select
                                                id="nlh-primary-sig-name"
                                                className="lh-select"
                                                value={form.primarySignatoryName}
                                                onChange={(e) => set('primarySignatoryName', e.target.value)}
                                                style={{ flex: 1 }}
                                            >
                                                <option value="">-- Select --</option>
                                                {primarySignatories.map((n) => (
                                                    <option key={n} value={n}>{n}</option>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                className="lh-add-name-btn"
                                                onClick={() => {
                                                    const n = prompt('Enter new signatory name:');
                                                    if (n?.trim()) {
                                                        const t = n.trim();
                                                        if (!primarySignatories.includes(t)) {
                                                            setPrimarySignatories((prev) => [...prev, t]);
                                                        }
                                                        set('primarySignatoryName', t);
                                                    }
                                                }}
                                            >
                                                + Add
                                            </button>
                                        </div>
                                    </div>
                                    <div className="lh-field">
                                        <label className="lh-label">Primary Signatory Title</label>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <select
                                                id="nlh-primary-sig-title"
                                                className="lh-select"
                                                value={form.primarySignatoryTitle}
                                                onChange={(e) => set('primarySignatoryTitle', e.target.value)}
                                                style={{ flex: 1 }}
                                            >
                                                <option value="">-- Select Title --</option>
                                                {signatoryTitles.map((t) => (
                                                    <option key={t} value={t}>{t}</option>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                className="lh-add-name-btn"
                                                onClick={() => {
                                                    const t = prompt('Enter new signatory title:');
                                                    if (t?.trim()) {
                                                        const trimmed = t.trim();
                                                        if (!signatoryTitles.includes(trimmed)) {
                                                            setSignatoryTitles((prev) => [...prev, trimmed]);
                                                        }
                                                        set('primarySignatoryTitle', trimmed);
                                                    }
                                                }}
                                            >
                                                + Add
                                            </button>
                                        </div>
                                    </div>
                                    <div className="lh-sig-preview">
                                        <div className="lh-sig-underline" />
                                        <div className="lh-sig-preview-name">
                                            {form.primarySignatoryName || 'Signatory Name'}
                                        </div>
                                        <div className="lh-sig-preview-title">
                                            {form.primarySignatoryTitle || 'Title'}
                                        </div>
                                    </div>
                                </div>

                                {/* Secondary signatory */}
                                <div className="lh-sig-block">
                                    <div className="lh-field">
                                        <label className="lh-label">Secondary Signatory Name</label>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <select
                                                id="nlh-secondary-sig-name"
                                                className="lh-select"
                                                value={form.secondarySignatoryName}
                                                onChange={(e) => set('secondarySignatoryName', e.target.value)}
                                                style={{ flex: 1 }}
                                            >
                                                <option value="">-- Select --</option>
                                                {secondarySignatories.map((n) => (
                                                    <option key={n} value={n}>{n}</option>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                className="lh-add-name-btn"
                                                onClick={() => {
                                                    const n = prompt('Enter new signatory name:');
                                                    if (n?.trim()) {
                                                        const t = n.trim();
                                                        if (!secondarySignatories.includes(t)) {
                                                            setSecondarySignatories((prev) => [...prev, t]);
                                                        }
                                                        set('secondarySignatoryName', t);
                                                    }
                                                }}
                                            >
                                                + Add
                                            </button>
                                        </div>
                                    </div>
                                    <div className="lh-field">
                                        <label className="lh-label">Secondary Signatory Title</label>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <select
                                                id="nlh-secondary-sig-title"
                                                className="lh-select"
                                                value={form.secondarySignatoryTitle}
                                                onChange={(e) => set('secondarySignatoryTitle', e.target.value)}
                                                style={{ flex: 1 }}
                                            >
                                                <option value="">-- Select Title --</option>
                                                {signatoryTitles.map((t) => (
                                                    <option key={t} value={t}>{t}</option>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                className="lh-add-name-btn"
                                                onClick={() => {
                                                    const t = prompt('Enter new signatory title:');
                                                    if (t?.trim()) {
                                                        const trimmed = t.trim();
                                                        if (!signatoryTitles.includes(trimmed)) {
                                                            setSignatoryTitles((prev) => [...prev, trimmed]);
                                                        }
                                                        set('secondarySignatoryTitle', trimmed);
                                                    }
                                                }}
                                            >
                                                + Add
                                            </button>
                                        </div>
                                    </div>
                                    <div className="lh-sig-preview">
                                        <div className="lh-sig-underline" />
                                        <div className="lh-sig-preview-name">
                                            {form.secondarySignatoryName || 'Signatory Name'}
                                        </div>
                                        <div className="lh-sig-preview-title">
                                            {form.secondarySignatoryTitle || 'Title'}
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* ══ SECTION 4: Payment Reference ══ */}
                        <div className="lh-payment-section">
                            <div className="lh-section-title" style={{ marginBottom: 0 }}>Payment Reference</div>
                            <div className="lh-payment-grid">
                                <div className="lh-field">
                                    <label className="lh-label">Cert. Fee (Php)</label>
                                    <input
                                        id="nlh-cert-fee"
                                        className="lh-input"
                                        type="number"
                                        placeholder="e.g. 40.00"
                                        value={form.certificationFee}
                                        onChange={(e) => set('certificationFee', e.target.value)}
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                                <div className="lh-field">
                                    <label className="lh-label">O.R. No.</label>
                                    <input
                                        id="nlh-or-no"
                                        className="lh-input"
                                        placeholder="e.g. 06-29-2026"
                                        value={form.orNumber}
                                        onChange={(e) => set('orNumber', e.target.value)}
                                    />
                                </div>
                                <div className="lh-field">
                                    <label className="lh-label">Dated</label>
                                    <input
                                        id="nlh-dated"
                                        className="lh-input"
                                        type="date"
                                        value={form.dated}
                                        onChange={(e) => set('dated', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ══ Full Certificate Preview ══ */}
                        <div className="lh-section">
                            <div className="lh-section-title">Full Certificate Preview</div>
                            <div style={{
                                background: '#ffffff',
                                border: '2px solid #e2e8f0',
                                borderRadius: 12,
                                padding: '32px 40px',
                                fontFamily: "'Times New Roman', Times, serif",
                                fontSize: '0.95rem',
                                color: '#1a1a1a',
                                lineHeight: 1.8,
                            }}>
                                {/* Letterhead */}
                                <p style={{ textAlign: 'center', fontSize: '0.85rem', marginBottom: 4 }}>Republic of the Philippines</p>
                                <p style={{ textAlign: 'center', fontSize: '0.85rem', marginBottom: 4 }}>Province of Zamboanga del Norte</p>
                                <p style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: 4 }}>OFFICE OF THE PROVINCIAL ASSESSOR</p>
                                <p style={{ textAlign: 'center', fontSize: '0.82rem', marginBottom: 28 }}>GF, Provincial Capitol, Estaka, Dipolog City</p>

                                <h2 style={{ textAlign: 'center', fontWeight: 900, letterSpacing: 2, fontSize: '1.2rem', marginBottom: 32 }}>
                                    CERTIFICATE OF NO LANDHOLDING
                                </h2>

                                <p style={{ fontWeight: 'bold', marginBottom: 20 }}>TO WHOM IT MAY CONCERN:</p>

                                <p style={{ marginBottom: 28, textAlign: 'justify' }}>
                                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<strong>THIS IS TO CERTIFY</strong> that{' '}
                                    <strong style={{ textDecoration: 'underline', textTransform: 'uppercase' }}>
                                        {namePart}
                                    </strong>{' '}
                                    {bodySentence}
                                </p>

                                <p style={{ marginBottom: 48, textAlign: 'justify' }}>
                                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Given this{' '}
                                    <strong><u>{certDate.day}</u></strong> day of{' '}
                                    <strong><u>{certDate.month}, {certDate.year}</u></strong>,
                                    at {form.givenAt || '________'} {form.purpose}.
                                </p>

                                {/* Signatories — centered, stacked */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 36 }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                                            {form.primarySignatoryName || 'SIGNATORY NAME'}
                                        </div>
                                        <div style={{ fontSize: '0.85rem' }}>{form.primarySignatoryTitle || 'Title'}</div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                                            {form.secondarySignatoryName || 'SIGNATORY NAME'}
                                        </div>
                                        <div style={{ fontSize: '0.85rem' }}>{form.secondarySignatoryTitle || 'Title'}</div>
                                    </div>
                                </div>

                                {/* Payment footer */}
                                <div style={{ marginTop: 40, fontSize: '0.88rem' }}>
                                    <div>Cert. Fee &nbsp;&nbsp;: <strong><u> Php. {form.certificationFee || '________'} </u></strong></div>
                                    <div>O.R. No.: <strong><u>{form.orNumber || '________________'}</u></strong></div>
                                    <div>Dated &nbsp;&nbsp;&nbsp;: <strong><u> {form.dated || '________________'} </u></strong></div>
                                </div>
                            </div>
                        </div>

                    </div>{/* end lh-form-body */}

                    {/* ── Footer actions ── */}
                    <div className="lh-footer">
                        <div className="lh-footer-left">
                            <button
                                type="button"
                                id="nlh-btn-back"
                                className="lh-btn lh-btn-back"
                                onClick={onBack}
                            >
                                ← Back
                            </button>
                        </div>
                        <div className="lh-footer-right">
                            <button
                                type="button"
                                id="nlh-btn-print"
                                className="lh-btn lh-btn-print"
                                onClick={handlePrint}
                            >
                                🖨 Print Certificate
                            </button>
                            <button
                                type="button"
                                id="nlh-btn-draft"
                                className="lh-btn lh-btn-draft"
                                onClick={() => handleSave(false)}
                                disabled={saving}
                            >
                                {saving ? <span className="lh-spinner" /> : '💾'} Save Entry
                            </button>
                            <button
                                type="button"
                                id="nlh-btn-submit"
                                className="lh-btn lh-btn-submit"
                                onClick={() => handleSave(true)}
                                disabled={saving}
                            >
                                {saving ? <span className="lh-spinner" /> : '✓'} Finalize & Submit
                            </button>
                        </div>
                    </div>

                </div>{/* end lh-card */}
            </div>{/* end lh-page-inner */}
        </div>
    );
}
