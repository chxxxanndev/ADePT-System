import { useState, useCallback, useEffect } from 'react';
import type { User } from '../../../../auth-folder/types/auth';
import type { CompletedEntryData, TaxDeclarationFormData, AssessmentRow } from '../../../types/taxDeclaration';
import { EMPTY_TAX_DECLARATION, EMPTY_ASSESSMENT_ROW } from '../../../types/taxDeclaration';
import { taxDeclarationService } from '../../../services/taxDeclarationService';
import { requestService } from '../../../services/requestService';
import { useCart } from '../../../hooks/TransactionCartContext';
import '../../../styles/TaxDeclaration.css';
import {
    XIcon,
    CheckCircleIcon,
    AlertTriangleIcon,
    PlusIcon,
    ClipboardListIcon,
    CheckIcon,
    SquareIcon,
} from '../../../components/icons';
import { TransactionProgressPanel } from '../../../components/TransactionProgressPanel';

// 1. HELPER FUNCTIONS
function numberToWords(num: number): string {
    if (!num || isNaN(num)) return '';
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
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

function formatPeso(val: number): string {
    return val.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Rounds an assessed value to the nearest ₱10 (round-half-up), matching
// the province's official Declaration of Real Property form convention.
function calcAssessedValue(marketValue: number, assessmentLevel: number): number {
    const raw = (marketValue * assessmentLevel) / 100;
    return Math.round(raw / 10) * 10;
}

// ── Total Area (document-level, single field, not addable) ──
//
// IMPORTANT (FIX): the "Total Land Area" the user types here CANNOT be
// persisted on the tax declaration row — encoded_tax_declarations has no
// `area` column in the schema (verified against the live Supabase DB:
// selecting `area` returns HTTP 400 "column not found"). The only place
// an area can be stored is per-assessment-row (encoded_assessment_rows.
// area / area_unit), and the preview/generation read path
// (taxDeclarationService.getTaxDeclaration) derives the printed area from
// the SUM of the per-row areas.
//
// So on save (handleSave) the total is pushed onto the FIRST assessment
// row; on load (hydrateFromBackend) the form's field is re-derived from
// the rows. Without this round-trip the value typed here was silently
// dropped, which is why the area never appeared in the Initial Document
// Preview or the Document Generation & Release PDF (and only showed up
// after typing it again per-row in the Full Document Edit modal).
const AREA_UNIT_LABELS: Record<'has.' | 'sqm.', string> = {
    'has.': 'HECTARE',
    'sqm.': 'SQ.M.',
};

// Maps whatever unit string came back from the database ('HECTARE' /
// 'SQM' enum values, or 'has.' / 'sqm.') back to the form's internal
// 'has.' | 'sqm.' literal.
function dbUnitToFormUnit(raw: string | null | undefined): 'has.' | 'sqm.' {
    return /sq/i.test(String(raw || '')) ? 'sqm.' : 'has.';
}

function formatAreaString(value: string, unit: 'has.' | 'sqm.'): string {
    if (!value) return '';
    return `${value} ${AREA_UNIT_LABELS[unit] || unit}`;
}

// ── Sentinel used to represent "Others (specify)" selection ──
const OTHERS_SENTINEL = '__OTHERS__';

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
    const av = calcAssessedValue(mv, al);

    const knownPropertyCodes = propertyTypeOptions.map((o) => o.code);
    const isKindOthers =
        row.kindOfProperty === OTHERS_SENTINEL ||
        (!!row.kindOfProperty && !knownPropertyCodes.includes(row.kindOfProperty));

    const knownClassIds = classificationOptions.map((o) => o.id);
    const isClassOthers =
        row.classificationId === OTHERS_SENTINEL ||
        (!!row.classificationLabel && !knownClassIds.includes(row.classificationId));

    const kindSelectValue = isKindOthers ? OTHERS_SENTINEL : (row.kindOfProperty || '');
    const classSelectValue = isClassOthers ? OTHERS_SENTINEL : (row.classificationId || '');
    const kindOtherText = row.kindOfProperty === OTHERS_SENTINEL ? '' : (isKindOthers ? row.kindOfProperty : '');

    return (
        <tr>
            {/* ── Kind of Property: swaps to text input when Others is active ── */}
            <td>
                {isKindOthers ? (
                    <input
                        className="td-input"
                        type="text"
                        placeholder="Specify kind of property…"
                        value={kindOtherText}
                        onChange={(e) => onUpdate(row.id, 'kindOfProperty', e.target.value || OTHERS_SENTINEL)}
                        autoFocus
                        onBlur={(e) => {
                            // If they blur with nothing typed, snap back to the dropdown
                            if (!e.target.value.trim()) onUpdate(row.id, 'kindOfProperty', '');
                        }}
                    />
                ) : (
                    <select
                        className="td-select"
                        value={kindSelectValue}
                        onChange={(e) => {
                            const val = e.target.value;
                            onUpdate(row.id, 'kindOfProperty', val === OTHERS_SENTINEL ? OTHERS_SENTINEL : val);
                        }}
                    >
                        <option value="">-- Select Kind --</option>
                        {propertyTypeOptions.map((opt) => (
                            <option key={opt.id} value={opt.code}>{opt.label}</option>
                        ))}
                        <option value={OTHERS_SENTINEL}>Others (specify)</option>
                    </select>
                )}
            </td>

            {/* ── Classification: same swap pattern ── */}
            <td>
                {isClassOthers ? (
                    <input
                        className="td-input"
                        type="text"
                        placeholder="Specify classification…"
                        value={row.classificationLabel || ''}
                        onChange={(e) => {
                            onUpdate(row.id, 'classificationLabel', e.target.value);
                            onUpdate(row.id, 'classificationId', OTHERS_SENTINEL);
                        }}
                        autoFocus
                        onBlur={(e) => {
                            // If they blur with nothing typed, snap back to the dropdown
                            if (!e.target.value.trim()) {
                                onUpdate(row.id, 'classificationId', '');
                                onUpdate(row.id, 'classificationLabel', '');
                            }
                        }}
                    />
                ) : (
                    <select
                        className="td-select"
                        value={classSelectValue}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === OTHERS_SENTINEL) {
                                onUpdate(row.id, 'classificationId', OTHERS_SENTINEL);
                                onUpdate(row.id, 'classificationLabel', '');
                            } else {
                                const matched = classificationOptions.find((o) => o.id === val);
                                if (matched) {
                                    onUpdate(row.id, 'classificationId', matched.id);
                                    onUpdate(row.id, 'classificationLabel', matched.label);
                                }
                            }
                        }}
                    >
                        <option value="">-- Select Classification --</option>
                        {classificationOptions.map((opt) => (
                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                        <option value={OTHERS_SENTINEL}>Others (specify)</option>
                    </select>
                )}
            </td>

            <td className="td-table-input-right">
                <input className="td-input" type="number" placeholder="0.00" value={row.marketValue}
                    onChange={(e) => onUpdate(row.id, 'marketValue', e.target.value)} min="0" step="0.01" />
            </td>
            <td className="td-table-input-right">
                <input className="td-input" type="number" placeholder="%" value={row.assessmentLevel}
                    onChange={(e) => onUpdate(row.id, 'assessmentLevel', e.target.value)} min="0" max="100" step="0.01" />
            </td>
            <td className="td-table-input-right">
                <input className="td-input" readOnly value={av > 0 ? formatPeso(av) : ''} placeholder="Auto-calc" />
            </td>
            <td>
                <button type="button" className="td-row-remove-btn" onClick={() => onRemove(row.id)}
                    disabled={!canRemove} title="Remove row">
                    <XIcon size={13} />
                </button>
            </td>
        </tr>
    );
}

// 2. PROPS
interface TaxDeclarationFormProps {
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

export function TaxDeclarationForm({
    user,
    entryData,
    onDiscard,
    onDiscardToSummary,
    onAddAnotherAfterDiscard,
    onAddAnother,
    onGoToSummary,
}: TaxDeclarationFormProps) {
    // ═══ ALL HOOKS MUST RUN UNCONDITIONALLY (React Rules of Hooks) ═══
    const LS_KEY = `adept-td-${entryData?.requestId ?? 'tmp'}`;

    const [form, setForm] = useState<TaxDeclarationFormData>(() => {
        if (!entryData) return EMPTY_TAX_DECLARATION();
        try {
            const saved = localStorage.getItem(LS_KEY);
            if (saved) return { ...EMPTY_TAX_DECLARATION(), ...JSON.parse(saved) };
        } catch { }
        return { ...EMPTY_TAX_DECLARATION(), ownerName: entryData.declarantName || '' };
    });

    // Captured ONCE, at first render, before the "auto-persist to
    // localStorage" effect below has a chance to run and write the (still
    // empty) `form` back into LS_KEY. If we instead re-read
    // localStorage.getItem(LS_KEY) live inside the hydrate-from-backend
    // effect, it would always find a draft — the one the persist effect
    // just wrote a moment earlier on mount — and would skip fetching the
    // real backend data every time. That's exactly why Amend (which relies
    // on this fetch to pull in the deep-copied tax declaration) was
    // showing up blank.
    const [hadLocalDraftOnMount] = useState(() => (entryData ? !!localStorage.getItem(LS_KEY) : true));

    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState('');

    const [showDiscardModal, setShowDiscardModal] = useState(false);
    const [discarding, setDiscarding] = useState(false);
    const [discardError, setDiscardError] = useState('');
    const [showNextStepChoice, setShowNextStepChoice] = useState(false);

    const [metadata, setMetadata] = useState<{
        classifications: { id: string; label: string; code: string }[];
        propertyTypes: { id: string; label: string; code: string }[];
    }>({ classifications: [], propertyTypes: [] });

    useEffect(() => {
        if (!entryData) return;
        try { localStorage.setItem(LS_KEY, JSON.stringify(form)); } catch { }
    }, [form, LS_KEY, entryData]);

    const { addItem, items: cartItems } = useCart();

    useEffect(() => {
        if (!entryData) return;
        let isMounted = true;
        const fetchMeta = async () => {
            try {
                const data = await requestService.getMetadata();
                if (!isMounted || !data) return;

                setMetadata({
                    classifications: Array.isArray((data as any).classifications) ? (data as any).classifications : [],
                    propertyTypes: Array.isArray((data as any).propertyTypes) ? (data as any).propertyTypes : [],
                });

                const barangays = Array.isArray((data as any).barangays) ? (data as any).barangays : [];
                const municipalities = Array.isArray((data as any).municipalities) ? (data as any).municipalities : [];
                const municipalityMap: Record<string, string> = {};
                municipalities.forEach((m: any) => { municipalityMap[m.id] = m.name; });

                const matchedBarangay = barangays.find((b: any) => b.id === entryData?.propertyLocation);
                if (matchedBarangay) {
                    setForm((prev) => ({
                        ...prev,
                        barangayId: matchedBarangay.name,
                        municipalityId: municipalityMap[matchedBarangay.municipality_id] || '',
                    }));
                }
            } catch (err) { console.error('Failed to fetch meta', err); }
        };
        fetchMeta();
        return () => { isMounted = false; };
    }, [entryData?.propertyLocation, entryData]);

    const classificationOptions = metadata.classifications.length > 0
        ? metadata.classifications
        : [
            { id: 'AGRICULTURAL', label: 'Agricultural', code: 'AGRICULTURAL' },
            { id: 'RESIDENTIAL', label: 'Residential', code: 'RESIDENTIAL' },
          ];
    const propertyTypeOptions = (
    metadata.propertyTypes.length > 0
        ? metadata.propertyTypes
        : [
            { id: 'LAND', label: 'Land', code: 'LAND' },
            { id: 'BUILDING', label: 'Building', code: 'BUILDING' },
          ]
).filter((o) => o.label.trim().toLowerCase() !== 'others');

    const totalMarketValue = form.assessmentRows.reduce(
        (sum, r) => sum + (parseFloat(r.marketValue) || 0), 0
    );
    const totalAssessedValue = form.assessmentRows.reduce((sum, r) => {
        const mv = parseFloat(r.marketValue) || 0;
        const al = parseFloat(r.assessmentLevel) || 0;
        return sum + calcAssessedValue(mv, al);
    }, 0);

    useEffect(() => {
        if (!entryData) return;
        let isMounted = true;
        const hydrateFromBackend = async () => {
            // Use the value captured on mount, NOT a fresh localStorage
            // read — see the comment where hadLocalDraftOnMount is declared.
            if (hadLocalDraftOnMount) return;
            const dbData = await taxDeclarationService.getRawForEdit(entryData.requestId);
            if (!isMounted || !dbData) return;

            // FIX: the backend (getTaxDeclarationByRequestId) attaches the
            // child rows under the key `assessments` — the old
            // `encoded_assessment_rows` key never exists on the response, so
            // Amend always fell back to the (empty) draft rows. Read both
            // keys, preferring whichever actually carries data.
            const rawRows = dbData.assessments || dbData.encoded_assessment_rows || [];

            // FIX: the declaration row has no `area` column — the total
            // area is stored on the first assessment row (see handleSave's
            // row distribution). Re-derive the form's "Total Land Area"
            // fields from the rows so the value typed on first encode
            // survives the round-trip back into this form.
            const rowsAreaTotal = rawRows.reduce(
                (sum: number, r: any) => sum + (parseFloat(r.area) || 0), 0
            );
            const firstAreaRow = rawRows.find((r: any) => r.area);
            const parsedArea = firstAreaRow
                ? { value: String(rowsAreaTotal), unit: dbUnitToFormUnit(firstAreaRow.area_unit) }
                : null;

            setForm((prev) => ({
                ...prev,
                taxDeclarationNumber: dbData.tax_declaration_number || prev.taxDeclarationNumber,
                propertyIndexNumber: dbData.property_identification_number || prev.propertyIndexNumber,
                ownerName: dbData.owner_name || prev.ownerName,
                ownerAddress: dbData.owner_address || prev.ownerAddress,
                administratorName: dbData.administrator_name || prev.administratorName,
                administratorAddress: dbData.administrator_address || prev.administratorAddress,
                octTctNumber: dbData.oct_tct_cloa_number || prev.octTctNumber,
                surveyNumber: dbData.survey_number || prev.surveyNumber,
                lotNumber: dbData.lot_number || prev.lotNumber,
                blockNumber: dbData.block_number || prev.blockNumber,
                boundaryNorth: dbData.boundary_north || prev.boundaryNorth,
                boundarySouth: dbData.boundary_south || prev.boundarySouth,
                boundaryEast: dbData.boundary_east || prev.boundaryEast,
                boundaryWest: dbData.boundary_west || prev.boundaryWest,
                taxability: (dbData.taxability as any) || prev.taxability,
                effectivityYear: dbData.effectivity_year ? String(dbData.effectivity_year) : prev.effectivityYear,
                arpNumber: dbData.cancelled_td_number || prev.arpNumber,
                memoranda: dbData.memoranda || prev.memoranda,
                assessorName: dbData.assessor_name || prev.assessorName,
                assessorTitle: dbData.assessor_title || prev.assessorTitle,
                // Document-level total area — derived from the assessment
                // rows (see dbUnitToFormUnit / handleSave distribution).
                area: parsedArea ? parsedArea.value : prev.area,
                areaUnit: parsedArea ? parsedArea.unit : prev.areaUnit,
                assessmentRows: rawRows.length
                    ? rawRows
                          .slice()
                          .sort((a: any, b: any) => (a.row_order || 0) - (b.row_order || 0))
                          .map((r: any) => {
                              // classification_id is stored as a CODE
                              // (e.g. "AGRICULTURAL"), not a UUID — see
                              // taxDeclarationService.getTaxDeclaration.
                              // Resolve it against classificationOptions
                              // here so classificationLabel is populated
                              // immediately instead of showing blank/raw
                              // codes until the user re-picks a value.
                              const rawCode = (r.classification_id || '').trim();
                              const normalizedCode = rawCode.toUpperCase();
                              // FIX: rows saved by older versions of this
                              // form stored the lookup_values.id (a number)
                              // instead of the code — match those by id too
                              // so the label shows instead of the number.
                              const matched =
                                  classificationOptions.find((o) => o.code === normalizedCode) ||
                                  classificationOptions.find((o) => o.id === rawCode);
                              return {
                                  id: r.id,
                                  kindOfProperty: r.kind_of_property || '',
                                  classificationId: rawCode,
                                  classificationLabel: matched?.label || rawCode,
                                  actualUseId: r.actual_use_id || '',
                                  actualUseOtherText: r.actual_use_other_text || '',
                                  area: r.area || '',
                                  areaUnit: r.area_unit || 'HECTARE',
                                  marketValue: r.market_value != null ? String(r.market_value) : '',
                                  assessmentLevel: r.assessment_level != null ? String(r.assessment_level) : '',
                                  assessedValue: r.assessed_value != null ? String(r.assessed_value) : '',
                              };
                          })
                    : prev.assessmentRows,
            }));
        };
        hydrateFromBackend();
        return () => { isMounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entryData?.requestId, hadLocalDraftOnMount]);

    const amountInWords = numberToWords(totalAssessedValue);

    useEffect(() => {
        setForm((prev) => ({ ...prev, totalMarketValue, totalAssessedValue, amountInWords }));
    }, [totalMarketValue, totalAssessedValue, amountInWords]);

    const set = (field: keyof TaxDeclarationFormData, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (field === 'taxDeclarationNumber' && value.trim()) setSaveError('');
    };

    const updateRow = useCallback((id: string, field: keyof AssessmentRow, value: string) => {
        setForm((prev) => ({
            ...prev,
            assessmentRows: prev.assessmentRows.map((r) => {
                if (r.id !== id) return r;
                const updated = { ...r, [field]: value };
                if (field === 'marketValue' || field === 'assessmentLevel') {
                    const mv = parseFloat(updated.marketValue) || 0;
                    const al = parseFloat(updated.assessmentLevel) || 0;
                    updated.assessedValue = mv && al ? String(calcAssessedValue(mv, al)) : '';
                }
                return updated;
            }),
        }));
    }, []);

    const addRow = () => setForm((prev) => ({ ...prev, assessmentRows: [...prev.assessmentRows, EMPTY_ASSESSMENT_ROW()] }));
    const removeRow = (id: string) => setForm((prev) => ({ ...prev, assessmentRows: prev.assessmentRows.filter((r) => r.id !== id) }));

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

    // ── Safety guard placed AFTER all hooks ──
    if (!entryData) {
        return (
            <div className="td-page">
                <div className="td-card" style={{ padding: '40px', textAlign: 'center' }}>
                    <div className="td-spinner"></div>
                    <p>Loading request details...</p>
                    <button onClick={onDiscard}>Return to Dashboard</button>
                </div>
            </div>
        );
    }

    const handleSave = async (action: 'draft' | 'review' | 'add_another') => {
        if (!form.taxDeclarationNumber.trim()) return setSaveError('Assessment of Real Property No. is required.');
        setSaveError('');
        setSaving(true);
        try {
            // FIX: the document-level "Total Land Area" cannot be stored on
            // the declaration row (encoded_tax_declarations has no `area`
            // column), and the preview/generation read path
            // (taxDeclarationService.getTaxDeclaration) derives the printed
            // area from the SUM of the per-assessment-row areas. So push
            // the total onto the FIRST assessment row on save — otherwise
            // the value typed here never reaches the Initial Document
            // Preview or the Document Generation & Release PDF (and only
            // appeared after typing it again per-row in the Full Document
            // Edit modal).
            const totalAreaValue = parseFloat(form.area);
            const hasTotalArea = !isNaN(totalAreaValue) && totalAreaValue > 0;
            const assessmentRows = form.assessmentRows.map((row, idx) =>
                hasTotalArea && idx === 0
                    ? { ...row, area: String(totalAreaValue), areaUnit: form.areaUnit }
                    : row
            );
            // Recombine the split value/unit back into the single combined
            // string the backend column expects (see formatAreaString above).
            const payload = {
                ...form,
                assessmentRows,
                area: formatAreaString(form.area, form.areaUnit),
            };
            await taxDeclarationService.save(payload, entryData.requestId, user.id);
            localStorage.removeItem(LS_KEY);

            if (action !== 'draft') {
                addItem({
                    id: entryData.requestId,
                    referenceNumber: entryData.referenceNumber,
                    documentType: 'Tax Declaration',
                    fee: 40.00,
                    declarantName: entryData.declarantName,
                    requestedByName: entryData.requestedByName,
                });
            }

            setSaved(true);
            setTimeout(() => {
                if (action === 'review') onGoToSummary();
                else if (action === 'add_another') onAddAnother();
            }, 1500);
        } catch (err: any) {
            setSaveError('Failed to save. Check database connection.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="td-page">
            <div className="td-page-inner">
                <div className="td-card">

                    <div className="td-card-header">
                        <div className="td-card-header-left">
                            <h2 className="td-card-title">Declaration of Real Property</h2>
                            <span className="td-card-subtitle">Province of Zamboanga del Norte · Office of the Provincial Assessor</span>
                        </div>
                        <span className="td-ref-chip">{entryData.referenceNumber}</span>
                    </div>

                    {saved && (
                        <div className="td-success-banner">
                            <span className="td-success-icon"><CheckCircleIcon size={18} /></span>
                            <div className="td-success-text">
                                <strong>Tax Declaration saved successfully!</strong>
                                <span>Record stored. Client can now proceed to payment.</span>
                            </div>
                        </div>
                    )}

                    <div className="td-doc-header">
                        <div className="td-doc-header-row">
                            <div className="td-doc-header-field" style={{ alignItems: 'flex-start' }}>
                                <label style={{ paddingTop: '10px', whiteSpace: 'nowrap' }}>Assessment of Real Property No.:</label>
                                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                                    <input
                                        id="td-arp-no"
                                        className="td-input"
                                        style={saveError ? { borderColor: '#ef4444', background: '#fef2f2' } : undefined}
                                        placeholder="e.g. 21-0004-00082"
                                        value={form.taxDeclarationNumber}
                                        onChange={(e) => set('taxDeclarationNumber', e.target.value)}
                                    />
                                    {saveError && (
                                        <span style={{ color: '#dc2626', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px', marginTop: '5px' }}>
                                            <AlertTriangleIcon size={13} /> {saveError}
                                        </span>
                                    )}
                                </div>
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

                    <div className="td-form-body">

                        {/* ── Owner Information ── */}
                        <div className="td-section">
                            <div className="td-section-title">Owner Information</div>
                            <div className="td-row td-row-2">
                                <div className="td-field">
                                    <label className="td-label">Owner</label>
                                    <input id="td-owner-name" className="td-input" placeholder="Full name of owner" value={form.ownerName} onChange={(e) => set('ownerName', e.target.value)} autoComplete="off" />
                                </div>
                                <div className="td-field">
                                    <label className="td-label">Address</label>
                                    <input id="td-owner-address" className="td-input" placeholder="e.g. Pob. Sibutad, ZN" value={form.ownerAddress} onChange={(e) => set('ownerAddress', e.target.value)} autoComplete="off" />
                                </div>
                            </div>
                            <div className="td-row td-row-2">
                                <div className="td-field">
                                    <label className="td-label">Administrator <span className="td-label-sub">(if applicable)</span></label>
                                    <input id="td-admin-name" className="td-input" placeholder="Full name of administrator" value={form.administratorName} onChange={(e) => set('administratorName', e.target.value)} autoComplete="off" />
                                </div>
                                <div className="td-field">
                                    <label className="td-label">Administrator Address</label>
                                    <input id="td-admin-address" className="td-input" placeholder="Administrator's address" value={form.administratorAddress} onChange={(e) => set('administratorAddress', e.target.value)} autoComplete="off" />
                                </div>
                            </div>
                        </div>

                        {/* ── Location of Property ── */}
                        <div className="td-section">
                            <div className="td-section-title">Location of Property</div>
                            <div className="td-location-strip">
                                <div className="td-location-cell td-province-fixed">
                                    <input className="td-input" readOnly value={form.barangayId || '—'} />
                                    <span className="td-location-sub">(Barangay)</span>
                                </div>
                                <div className="td-location-cell td-province-fixed">
                                    <input className="td-input" readOnly value={form.municipalityId || '—'} />
                                    <span className="td-location-sub">(Municipality)</span>
                                </div>
                                <div className="td-location-cell td-province-fixed">
                                    <input className="td-input" readOnly value="ZAMBOANGA DEL NORTE" />
                                    <span className="td-location-sub">(Province)</span>
                                </div>
                            </div>
                        </div>

                        {/* ── Land Reference Numbers ── */}
                        <div className="td-section">
                            <div className="td-section-title">Land Reference Numbers</div>
                            <div className="td-row td-row-4">
                                <div className="td-field">
                                    <label className="td-label">OCT/TCT/CLOA No.</label>
                                    <input id="td-oct-tct" className="td-input" placeholder="e.g. T-72142" value={form.octTctNumber} onChange={(e) => set('octTctNumber', e.target.value)} />
                                </div>
                                <div className="td-field">
                                    <label className="td-label">Survey No.</label>
                                    <input id="td-survey-no" className="td-input" placeholder="Survey number" value={form.surveyNumber} onChange={(e) => set('surveyNumber', e.target.value)} />
                                </div>
                                <div className="td-field">
                                    <label className="td-label">Lot No.</label>
                                    <input id="td-lot-no" className="td-input" placeholder="e.g. 3979-H" value={form.lotNumber} onChange={(e) => set('lotNumber', e.target.value)} />
                                </div>
                                <div className="td-field">
                                    <label className="td-label">Blk. No.</label>
                                    <input id="td-blk-no" className="td-input" placeholder="Block no." value={form.blockNumber} onChange={(e) => set('blockNumber', e.target.value)} />
                                </div>
                            </div>
                        </div>

                        {/* ── Boundaries ── */}
                        <div className="td-section">
                            <div className="td-section-title">Boundaries</div>
                            <div className="td-boundaries-box">
                                <div className="td-boundaries-note">State streets, streams or PIN by bounded, or names of owner of adjoining lands.</div>
                                <div className="td-boundaries-grid">
                                    <div className="td-field">
                                        <label className="td-label">North</label>
                                        <textarea id="td-north" className="td-input" rows={2} placeholder="e.g. NW: ALONG LINES 2-3-4-5-6-7-8 BY LOT NO. 31-F-1-K, PSD-09-069818" value={form.boundaryNorth} onChange={(e) => set('boundaryNorth', e.target.value)} />
                                    </div>
                                    <div className="td-field">
                                        <label className="td-label">South</label>
                                        <textarea id="td-south" className="td-input" rows={2} placeholder="e.g. S: ALONG LINES 9-10-11 BY LOT NO. 31-F-1-L" value={form.boundarySouth} onChange={(e) => set('boundarySouth', e.target.value)} />
                                    </div>
                                    <div className="td-field">
                                        <label className="td-label">East</label>
                                        <textarea id="td-east" className="td-input" rows={2} placeholder="e.g. E: ALONG LINE 8-9 BY ROAD" value={form.boundaryEast} onChange={(e) => set('boundaryEast', e.target.value)} />
                                    </div>
                                    <div className="td-field">
                                        <label className="td-label">West</label>
                                        <textarea id="td-west" className="td-input" rows={2} placeholder="e.g. W: ALONG LINE 1-2 BY CREEK" value={form.boundaryWest} onChange={(e) => set('boundaryWest', e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Kind of Property & Valuation ── */}
                        <div className="td-assessment-section">
                            <div className="td-table-header-bar">
                                <span>Kind of Property &amp; Valuation</span>
                                <button type="button" className="td-add-row-btn" onClick={addRow}>+ Add Row</button>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="td-assessment-table">
                                    <thead>
                                        <tr>
                                            <th style={{ minWidth: 160 }}>Kind of Property</th>
                                            <th style={{ minWidth: 180 }}>Classification</th>
                                            <th className="td-th-right" style={{ minWidth: 120 }}>Market Value (₱)</th>
                                            <th className="td-th-right" style={{ minWidth: 100 }}>Assess. Level (%)</th>
                                            <th className="td-th-right" style={{ minWidth: 120 }}>Assessed Value (₱)</th>
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
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        {/* ── Total Land Area ── */}
                        <div className="td-section">
                            <div className="td-section-title">Total Land Area</div>
                            <div className="td-row td-row-2">
                                <div className="td-field">
                                    <label className="td-label">Area</label>
                                    {/*
                                     * Plain text input — intentionally NOT type="number".
                                     * A numeric input lets the scroll wheel silently change the
                                     * value, which staff may not notice on a busy form. Text
                                     * input forces an explicit keyboard entry with no accidental
                                     * scroll drift. parseAreaString / formatAreaString handle
                                     * the string → backend conversion regardless of input type.
                                     */}
                                    <input
                                        id="td-total-area"
                                        className="td-input"
                                        type="text"
                                        placeholder="e.g. 1234.56"
                                        value={form.area}
                                        onChange={(e) => set('area', e.target.value)}
                                    />
                                </div>
                                <div className="td-field">
                                    <label className="td-label">Unit</label>
                                    <select
                                        id="td-total-area-unit"
                                        className="td-select"
                                        value={form.areaUnit || 'has.'}
                                        onChange={(e) => set('areaUnit', e.target.value)}
                                    >
                                        <option value="has.">has.</option>
                                        <option value="sqm.">sq.m.</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* ── Totals & Taxability ── */}
                        <div className="td-summary-row">
                            <div className="td-amount-words-block">
                                <span className="td-amount-words-label">
                                    Total Assessed Value <span className="td-amount-words-sub">(Amount in Words)</span>
                                </span>
                                <div className="td-amount-words-value">
                                    {amountInWords || (
                                        <span style={{ color: '#94a3b8', fontStyle: 'italic', fontWeight: 400 }}>
                                            Auto-generated from totals above…
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="td-taxability-block">
                                <span className="td-taxability-label">Taxability</span>
                                <div className="td-taxability-toggle">
                                    <button
                                        type="button"
                                        className={`td-taxability-btn ${form.taxability === 'TAXABLE' ? 'active-taxable' : ''}`}
                                        onClick={() => set('taxability', 'TAXABLE')}
                                    >
                                        <span>{form.taxability === 'TAXABLE' ? <CheckIcon size={14} /> : <SquareIcon size={14} />}</span> Taxable
                                    </button>
                                    <button
                                        type="button"
                                        className={`td-taxability-btn ${form.taxability === 'EXEMPT' ? 'active-exempt' : ''}`}
                                        onClick={() => set('taxability', 'EXEMPT')}
                                    >
                                        <span>{form.taxability === 'EXEMPT' ? <CheckIcon size={14} /> : <SquareIcon size={14} />}</span> Exempt
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ── Tax Effectivity & Cancellation ── */}
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

                        {/* ── Assessor Signatory ── */}
                        <div className="td-section">
                            <div className="td-section-title">Assessor Signatory</div>
                            <div className="td-row td-row-2">
                                <div className="td-field">
                                    <label className="td-label">Assessor Name</label>
                                    <input
                                        id="td-assessor-name"
                                        className="td-input"
                                        placeholder="e.g. Engr. Vicente P. Desoy"
                                        value={form.assessorName}
                                        onChange={(e) => set('assessorName', e.target.value)}
                                    />
                                </div>
                                <div className="td-field">
                                    <label className="td-label">Assessor Title</label>
                                    <input
                                        id="td-assessor-title"
                                        className="td-input"
                                        placeholder="e.g. Municipal Assessor"
                                        value={form.assessorTitle}
                                        onChange={(e) => set('assessorTitle', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="td-important-notice">
                            <strong>IMPORTANT:</strong> This declaration is issued only in connection with real property taxation and the valuation indicated herein is based on a schedule of market values prepared for the purpose. It should <em>not</em> be considered as title to the property.
                        </div>

                    </div>

                    {/* ── Session progress (compact card above footer) ── */}
                    <div className="txp-form-wrapper">
                        <TransactionProgressPanel
                            referenceNumber={entryData.referenceNumber}
                            currentDeclarant={entryData.declarantName}
                        />
                    </div>

                    {/* ── Footer actions ── */}
                    <div className="td-footer">
                        <div className="td-footer-left">
                            <button
                                type="button"
                                className="td-btn"
                                style={{ background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3' }}
                                onClick={() => setShowDiscardModal(true)}
                                disabled={saving}
                            >
                                ✕ Discard Document
                            </button>
                        </div>
                        <div className="td-footer-right">
                            <button
                                type="button"
                                className="td-btn td-btn-add-another"
                                onClick={() => handleSave('add_another')}
                                disabled={saving}
                                style={{ backgroundColor: '#10b981', color: 'white' }}
                            >
                                {saving ? <span className="td-spinner" /> : <PlusIcon size={14} />} Save & Add Another Doc
                            </button>
                            <button
                                type="button"
                                className="td-btn td-btn-submit"
                                onClick={() => handleSave('review')}
                                disabled={saving}
                            >
                                {saving ? <span className="td-spinner" /> : <ClipboardListIcon size={14} />} Review Transaction
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
                            <button
                                type="button"
                                onClick={() => setShowDiscardModal(false)}
                                disabled={discarding}
                                style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}
                            >
                                Keep Editing
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDiscard}
                                disabled={discarding}
                                style={{ background: '#e11d48', color: '#fff', border: '1px solid #e11d48', padding: '10px 20px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', fontSize: '0.9rem', opacity: discarding ? 0.7 : 1 }}
                            >
                                {discarding ? 'Discarding...' : 'Yes, Discard'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Next Step Choice Modal (after discard with cart items) ── */}
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