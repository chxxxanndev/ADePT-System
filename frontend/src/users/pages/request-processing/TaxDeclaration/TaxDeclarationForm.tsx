import { useState, useCallback, useEffect } from 'react';
import type { User } from '../../../../auth-folder/types/auth';
import type { CompletedEntryData, TaxDeclarationFormData, AssessmentRow } from '../../../types/taxDeclaration';
import { EMPTY_TAX_DECLARATION, EMPTY_ASSESSMENT_ROW } from '../../../types/taxDeclaration';
import { taxDeclarationService } from '../../../services/taxDeclarationService';
import { requestService } from '../../../services/requestService';
import { useCart } from '../../../hooks/TransactionCartContext';
import '../../../styles/TaxDeclaration.css';

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

function AssessmentRowItem({ row, onUpdate, onRemove, canRemove, classificationOptions, propertyTypeOptions }: { row: AssessmentRow; onUpdate: (id: string, field: keyof AssessmentRow, value: string) => void; onRemove: (id: string) => void; canRemove: boolean; classificationOptions: { id: string; label: string; code: string }[]; propertyTypeOptions: { id: string; label: string; code: string }[]; }) {
    const mv = parseFloat(row.marketValue) || 0;
    const al = parseFloat(row.assessmentLevel) || 0;
    const av = (mv * al) / 100;
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
            <td><button type="button" className="td-row-remove-btn" onClick={() => onRemove(row.id)} disabled={!canRemove} title="Remove row">✕</button></td>
        </tr>
    );
}

// 2. UPDATED PROPS (Removed unused onBackToDashboard to fix yellow warning)
interface TaxDeclarationFormProps {
    user: User;
    entryData: CompletedEntryData;
    onBack: () => void;
    onAddAnother: () => void;
    onGoToSummary: () => void;
}

