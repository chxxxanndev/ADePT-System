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

// 1. RESTORED HELPER FUNCTIONS
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

function AssessmentRowItem({ row, onUpdate, onRemove, canRemove, classificationOptions, propertyTypeOptions }: { row: AssessmentRow; onUpdate: (id: string, field: keyof AssessmentRow, value: string) => void; onRemove: (id: string) => void; canRemove: boolean; classificationOptions: { id: string; label: string; code: string }[]; propertyTypeOptions: { id: string; label: string; code: string }[]; }) {
    const mv = parseFloat(row.marketValue) || 0;
    const al = parseFloat(row.assessmentLevel) || 0;
    const av = calcAssessedValue(mv, al);
    return (
        <tr>
            <td>
                <select className="td-select" value={row.kindOfProperty} onChange={(e) => onUpdate(row.id, 'kindOfProperty', e.target.value)}>
                    <option value="">-- Select Kind --</option>
                    {propertyTypeOptions.map((opt) => (<option key={opt.id} value={opt.code}>{opt.label}</option>))}
                </select>
            </td>
            <td>
                <select className="td-select" value={row.classificationId || row.classificationLabel} onChange={(e) => { const val = e.target.value; const matched = classificationOptions.find((o) => o.id === val || o.code === val); if (matched) { onUpdate(row.id, 'classificationId', matched.id); onUpdate(row.id, 'classificationLabel', matched.label); } else { onUpdate(row.id, 'classificationId', ''); onUpdate(row.id, 'classificationLabel', val); } }}>
                    <option value="">-- Select Classification --</option>
                    {classificationOptions.map((opt) => (<option key={opt.id} value={opt.id}>{opt.label}</option>))}
                </select>
            </td>
            <td className="td-table-input-right"><input className="td-input" type="number" placeholder="0.00" value={row.marketValue} onChange={(e) => onUpdate(row.id, 'marketValue', e.target.value)} min="0" step="0.01" /></td>
            <td className="td-table-input-right"><input className="td-input" type="number" placeholder="%" value={row.assessmentLevel} onChange={(e) => onUpdate(row.id, 'assessmentLevel', e.target.value)} min="0" max="100" step="0.01" /></td>
            <td className="td-table-input-right"><input className="td-input" readOnly value={av > 0 ? formatPeso(av) : ''} placeholder="Auto-calc" /></td>
            <td><input className="td-input" placeholder="has." value={row.area} onChange={(e) => onUpdate(row.id, 'area', e.target.value)} /></td>
            <td><button type="button" className="td-row-remove-btn" onClick={() => onRemove(row.id)} disabled={!canRemove} title="Remove row"><XIcon size={13} /></button></td>
        </tr>
    );
}

// 2. UPDATED PROPS (Removed unused onBackToDashboard to fix yellow warning)
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

