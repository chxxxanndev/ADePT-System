import { useState, useCallback, useEffect, useRef } from 'react';
import type { User } from '../../../../auth-folder/types/auth';
import type { CompletedEntryData, TaxDeclarationFormData, AssessmentRow } from '../../../types/taxDeclaration';
import { EMPTY_TAX_DECLARATION, EMPTY_ASSESSMENT_ROW } from '../../../types/taxDeclaration';
import { taxDeclarationService } from '../../../services/taxDeclarationService';
import { requestService } from '../../../services/requestService';
import '../../../styles/TaxDeclaration.css';


const listedVerifiers = [
    "ISAGANI B. EMBOL, REA",
    "ENGR. FLORIPES R. BAEL, REA, REB",
    "JADE TECSON"
];

// ─────────────────────────────────────────────────────────────
// Utility: convert number to words (Philippine peso format)
// ─────────────────────────────────────────────────────────────
function numberToWords(num: number): string {
    if (!num || isNaN(num)) return '';
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
        'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function toWords(n: number): string {
        if (n === 0) return '';
        if (n < 20) return ones[n] + ' ';
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? '-' + ones[n % 10] : '') + ' ';
        if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred ' + toWords(n % 100);
        if (n < 1_000_000) return toWords(Math.floor(n / 1000)) + 'Thousand ' + toWords(n % 1000);
        if (n < 1_000_000_000) return toWords(Math.floor(n / 1_000_000)) + 'Million ' + toWords(n % 1_000_000);
        return toWords(Math.floor(n / 1_000_000_000)) + 'Billion ' + toWords(n % 1_000_000_000);
    }

    const intPart = Math.floor(num);
    const decPart = Math.round((num - intPart) * 100);
    let result = toWords(intPart).trim() + ' Pesos';
    if (decPart > 0) result += ' and ' + toWords(decPart).trim() + ' Centavos';
    return result + ' Only.';
}