export function TaxDeclarationForm({ user, entryData, onBack, onAddAnother, onGoToSummary }: TaxDeclarationFormProps) {
    // Safety check: If entryData isn't here yet, show a loading message instead of a blank white screen
    if (!entryData) {
        return (
            <div className="td-page">
                <div className="td-card" style={{ padding: '40px', textAlign: 'center' }}>
                    <div className="td-spinner"></div>
                    <p>Loading request details...</p>
                    <button onClick={onBack}>Return to Dashboard</button>
                </div>
            </div>
        );
    }

    const [form, setForm] = useState<TaxDeclarationFormData>(() => ({
        ...EMPTY_TAX_DECLARATION(),
        ownerName: entryData?.declarantName || '', // Added ?. safety
    }));
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [metadata, setMetadata] = useState<{ classifications: { id: string; label: string; code: string }[]; propertyTypes: { id: string; label: string; code: string }[]; }>({ classifications: [], propertyTypes: [], });

    const { addItem } = useCart();

    useEffect(() => {
        let isMounted = true;
        const fetchMeta = async () => {
            try {
                const data = await requestService.getMetadata();
                if (isMounted && data) {
                    setMetadata({ classifications: Array.isArray(data.classifications) ? data.classifications : [], propertyTypes: Array.isArray(data.propertyTypes) ? data.propertyTypes : [], });
                }
            } catch (err) { console.error('Failed to fetch meta', err); }
        };
        fetchMeta(); return () => { isMounted = false; };
    }, []);

    const classificationOptions = metadata.classifications.length > 0 ? metadata.classifications : [{ id: 'AGRICULTURAL', label: 'Agricultural', code: 'AGRICULTURAL' }, { id: 'RESIDENTIAL', label: 'Residential', code: 'RESIDENTIAL' }];
    const propertyTypeOptions = metadata.propertyTypes.length > 0 ? metadata.propertyTypes : [{ id: 'LAND', label: 'Land', code: 'LAND' }, { id: 'BUILDING', label: 'Building', code: 'BUILDING' }];

    const totalMarketValue = form.assessmentRows.reduce((sum, r) => sum + (parseFloat(r.marketValue) || 0), 0);
    const totalAssessedValue = form.assessmentRows.reduce((sum, r) => { const mv = parseFloat(r.marketValue) || 0; const al = parseFloat(r.assessmentLevel) || 0; return sum + (mv * al) / 100; }, 0);
    const amountInWords = numberToWords(totalAssessedValue);

    useEffect(() => { setForm((prev) => ({ ...prev, totalMarketValue, totalAssessedValue, amountInWords })); }, [totalMarketValue, totalAssessedValue, amountInWords]);

    const set = (field: keyof TaxDeclarationFormData, value: string) => setForm((prev) => ({ ...prev, [field]: value }));
    const updateRow = useCallback((id: string, field: keyof AssessmentRow, value: string) => { setForm((prev) => ({ ...prev, assessmentRows: prev.assessmentRows.map((r) => r.id === id ? { ...r, [field]: value } : r), })); }, []);
    const addRow = () => setForm((prev) => ({ ...prev, assessmentRows: [...prev.assessmentRows, EMPTY_ASSESSMENT_ROW()] }));

    // 3. FIXED SYNTAX ERROR HERE
    const removeRow = (id: string) => setForm((prev) => ({ ...prev, assessmentRows: prev.assessmentRows.filter((r) => r.id !== id) }));

    const handleSave = async (action: 'draft' | 'review' | 'add_another') => {
        if (!form.taxDeclarationNumber || !form.ownerName) return setSaveError('Assessment No. and Owner Name are required.');
        setSaveError(''); setSaving(true);
        try {
            await taxDeclarationService.save(form, entryData.requestId, user.id);

            // Replace the old addItem logic:
            if (action !== 'draft') {
                addItem({
                    id: entryData.requestId,                  // FIX: Use real DB ID instead of Math.random()
                    referenceNumber: entryData.referenceNumber, // FIX: Pass the ref number
                    documentType: 'Tax Declaration', // (Change string based on the form)
                    fee: 40.00
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
                            <span className="td-success-icon">✓</span>
                            <div className="td-success-text">
                                <strong>Tax Declaration saved successfully!</strong>
                                <span>Record stored. Client can now proceed to payment.</span>
                            </div>
                        </div>
                    )}

                    {saveError && <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '12px 20px', margin: '0 32px 16px', color: '#b91c1c', fontSize: '0.88rem', fontWeight: 600 }}>⚠ {saveError}</div>}

                    <div className="td-doc-header">
                        <div className="td-doc-header-row">
                            <div className="td-doc-header-field"><label>Assessment of Real Property No.:</label><input id="td-arp-no" className="td-input" placeholder="e.g. 21-0004-00082" value={form.taxDeclarationNumber} onChange={(e) => set('taxDeclarationNumber', e.target.value)} /></div>
                            <div className="td-doc-header-field"><label>Property Index No.:</label><input id="td-pin" className="td-input" placeholder="e.g. 050-21-0004-002-30" value={form.propertyIndexNumber} onChange={(e) => set('propertyIndexNumber', e.target.value)} /></div>
                        </div>
                        <div className="td-doc-title">Declaration of Real Property</div>
                    </div>

                    <div className="td-form-body">
                        <div className="td-section">
                            <div className="td-section-title">Owner Information</div>
                            <div className="td-row td-row-2">
                                <div className="td-field"><label className="td-label">Owner</label><input id="td-owner-name" className="td-input" placeholder="Full name of owner" value={form.ownerName} onChange={(e) => set('ownerName', e.target.value)} /></div>
                                <div className="td-field"><label className="td-label">Address</label><input id="td-owner-address" className="td-input" placeholder="e.g. Pob. Sibutad, ZN" value={form.ownerAddress} onChange={(e) => set('ownerAddress', e.target.value)} /></div>
                            </div>
                            <div className="td-row td-row-2">
                                <div className="td-field"><label className="td-label">Administrator <span className="td-label-sub">(if applicable)</span></label><input id="td-admin-name" className="td-input" placeholder="Full name of administrator" value={form.administratorName} onChange={(e) => set('administratorName', e.target.value)} /></div>
                                <div className="td-field"><label className="td-label">Administrator Address</label><input id="td-admin-address" className="td-input" placeholder="Administrator's address" value={form.administratorAddress} onChange={(e) => set('administratorAddress', e.target.value)} /></div>
                            </div>
                        </div>

                        <div className="td-section">
                            <div className="td-section-title">Location of Property</div>
                            <div className="td-location-strip">
                                <div className="td-location-cell"><input id="td-barangay" className="td-input" placeholder="Barangay" value={form.barangayId} onChange={(e) => set('barangayId', e.target.value)} /><span className="td-location-sub">(Barangay)</span></div>
                                <div className="td-location-cell"><input id="td-municipality" className="td-input" placeholder="Municipality" value={form.municipalityId} onChange={(e) => set('municipalityId', e.target.value)} /><span className="td-location-sub">(Municipality)</span></div>
                                <div className="td-location-cell td-province-fixed"><input className="td-input" readOnly value="ZAMBOANGA DEL NORTE" /><span className="td-location-sub">(Province)</span></div>
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
                                    <button type="button" className={`td-taxability-btn ${form.taxability === 'TAXABLE' ? 'active-taxable' : ''}`} onClick={() => set('taxability', 'TAXABLE')}><span>{form.taxability === 'TAXABLE' ? '✓' : '☐'}</span> Taxable</button>
                                    <button type="button" className={`td-taxability-btn ${form.taxability === 'EXEMPT' ? 'active-exempt' : ''}`} onClick={() => set('taxability', 'EXEMPT')}><span>{form.taxability === 'EXEMPT' ? '✓' : '☐'}</span> Exempt</button>
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
                        <div className="td-important-notice"><strong>IMPORTANT:</strong> This declaration is issued only in connection with real property taxation and the valuation indicated herein is based on a schedule of market values prepared for the purpose. It should <em>not</em> be considered as title to the property.</div>
                    </div>

                    <div className="td-footer">
                        <div className="td-footer-left"><button type="button" className="td-btn td-btn-back" onClick={onBack}>← Back</button></div>
                        <div className="td-footer-right">
                            <button type="button" className="td-btn td-btn-draft" onClick={() => handleSave('draft')} disabled={saving}>{saving ? <span className="td-spinner" /> : '💾'} Save Draft</button>
                            <button type="button" className="td-btn td-btn-add-another" onClick={() => handleSave('add_another')} disabled={saving} style={{ backgroundColor: '#10b981', color: 'white' }}>{saving ? <span className="td-spinner" /> : '➕'} Save & Add Another Doc</button>
                            <button type="button" className="td-btn td-btn-submit" onClick={() => handleSave('review')} disabled={saving}>{saving ? <span className="td-spinner" /> : '📋'} Review Transaction</button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}