export function TaxDeclarationForm({ user, entryData, onDiscard, onDiscardToSummary, onAddAnotherAfterDiscard, onAddAnother, onGoToSummary }: TaxDeclarationFormProps) {
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

    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState('');

    const [showDiscardModal, setShowDiscardModal] = useState(false);
    const [discarding, setDiscarding] = useState(false);
    const [discardError, setDiscardError] = useState('');
    const [showNextStepChoice, setShowNextStepChoice] = useState(false);

    const [metadata, setMetadata] = useState<{ classifications: { id: string; label: string; code: string }[]; propertyTypes: { id: string; label: string; code: string }[]; }>({ classifications: [], propertyTypes: [], });

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
        fetchMeta(); return () => { isMounted = false; };
    }, [entryData?.propertyLocation, entryData]);

    const classificationOptions = metadata.classifications.length > 0 ? metadata.classifications : [{ id: 'AGRICULTURAL', label: 'Agricultural', code: 'AGRICULTURAL' }, { id: 'RESIDENTIAL', label: 'Residential', code: 'RESIDENTIAL' }];
    const propertyTypeOptions = metadata.propertyTypes.length > 0 ? metadata.propertyTypes : [{ id: 'LAND', label: 'Land', code: 'LAND' }, { id: 'BUILDING', label: 'Building', code: 'BUILDING' }];

    const totalMarketValue = form.assessmentRows.reduce((sum, r) => sum + (parseFloat(r.marketValue) || 0), 0);
    const totalAssessedValue = form.assessmentRows.reduce((sum, r) => {
        const mv = parseFloat(r.marketValue) || 0;
        const al = parseFloat(r.assessmentLevel) || 0;
        return sum + calcAssessedValue(mv, al);
    }, 0);
    const amountInWords = numberToWords(totalAssessedValue);

    useEffect(() => { setForm((prev) => ({ ...prev, totalMarketValue, totalAssessedValue, amountInWords })); }, [totalMarketValue, totalAssessedValue, amountInWords]);

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
        setSaveError(''); setSaving(true);
        try {
            await taxDeclarationService.save(form, entryData.requestId, user.id);
            localStorage.removeItem(LS_KEY);

            // Replace the old addItem logic:
            if (action !== 'draft') {
                addItem({
                    id: entryData.requestId,                  // FIX: Use real DB ID instead of Math.random()
                    referenceNumber: entryData.referenceNumber, // FIX: Pass the ref number
                    documentType: 'Tax Declaration', // (Change string based on the form)
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
        } catch (err: any) { setSaveError('Failed to save. Check database connection.'); } finally { setSaving(false); }
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
                            <div className="td-doc-header-field"><label>Property Index No.:</label><input id="td-pin" className="td-input" placeholder="e.g. 050-21-0004-002-30" value={form.propertyIndexNumber} onChange={(e) => set('propertyIndexNumber', e.target.value)} /></div>
                        </div>
                        <div className="td-doc-title">Declaration of Real Property</div>
                    </div>

                    <div className="td-form-body">
                        <div className="td-section">
                            <div className="td-section-title">Owner Information</div>
                            <div className="td-row td-row-2">
                                <div className="td-field"><label className="td-label">Owner</label><input id="td-owner-name" className="td-input" placeholder="Full name of owner" value={form.ownerName} onChange={(e) => set('ownerName', e.target.value)} autoComplete="off" /></div>
                                <div className="td-field"><label className="td-label">Address</label><input id="td-owner-address" className="td-input" placeholder="e.g. Pob. Sibutad, ZN" value={form.ownerAddress} onChange={(e) => set('ownerAddress', e.target.value)} autoComplete="off" /></div>
                            </div>
                            <div className="td-row td-row-2">
                                <div className="td-field"><label className="td-label">Administrator <span className="td-label-sub">(if applicable)</span></label><input id="td-admin-name" className="td-input" placeholder="Full name of administrator" value={form.administratorName} onChange={(e) => set('administratorName', e.target.value)} autoComplete="off" /></div>
                                <div className="td-field"><label className="td-label">Administrator Address</label><input id="td-admin-address" className="td-input" placeholder="Administrator's address" value={form.administratorAddress} onChange={(e) => set('administratorAddress', e.target.value)} autoComplete="off" /></div>
                            </div>
                        </div>

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

                        <div className="td-section">
                            <div className="td-section-title">Land Reference Numbers</div>
                            <div className="td-row td-row-4">
                                <div className="td-field"><label className="td-label">OCT/TCT/CLOA No.</label><input id="td-oct-tct" className="td-input" placeholder="e.g. T-72142" value={form.octTctNumber} onChange={(e) => set('octTctNumber', e.target.value)} /></div>
                                <div className="td-field"><label className="td-label">Survey No.</label><input id="td-survey-no" className="td-input" placeholder="Survey number" value={form.surveyNumber} onChange={(e) => set('surveyNumber', e.target.value)} /></div>
                                <div className="td-field"><label className="td-label">Lot No.</label><input id="td-lot-no" className="td-input" placeholder="e.g. 3979-H" value={form.lotNumber} onChange={(e) => set('lotNumber', e.target.value)} /></div>
                                <div className="td-field"><label className="td-label">Blk. No.</label><input id="td-blk-no" className="td-input" placeholder="Block no." value={form.blockNumber} onChange={(e) => set('blockNumber', e.target.value)} /></div>
                            </div>
                        </div>

                        <div className="td-section">
                            <div className="td-section-title">Boundaries</div>
                            <div className="td-boundaries-box">
                                <div className="td-boundaries-note">State streets, streams or PIN by bounded, or names of owner of adjoining lands.</div>
                                <div className="td-boundaries-grid">
                                    <div className="td-field"><label className="td-label">North</label><textarea id="td-north" className="td-input" rows={2} placeholder="e.g. NW: ALONG LINES 2-3-4-5-6-7-8 BY LOT NO. 31-F-1-K, PSD-09-069818" value={form.boundaryNorth} onChange={(e) => set('boundaryNorth', e.target.value)} /></div>
                                    <div className="td-field"><label className="td-label">South</label><textarea id="td-south" className="td-input" rows={2} placeholder="e.g. S: ALONG LINES 9-10-11 BY LOT NO. 31-F-1-L" value={form.boundarySouth} onChange={(e) => set('boundarySouth', e.target.value)} /></div>
                                    <div className="td-field"><label className="td-label">East</label><textarea id="td-east" className="td-input" rows={2} placeholder="e.g. E: ALONG LINE 8-9 BY ROAD" value={form.boundaryEast} onChange={(e) => set('boundaryEast', e.target.value)} /></div>
                                    <div className="td-field"><label className="td-label">West</label><textarea id="td-west" className="td-input" rows={2} placeholder="e.g. W: ALONG LINE 1-2 BY CREEK" value={form.boundaryWest} onChange={(e) => set('boundaryWest', e.target.value)} /></div>
                                </div>
                            </div>
                        </div>

                        <div className="td-assessment-section">
                            <div className="td-table-header-bar"><span>Kind of Property &amp; Valuation</span><button type="button" className="td-add-row-btn" onClick={addRow}>+ Add Row</button></div>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="td-assessment-table">
                                    <thead>
                                        <tr>
                                            <th style={{ minWidth: 140 }}>Kind of Property</th><th style={{ minWidth: 160 }}>Classification</th><th className="td-th-right" style={{ minWidth: 120 }}>Market Value (₱)</th><th className="td-th-right" style={{ minWidth: 100 }}>Assess. Level (%)</th><th className="td-th-right" style={{ minWidth: 120 }}>Assessed Value (₱)</th><th style={{ minWidth: 90 }}>Area</th><th style={{ width: 40 }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {form.assessmentRows.map((row) => (
                                            <AssessmentRowItem key={row.id} row={row} onUpdate={updateRow} onRemove={removeRow} canRemove={form.assessmentRows.length > 1} classificationOptions={classificationOptions} propertyTypeOptions={propertyTypeOptions} />
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr><td colSpan={2} className="td-total-label">TOTAL</td><td className="td-total-value">₱ {formatPeso(totalMarketValue)}</td><td></td><td className="td-total-value">₱ {formatPeso(totalAssessedValue)}</td><td colSpan={2}></td></tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        <div className="td-summary-row">
                            <div className="td-amount-words-block">
                                <span className="td-amount-words-label">Total Assessed Value <span className="td-amount-words-sub">(Amount in Words)</span></span>
                                <div className="td-amount-words-value">{amountInWords || <span style={{ color: '#94a3b8', fontStyle: 'italic', fontWeight: 400 }}>Auto-generated from totals above…</span>}</div>
                            </div>
                            <div className="td-taxability-block">
                                <span className="td-taxability-label">Taxability</span>
                                <div className="td-taxability-toggle">
                                    <button type="button" className={`td-taxability-btn ${form.taxability === 'TAXABLE' ? 'active-taxable' : ''}`} onClick={() => set('taxability', 'TAXABLE')}>
                                        <span>{form.taxability === 'TAXABLE' ? <CheckIcon size={14} /> : <SquareIcon size={14} />}</span> Taxable
                                    </button>
                                    <button type="button" className={`td-taxability-btn ${form.taxability === 'EXEMPT' ? 'active-exempt' : ''}`} onClick={() => set('taxability', 'EXEMPT')}>
                                        <span>{form.taxability === 'EXEMPT' ? <CheckIcon size={14} /> : <SquareIcon size={14} />}</span> Exempt
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="td-section">
                            <div className="td-section-title">Tax Effectivity &amp; Cancellation</div>
                            <div className="td-row td-row-2">
                                <div className="td-field"><label className="td-label">Tax Effectivity Year</label><input id="td-effectivity-year" className="td-input" type="number" placeholder="e.g. 2021" value={form.effectivityYear} onChange={(e) => set('effectivityYear', e.target.value)} min="1900" max="2100" /></div>
                                <div className="td-field"><label className="td-label">This Declaration Cancels ARP No.</label><input id="td-cancels-arp" className="td-input" placeholder="e.g. 21-00004-00074" value={form.arpNumber} onChange={(e) => set('arpNumber', e.target.value)} /></div>
                            </div>
                            <div className="td-field"><label className="td-label">Memoranda</label><textarea id="td-memoranda" className="td-input" rows={3} placeholder="e.g. Revised Under Provincial Ordinance No. ZN-19-183…" value={form.memoranda} onChange={(e) => set('memoranda', e.target.value)} /></div>
                        </div>

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
                        <div className="td-important-notice"><strong>IMPORTANT:</strong> This declaration is issued only in connection with real property taxation and the valuation indicated herein is based on a schedule of market values prepared for the purpose. It should <em>not</em> be considered as title to the property.</div>
                    </div>

                    {/* ── Session progress (compact card above footer) ── */}
                    <div className="txp-form-wrapper">
                        <TransactionProgressPanel
                            referenceNumber={entryData.referenceNumber}
                            currentDeclarant={entryData.declarantName}
                        />
                    </div>

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

                            <button type="button" className="td-btn td-btn-add-another" onClick={() => handleSave('add_another')} disabled={saving} style={{ backgroundColor: '#10b981', color: 'white' }}>{saving ? <span className="td-spinner" /> : <PlusIcon size={14} />} Save & Add Another Doc</button>
                            <button type="button" className="td-btn td-btn-submit" onClick={() => handleSave('review')} disabled={saving}>{saving ? <span className="td-spinner" /> : <ClipboardListIcon size={14} />} Review Transaction</button>
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