// ─────────────────────────────────────────────────────────────
// Format number to Philippine peso display
// ─────────────────────────────────────────────────────────────
function formatPeso(val: number): string {
    return val.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────
interface TaxDeclarationFormProps {
    user: User;
    entryData: CompletedEntryData;
    onBack: () => void;
    onBackToDashboard: () => void;
    onAddAnother: () => void;
}

function SearchableSelectDropdown({
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
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const ref = useRef<HTMLDivElement>(null);

    const selected = options.find((o) => o.id === value);

    useEffect(() => {
        setQuery(selected ? selected.name : '');
    }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

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

    const filtered =
        query.trim() === ''
            ? options
            : options.filter((o) => o.name.toLowerCase().includes(query.trim().toLowerCase()));

    const handleSelect = (opt: { id: string; name: string }) => {
        onChange(opt.id);
        setQuery(opt.name);
        setOpen(false);
    };

    return (
        <div className="custom-select" ref={ref} style={{ position: 'relative' }}>
            <input
                className="td-input"
                type="text"
                placeholder={placeholder}
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setOpen(true);
                    if (selected && e.target.value !== selected.name) onChange('');
                }}
                onFocus={() => setOpen(true)}
            />
            {open && (
                <div className="custom-select-menu">
                    {filtered.length === 0 && <div className="custom-select-empty">No matches found</div>}
                    {filtered.map((opt) => (
                        <div key={opt.id} className="custom-select-option" onClick={() => handleSelect(opt)}>
                            {opt.name}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Sub-component: Assessment Row
// ─────────────────────────────────────────────────────────────
function AssessmentRowItem({
    row,
    onUpdate,
    onRemove,
    canRemove,
    classificationOptions,
    propertyTypeOptions,
}: {
    row: AssessmentRow;
    onUpdate: (id: string, field: keyof AssessmentRow, value: string) => void;
    onRemove: (id: string) => void;
    canRemove: boolean;
    classificationOptions: { id: string; label: string; code: string }[];
    propertyTypeOptions: { id: string; label: string; code: string }[];
}) {
    const mv = parseFloat(row.marketValue) || 0;
    const al = parseFloat(row.assessmentLevel) || 0;
    const av = (mv * al) / 100;

    return (
        <tr>
            <td>
                <select
                    className="td-select"
                    value={row.kindOfProperty}
                    onChange={(e) => onUpdate(row.id, 'kindOfProperty', e.target.value)}
                >
                    <option value="">-- Select Kind --</option>
                    {propertyTypeOptions.map((opt) => (
                        <option key={opt.id} value={opt.code}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            </td>
            <td>
                <select
                    className="td-select"
                    value={row.classificationId || row.classificationLabel}
                    onChange={(e) => {
                        const val = e.target.value;
                        const matched = classificationOptions.find((o) => o.id === val || o.code === val);
                        if (matched) {
                            onUpdate(row.id, 'classificationId', matched.id);
                            onUpdate(row.id, 'classificationLabel', matched.label);
                        } else {
                            onUpdate(row.id, 'classificationId', '');
                            onUpdate(row.id, 'classificationLabel', val);
                        }
                    }}
                >
                    <option value="">-- Select Classification --</option>
                    {classificationOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            </td>
            <td className="td-table-input-right">
                <input
                    className="td-input"
                    type="number"
                    placeholder="0.00"
                    value={row.marketValue}
                    onChange={(e) => onUpdate(row.id, 'marketValue', e.target.value)}
                    min="0"
                    step="0.01"
                />
            </td>
            <td className="td-table-input-right">
                <input
                    className="td-input"
                    type="number"
                    placeholder="%"
                    value={row.assessmentLevel}
                    onChange={(e) => onUpdate(row.id, 'assessmentLevel', e.target.value)}
                    min="0"
                    max="100"
                    step="0.01"
                />
            </td>
            <td className="td-table-input-right">
                <input
                    className="td-input"
                    readOnly
                    value={av > 0 ? formatPeso(av) : ''}
                    placeholder="Auto-calc"
                />
            </td>
            <td>
                <input
                    className="td-input"
                    placeholder="has."
                    value={row.area}
                    onChange={(e) => onUpdate(row.id, 'area', e.target.value)}
                />
            </td>
            <td>
                <button
                    type="button"
                    className="td-row-remove-btn"
                    onClick={() => onRemove(row.id)}
                    disabled={!canRemove}
                    title="Remove row"
                >
                    ✕
                </button>
            </td>
        </tr>
    );
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export function TaxDeclarationForm({ user, entryData, onBack, onBackToDashboard, onAddAnother }: TaxDeclarationFormProps) {
    const [form, setForm] = useState<TaxDeclarationFormData>(() => ({
        ...EMPTY_TAX_DECLARATION(),
        // Pre-fill from request entry data
        ownerName: entryData.declarantName || '',
    }));

    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState('');

    const [metadata, setMetadata] = useState<{
        classifications: { id: string; label: string; code: string }[];
        propertyTypes: { id: string; label: string; code: string }[];
        barangays: { id: string; name: string; municipality_id: string }[];
        municipalities: { id: string; name: string }[];
    }>({
        classifications: [],
        propertyTypes: [],
        barangays: [],
        municipalities: [],
    });

    const [signatories, setSignatories] = useState<string[]>([
        'ENGR. FLORIPES R. BAEL, REA, REB',
        'ISAGANI B. EMBOL, REA',
        'JADE TECSON'
    ]);

    const [signatoryTitles, setSignatoryTitles] = useState<string[]>([
        'Local Assessment Operations Officer IV',
        'Municipal Assessor',
        'Provincial Assessor',
        'Assistant Provincial Assessor',
        'OIC - Provincial Assessor'
    ]);

    useEffect(() => {
        let isMounted = true;
        const fetchMeta = async () => {
            try {
                const data = await requestService.getMetadata();
                if (isMounted && data) {
                    setMetadata({
                        classifications: Array.isArray(data.classifications)
                            ? data.classifications.map((c: any) => ({ id: c.id, label: c.name, code: c.code }))
                            : [],
                        propertyTypes: Array.isArray(data.propertyTypes)
                            ? data.propertyTypes.map((p: any) => ({ id: p.id, label: p.name, code: p.code }))
                            : [],
                        barangays: Array.isArray(data.barangays) ? data.barangays : [],
                        municipalities: Array.isArray(data.municipalities) ? data.municipalities : [],
                    });
                }
            } catch (err) {
                console.error('Failed to fetch tax declaration metadata', err);
            }
        };
        fetchMeta();
        return () => { isMounted = false; };
    }, []);

    const classificationOptions = metadata.classifications.length > 0 ? metadata.classifications : [
        { id: 'AGRICULTURAL', label: 'Agricultural', code: 'AGRICULTURAL' },
        { id: 'RESIDENTIAL', label: 'Residential', code: 'RESIDENTIAL' },
        { id: 'COMMERCIAL', label: 'Commercial', code: 'COMMERCIAL' },
        { id: 'INDUSTRIAL', label: 'Industrial', code: 'INDUSTRIAL' },
        { id: 'SPECIAL', label: 'Special', code: 'SPECIAL' }
    ];

    const propertyTypeOptions = metadata.propertyTypes.length > 0 ? metadata.propertyTypes : [
        { id: 'LAND', label: 'Land', code: 'LAND' },
        { id: 'BUILDING', label: 'Building', code: 'BUILDING' },
        { id: 'MACHINERY', label: 'Machinery', code: 'MACHINERY' },
        { id: 'OTHERS', label: 'Others', code: 'OTHERS' }
    ];

    // ── Derived totals (auto-calculate whenever assessment rows change) ──
    const totalMarketValue = form.assessmentRows.reduce(
        (sum, r) => sum + (parseFloat(r.marketValue) || 0), 0
    );
    const totalAssessedValue = form.assessmentRows.reduce((sum, r) => {
        const mv = parseFloat(r.marketValue) || 0;
        const al = parseFloat(r.assessmentLevel) || 0;
        return sum + (mv * al) / 100;
    }, 0);
    const amountInWords = numberToWords(totalAssessedValue);

    useEffect(() => {
        setForm((prev) => ({ ...prev, totalMarketValue, totalAssessedValue, amountInWords }));
    }, [totalMarketValue, totalAssessedValue, amountInWords]);

    // ── Form field helpers ──
    const set = (field: keyof TaxDeclarationFormData, value: string) =>
        setForm((prev) => ({ ...prev, [field]: value }));

    const updateRow = useCallback((id: string, field: keyof AssessmentRow, value: string) => {
        setForm((prev) => ({
            ...prev,
            assessmentRows: prev.assessmentRows.map((r) =>
                r.id === id ? { ...r, [field]: value } : r
            ),
        }));
    }, []);

    const addRow = () =>
        setForm((prev) => ({ ...prev, assessmentRows: [...prev.assessmentRows, EMPTY_ASSESSMENT_ROW()] }));

    const removeRow = (id: string) =>
        setForm((prev) => ({
            ...prev,
            assessmentRows: prev.assessmentRows.filter((r) => r.id !== id),
        }));

    // ── Save / Submit ──
    const handleSave = async (action: 'draft' | 'finalize' | 'add_another') => {
        // ... keep your validation checks here ...

        setSaving(true);
        try {
            // Save Document to database
            await taxDeclarationService.save(
                { ...form, taxability: form.taxability },
                entryData.requestId,
                user.id,
            );

            // SETBACK 5 FIXED (Zombie Drafts):
            // If finalizing, update the parent request status to PENDING_PAYMENT
            if (action !== 'draft') {
                await requestService.updateRequest(entryData.requestId, {
                    declarantName: entryData.declarantName,
                    requestedByName: entryData.requestedByName,
                    requestDate: entryData.requestDate,
                    authRequired: entryData.authRequired,
                    purposeId: entryData.purposeId,
                    documentTypeIds: entryData.documentTypeIds,
                    actionTaken: entryData.actionTaken,
                    status: 'PENDING_PAYMENT'
                });
            }

            setSaved(true);
            setTimeout(() => {
                if (action === 'finalize') onBackToDashboard();
                else if (action === 'add_another') onAddAnother();
            }, 1500);
        } catch (err: any) {
            setSaveError(err?.response?.data?.error || 'Failed to save. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handlePrint = () => window.print();

    const isCustom = form.verifiedBy !== '' && !listedVerifiers.includes(form.verifiedBy);
    const selectVerifierValue = isCustom ? 'other' : (form.verifiedBy || '');

    // ─────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────
    return (
        <div className="td-page">
            <div className="td-page-inner">
                <div className="td-card">

                    {/* ── Card header ── */}
                    <div className="td-card-header">
                        <div className="td-card-header-left">
                            <h2 className="td-card-title">Declaration of Real Property</h2>
                            <span className="td-card-subtitle">
                                Province of Zamboanga del Norte · Office of the Provincial Assessor
                            </span>
                        </div>
                        <span className="td-ref-chip">{entryData.referenceNumber}</span>
                    </div>

                    {/* ── Success banner ── */}
                    {saved && (
                        <div className="td-success-banner">
                            <span className="td-success-icon">✓</span>
                            <div className="td-success-text">
                                <strong>Tax Declaration saved successfully!</strong>
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

                    {/* ── Document header — mimics top of official form ── */}
                    <div className="td-doc-header">
                        <div className="td-doc-header-row">
                            <div className="td-doc-header-field">
                                <label>Assessment of Real Property No.:</label>
                                <input
                                    id="td-arp-no"
                                    className="td-input"
                                    placeholder="e.g. 21-0004-00082"
                                    value={form.taxDeclarationNumber}
                                    onChange={(e) => set('taxDeclarationNumber', e.target.value)}
                                />
                            </div>
                            <div className="td-doc-header-field">
                                <label>Property Index No.:</label>
                                <input
                                    id="td-pin"
                                    className="td-input"
                                    placeholder="e.g. 050-21-0004-002-30"
                                    value={form.propertyIndexNumber}
                                    onChange={(e) => set('propertyIndexNumber', e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="td-doc-title">Declaration of Real Property</div>
                    </div>

                    {/* ── Form body ── */}
                    <div className="td-form-body">

                        {/* ══ SECTION 1: Owner Information ══ */}
                        <div className="td-section">
                            <div className="td-section-title">Owner Information</div>

                            <div className="td-row td-row-2">
                                <div className="td-field">
                                    <label className="td-label">Owner</label>
                                    <input
                                        id="td-owner-name"
                                        className="td-input"
                                        placeholder="Full name of owner"
                                        value={form.ownerName}
                                        onChange={(e) => set('ownerName', e.target.value)}
                                    />
                                </div>
                                <div className="td-field">
                                    <label className="td-label">Address</label>
                                    <input
                                        id="td-owner-address"
                                        className="td-input"
                                        placeholder="e.g. Pob. Sibutad, ZN"
                                        value={form.ownerAddress}
                                        onChange={(e) => set('ownerAddress', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="td-row td-row-2">
                                <div className="td-field">
                                    <label className="td-label">Administrator <span className="td-label-sub">(if applicable)</span></label>
                                    <input
                                        id="td-admin-name"
                                        className="td-input"
                                        placeholder="Full name of administrator"
                                        value={form.administratorName}
                                        onChange={(e) => set('administratorName', e.target.value)}
                                    />
                                </div>
                                <div className="td-field">
                                    <label className="td-label">Administrator Address</label>
                                    <input
                                        id="td-admin-address"
                                        className="td-input"
                                        placeholder="Administrator's address"
                                        value={form.administratorAddress}
                                        onChange={(e) => set('administratorAddress', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ══ SECTION 2: Location of Property ══ */}
                        <div className="td-section">
                            <div className="td-section-title">Location of Property</div>

                            <div className="td-location-strip">
                                <div className="td-location-cell">
                                    <SearchableSelectDropdown
                                        options={metadata.barangays
                                            .filter((b) => !form.municipalityId || b.municipality_id === form.municipalityId)
                                            .map((b) => ({ id: b.id, name: b.name }))}
                                        value={form.barangayId}
                                        onChange={(val) => setForm((prev) => ({ ...prev, barangayId: val }))}
                                        placeholder="Select Barangay"
                                    />
                                    <span className="td-location-sub">(Barangay)</span>
                                </div>
                                <div className="td-location-cell">
                                    <SearchableSelectDropdown
                                        options={metadata.municipalities.map((m) => ({ id: m.id, name: m.name }))}
                                        value={form.municipalityId}
                                        onChange={(val) =>
                                            setForm((prev) => ({ ...prev, municipalityId: val, barangayId: '' }))
                                        }
                                        placeholder="Select Municipality"
                                    />
                                    <span className="td-location-sub">(Municipality)</span>
                                </div>
                                <div className="td-location-cell td-province-fixed">
                                    <input className="td-input" readOnly value="ZAMBOANGA DEL NORTE" />
                                    <span className="td-location-sub">(Province)</span>
                                </div>
                            </div>
                        </div>

                        {/* ══ SECTION 3: Land Reference ══ */}
                        <div className="td-section">
                            <div className="td-section-title">Land Reference Numbers</div>
                            <div className="td-row td-row-4">
                                <div className="td-field">
                                    <label className="td-label">OCT/TCT/CLOA No.</label>
                                    <input
                                        id="td-oct-tct"
                                        className="td-input"
                                        placeholder="e.g. T-72142"
                                        value={form.octTctNumber}
                                        onChange={(e) => set('octTctNumber', e.target.value)}
                                    />
                                </div>
                                <div className="td-field">
                                    <label className="td-label">Survey No.</label>
                                    <input
                                        id="td-survey-no"
                                        className="td-input"
                                        placeholder="Survey number"
                                        value={form.surveyNumber}
                                        onChange={(e) => set('surveyNumber', e.target.value)}
                                    />
                                </div>
                                <div className="td-field">
                                    <label className="td-label">Lot No.</label>
                                    <input
                                        id="td-lot-no"
                                        className="td-input"
                                        placeholder="e.g. 3979-H"
                                        value={form.lotNumber}
                                        onChange={(e) => set('lotNumber', e.target.value)}
                                    />
                                </div>
                                <div className="td-field">
                                    <label className="td-label">Blk. No.</label>
                                    <input
                                        id="td-blk-no"
                                        className="td-input"
                                        placeholder="Block no."
                                        value={form.blockNumber}
                                        onChange={(e) => set('blockNumber', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ══ SECTION 4: Boundaries ══ */}
                        <div className="td-section">
                            <div className="td-section-title">Boundaries</div>
                            <div className="td-boundaries-box">
                                <div className="td-boundaries-note">
                                    State streets, streams or PIN by bounded, or names of owner of adjoining lands.
                                </div>
                                <div className="td-boundaries-grid">
                                    <div className="td-field">
                                        <label className="td-label">North</label>
                                        <textarea
                                            id="td-north"
                                            className="td-input"
                                            rows={2}
                                            placeholder="e.g. NW: ALONG LINES 2-3-4-5-6-7-8 BY LOT NO. 31-F-1-K, PSD-09-069818"
                                            value={form.boundaryNorth}
                                            onChange={(e) => set('boundaryNorth', e.target.value)}
                                        />
                                    </div>
                                    <div className="td-field">
                                        <label className="td-label">South</label>
                                        <textarea
                                            id="td-south"
                                            className="td-input"
                                            rows={2}
                                            placeholder="e.g. S: ALONG LINES 9-10-11 BY LOT NO. 31-F-1-L"
                                            value={form.boundarySouth}
                                            onChange={(e) => set('boundarySouth', e.target.value)}
                                        />
                                    </div>
                                    <div className="td-field">
                                        <label className="td-label">East</label>
                                        <textarea
                                            id="td-east"
                                            className="td-input"
                                            rows={2}
                                            placeholder="e.g. E: ALONG LINE 8-9 BY ROAD"
                                            value={form.boundaryEast}
                                            onChange={(e) => set('boundaryEast', e.target.value)}
                                        />
                                    </div>
                                    <div className="td-field">
                                        <label className="td-label">West</label>
                                        <textarea
                                            id="td-west"
                                            className="td-input"
                                            rows={2}
                                            placeholder="e.g. W: ALONG LINE 1-2 BY CREEK"
                                            value={form.boundaryWest}
                                            onChange={(e) => set('boundaryWest', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ══ SECTION 5: Kind of Property & Valuation ══ */}
                        <div className="td-assessment-section">
                            <div className="td-table-header-bar">
                                <span>Kind of Property &amp; Valuation</span>
                                <button
                                    type="button"
                                    className="td-add-row-btn"
                                    onClick={addRow}
                                >
                                    + Add Row
                                </button>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="td-assessment-table">
                                    <thead>
                                        <tr>
                                            <th style={{ minWidth: 140 }}>Kind of Property</th>
                                            <th style={{ minWidth: 160 }}>Classification</th>
                                            <th className="td-th-right" style={{ minWidth: 120 }}>Market Value (₱)</th>
                                            <th className="td-th-right" style={{ minWidth: 100 }}>Assess. Level (%)</th>
                                            <th className="td-th-right" style={{ minWidth: 120 }}>Assessed Value (₱)</th>
                                            <th style={{ minWidth: 90 }}>Area</th>
                                            <th style={{ width: 40 }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {form.assessmentRows.map((row) => (
                                            <AssessmentRowItem
                                                key={row.id}
                                                row={row}
                                                onUpdate={updateRow}
                                                onRemove={removeRow}
                                                canRemove={form.assessmentRows.length > 1}
                                                classificationOptions={classificationOptions}
                                                propertyTypeOptions={propertyTypeOptions}
                                            />
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colSpan={2} className="td-total-label">TOTAL</td>
                                            <td className="td-total-value">₱ {formatPeso(totalMarketValue)}</td>
                                            <td></td>
                                            <td className="td-total-value">₱ {formatPeso(totalAssessedValue)}</td>
                                            <td colSpan={2}></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        {/* ══ Total Assessed Value + Taxability ══ */}
                        <div className="td-summary-row">
                            <div className="td-amount-words-block">
                                <span className="td-amount-words-label">
                                    Total Assessed Value <span className="td-amount-words-sub">(Amount in Words)</span>
                                </span>
                                <div className="td-amount-words-value">
                                    {amountInWords || <span style={{ color: '#94a3b8', fontStyle: 'italic', fontWeight: 400 }}>Auto-generated from totals above…</span>}
                                </div>
                            </div>
                            <div className="td-taxability-block">
                                <span className="td-taxability-label">Taxability</span>
                                <div className="td-taxability-toggle">
                                    <button
                                        type="button"
                                        id="td-taxable-btn"
                                        className={`td-taxability-btn ${form.taxability === 'TAXABLE' ? 'active-taxable' : ''}`}
                                        onClick={() => set('taxability', 'TAXABLE')}
                                    >
                                        <span>{form.taxability === 'TAXABLE' ? '✓' : '☐'}</span>
                                        Taxable
                                    </button>
                                    <button
                                        type="button"
                                        id="td-exempt-btn"
                                        className={`td-taxability-btn ${form.taxability === 'EXEMPT' ? 'active-exempt' : ''}`}
                                        onClick={() => set('taxability', 'EXEMPT')}
                                    >
                                        <span>{form.taxability === 'EXEMPT' ? '✓' : '☐'}</span>
                                        Exempt
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ══ SECTION 6: Tax Effectivity & ARP Cancellation ══ */}
                        <div className="td-section">
                            <div className="td-section-title">Tax Effectivity &amp; Cancellation</div>
                            <div className="td-row td-row-2">
                                <div className="td-field">
                                    <label className="td-label">Tax Effectivity Year</label>
                                    <input
                                        id="td-effectivity-year"
                                        className="td-input"
                                        type="number"
                                        placeholder="e.g. 2021"
                                        value={form.effectivityYear}
                                        onChange={(e) => set('effectivityYear', e.target.value)}
                                        min="1900"
                                        max="2100"
                                    />
                                </div>
                                <div className="td-field">
                                    <label className="td-label">This Declaration Cancels ARP No.</label>
                                    <input
                                        id="td-cancels-arp"
                                        className="td-input"
                                        placeholder="e.g. 21-00004-00074"
                                        value={form.arpNumber}
                                        onChange={(e) => set('arpNumber', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="td-field">
                                <label className="td-label">Memoranda</label>
                                <textarea
                                    id="td-memoranda"
                                    className="td-input"
                                    rows={3}
                                    placeholder="e.g. Revised Under Provincial Ordinance No. ZN-19-183…"
                                    value={form.memoranda}
                                    onChange={(e) => set('memoranda', e.target.value)}
                                />
                            </div>
                        </div>

                        {/* ══ SECTION 7: Verified By ══ */}
                        <div className="td-section">
                            <div className="td-section-title">Verification &amp; Approval</div>
                            <div className="td-verified-row">
                                <div className="td-field" style={{ flex: 1, minWidth: '240px' }}>
                                    <label className="td-label">Verified By Name</label>
                                    <select
                                        id="td-verified-by-select"
                                        className="td-select"
                                        value={selectVerifierValue}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === 'other') {
                                                set('verifiedBy', '');
                                            } else {
                                                set('verifiedBy', val);
                                            }
                                        }}
                                    >
                                        <option value="">-- Select Verifying Officer --</option>
                                        {listedVerifiers.map(name => (
                                            <option key={name} value={name}>{name}</option>
                                        ))}
                                        <option value="other">Other (Type custom name...)</option>
                                    </select>
                                    {selectVerifierValue === 'other' && (
                                        <input
                                            id="td-verified-by"
                                            className="td-input"
                                            style={{ marginTop: '8px' }}
                                            placeholder="Type name of verifying officer"
                                            value={form.verifiedBy}
                                            onChange={(e) => set('verifiedBy', e.target.value)}
                                        />
                                    )}
                                </div>
                                <div className="td-field" style={{ flex: 1, minWidth: '240px' }}>
                                    <label className="td-label">Verified By Title</label>
                                    <select
                                        id="td-verified-by-title"
                                        className="td-select"
                                        value={form.verifiedByTitle || 'Municipal Assessor'}
                                        onChange={(e) => set('verifiedByTitle', e.target.value)}
                                    >
                                        <option value="Municipal Assessor">Municipal Assessor</option>
                                        <option value="Provincial Assessor">Provincial Assessor</option>
                                    </select>
                                </div>
                                <div className="td-sig-line">
                                    <div className="td-sig-underline" />
                                    <span className="td-sig-name">{form.verifiedBy ? `(SGD) ${form.verifiedBy.toUpperCase()}` : ''}</span>
                                    <span className="td-sig-role">{form.verifiedByTitle || 'Municipal Assessor'}</span>
                                </div>
                            </div>
                        </div>

                        {/* ══ SECTION 8: Certified Copy & Payment ══ */}
                        <div className="td-cert-section">
                            <div className="td-section-title" style={{ marginBottom: 16 }}>Certified Copy &amp; Payment</div>
                            <div className="td-cert-grid">
                                {/* Left: Authorized Signatory */}
                                <div>
                                    <div style={{ marginBottom: 10 }}>
                                        <label className="td-label">Certified copy:</label>
                                    </div>
                                    <div className="td-signatory-block">
                                        <div className="td-field" style={{ marginBottom: 8 }}>
                                            <label className="td-label">Authorized Signatory Name</label>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <select
                                                    id="td-cert-name"
                                                    className="td-select"
                                                    value={form.certifiedCopyName}
                                                    onChange={(e) => set('certifiedCopyName', e.target.value)}
                                                    style={{ flex: 1 }}
                                                >
                                                    <option value="">-- Select Signatory --</option>
                                                    {signatories.map(name => (
                                                        <option key={name} value={name}>{name}</option>
                                                    ))}
                                                </select>
                                                <button
                                                    type="button"
                                                    className="td-btn"
                                                    onClick={() => {
                                                        const newName = prompt("Enter new Authorized Signatory Name:");
                                                        if (newName && newName.trim()) {
                                                            const trimmed = newName.trim();
                                                            if (!signatories.includes(trimmed)) {
                                                                setSignatories(prev => [...prev, trimmed]);
                                                            }
                                                            set('certifiedCopyName', trimmed);
                                                        }
                                                    }}
                                                    style={{
                                                        padding: '0 12px',
                                                        background: '#29237a',
                                                        color: '#fff',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 600,
                                                        whiteSpace: 'nowrap',
                                                        height: '38px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    + Add Name
                                                </button>
                                            </div>
                                        </div>
                                        <div className="td-field" style={{ marginBottom: 8 }}>
                                            <label className="td-label">Title</label>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <select
                                                    id="td-cert-title"
                                                    className="td-select"
                                                    value={form.certifiedCopyTitle}
                                                    onChange={(e) => set('certifiedCopyTitle', e.target.value)}
                                                    style={{ flex: 1 }}
                                                >
                                                    <option value="">-- Select Title --</option>
                                                    {signatoryTitles.map(t => (
                                                        <option key={t} value={t}>{t}</option>
                                                    ))}
                                                </select>
                                                <button
                                                    type="button"
                                                    className="td-btn"
                                                    onClick={() => {
                                                        const newTitle = prompt("Enter new Signatory Title:");
                                                        if (newTitle && newTitle.trim()) {
                                                            const trimmed = newTitle.trim();
                                                            if (!signatoryTitles.includes(trimmed)) {
                                                                setSignatoryTitles(prev => [...prev, trimmed]);
                                                            }
                                                            set('certifiedCopyTitle', trimmed);
                                                        }
                                                    }}
                                                    style={{
                                                        padding: '0 12px',
                                                        background: '#29237a',
                                                        color: '#fff',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 600,
                                                        whiteSpace: 'nowrap',
                                                        height: '38px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    + Add Title
                                                </button>
                                            </div>
                                        </div>
                                        <div className="td-field">
                                            <label className="td-label">Designation</label>
                                            <input
                                                id="td-cert-desig"
                                                className="td-input"
                                                value={form.certifiedCopyDesignation}
                                                onChange={(e) => set('certifiedCopyDesignation', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Fee & OR */}
                                <div className="td-cert-fields">
                                    <div className="td-field">
                                        <label className="td-label">Certification Fee (₱)</label>
                                        <input
                                            id="td-cert-fee"
                                            className="td-input"
                                            type="number"
                                            placeholder="e.g. 40.00"
                                            value={form.certificationFee}
                                            onChange={(e) => set('certificationFee', e.target.value)}
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                    <div className="td-field">
                                        <label className="td-label">O.R. No.</label>
                                        <input
                                            id="td-or-no"
                                            className="td-input"
                                            placeholder="e.g. 1123971"
                                            value={form.orNumber}
                                            onChange={(e) => set('orNumber', e.target.value)}
                                        />
                                    </div>
                                    <div className="td-field">
                                        <label className="td-label">Date Paid</label>
                                        <input
                                            id="td-date-paid"
                                            className="td-input"
                                            type="date"
                                            value={form.datePaid}
                                            onChange={(e) => set('datePaid', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ══ Important Notice (matches bottom of official form) ══ */}
                        <div className="td-important-notice">
                            <strong>IMPORTANT:</strong> This declaration is issued only in connection with real property taxation
                            and the valuation indicated herein is based on a schedule of market values prepared for the purpose.
                            It should <em>not</em> be considered as title to the property.
                        </div>

                    </div>{/* end td-form-body */}

                    {/* ── Footer actions ── */}
                    <div className="td-footer">
                        <div className="td-footer-left">
                            <button
                                type="button"
                                id="td-btn-back"
                                className="td-btn td-btn-back"
                                onClick={onBack}
                            >
                                ← Back
                            </button>
                        </div>
                        <div className="td-footer-right">
                            <button type="button" className="td-btn td-btn-print" onClick={handlePrint}>
                                🖨 Print Document
                            </button>
                            <button type="button" className="td-btn td-btn-draft" onClick={() => handleSave('draft')} disabled={saving}>
                                {saving ? <span className="td-spinner" /> : '💾'} Save Draft
                            </button>
                            {/* ✅ NEW ADD ANOTHER BUTTON */}
                            <button type="button" className="td-btn td-btn-add-another" onClick={() => handleSave('add_another')} disabled={saving}>
                                {saving ? <span className="td-spinner" /> : '➕'} Submit & Add Another
                            </button>
                            <button type="button" className="td-btn td-btn-submit" onClick={() => handleSave('finalize')} disabled={saving}>
                                {saving ? <span className="td-spinner" /> : '✓'} Finalize & Submit
                            </button>
                        </div>
                    </div>

                </div>{/* end td-card */}
            </div>{/* end td-page-inner */}
        </div>
    );
}
