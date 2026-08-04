import { useState } from 'react';
import type { AssessmentRow, DeclarantGroup, LandholdingRow, PropertyInfo, Transaction } from '../types/transaction';
import { ReprintConfirmModal } from '../components/ReprintConfirmModal';
import { HomeIcon, PrinterIcon, UserIcon, VoidIcon, DocIcon, CashIcon } from '../components/icons';

/* ── types ──────────────────────────────────────────────────────────────── */

export interface TransactionDetailsProps {
    group: DeclarantGroup;
    transactionsByRef: Map<string, Transaction>;
    onClose: () => void;
    onReprint: (transactionId: string, docId: string) => void | Promise<void>;
    onVoid: (transaction: Transaction) => void;
    onVoidAll: () => void;
}

/* ── helpers ─────────────────────────────────────────────────────────────── */

function fmt(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: '2-digit' });
}

function dash(val: string | number | null | undefined): string {
    if (val === null || val === undefined || val === '') return '—';
    return String(val);
}

function fmtCurrency(val: number | null | undefined): string {
    if (val === null || val === undefined || isNaN(val)) return '—';
    return `₱${val.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const PROPERTY_SOURCE_LABEL: Record<string, string> = {
    TAX_DECLARATION: 'Tax Declaration on file',
    LAND_HOLDING: 'Certificate of Land Holding — landholding details only',
    NO_LANDHOLDING: 'Certificate of No Landholding — no property on record',
    UNKNOWN: '',
};

/** Small pill next to each document's Reprint button — replaces the old
    plain-text "Reprinted N× / Not reprinted" line with something scannable. */
function ReprintCountBadge({
    count,
    expanded,
    onToggle,
}: {
    count: number;
    expanded: boolean;
    onToggle: () => void;
}) {
    if (count <= 0) {
        return <span className="td-docitem-meta">Not reprinted</span>;
    }
    return (
        <button type="button" className="td-reprint-badge td-reprint-badge--btn" onClick={onToggle}>
            <PrinterIcon size={10} /> {count}× {expanded ? '▲' : '▼'}
        </button>
    );
}

/** Expandable list of each individual reprint for a document — shows the
    constructed reference number (base + "-R{n}") and, if that reprint
    transaction has gone through payment, its OR number and release status. */
function ReprintHistoryList({
    originalReference,
    reprintCount,
    transactionsByRef,
}: {
    originalReference: string;
    reprintCount: number;
    transactionsByRef: Map<string, Transaction>;
}) {
    if (reprintCount <= 0) return null;

    const entries = Array.from({ length: reprintCount }, (_, i) => {
        const n = i + 1;
        const reference = `${originalReference}-R${n}`;
        const reprintTxn = transactionsByRef.get(reference);
        return { n, reference, reprintTxn };
    });

    return (
        <div className="td-reprint-history">
            {entries.map(({ n, reference, reprintTxn }) => (
                <div key={n} className="td-reprint-history-row">
                    <span className="td-reprint-history-ref">{reference}</span>
                    <span className="td-reprint-history-or">
                        {reprintTxn?.payment.orNumber || 'OR pending'}
                    </span>
                    <span className="td-reprint-history-status">
                        {reprintTxn
                            ? reprintTxn.status === 'Released'
                                ? `Released ${fmt(reprintTxn.dateReleased)}`
                                : reprintTxn.status
                            : 'Not yet on record'}
                    </span>
                </div>
            ))}
        </div>
    );
}

/* ── Landholding Rows sub-table ── */
function LandholdingRowsTable({ rows }: { rows: LandholdingRow[] }) {
    if (!rows.length) return null;

    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid #EDEBFB' }}>
                        {['#', 'ARP / TD No.', 'Location', 'Lot No.', 'Title No.', 'Area', 'Assessed Value'].map((h) => (
                            <th
                                key={h}
                                style={{
                                    textAlign: 'left',
                                    padding: '6px 10px',
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.03em',
                                    color: '#94a3b8',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, idx) => (
                        <tr key={row.id} style={{ borderBottom: '1px solid #F4F3FB' }}>
                            <td style={{ padding: '8px 10px', color: '#94a3b8', fontWeight: 600 }}>{row.rowOrder ?? idx + 1}</td>
                            <td style={{ padding: '8px 10px', color: '#1e293b', fontWeight: 600 }}>{dash(row.tdArpNumber)}</td>
                            <td style={{ padding: '8px 10px', color: '#1e293b' }}>{dash(row.location)}</td>
                            <td style={{ padding: '8px 10px', color: '#1e293b' }}>{dash(row.lotNumber)}</td>
                            <td style={{ padding: '8px 10px', color: '#1e293b' }}>{dash(row.titleNumber)}</td>
                            <td style={{ padding: '8px 10px', color: '#1e293b' }}>{dash(row.area)}</td>
                            <td style={{ padding: '8px 10px', color: '#1e293b', fontWeight: 600 }}>{fmtCurrency(row.assessedValue)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/* ── Assessment Rows sub-table ── */
function AssessmentRowsTable({ rows }: { rows: AssessmentRow[] }) {
    if (!rows.length) return null;

    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid #EDEBFB' }}>
                        {['#', 'Classification', 'Actual Use', 'Area', 'Market Value', 'Assessment Level', 'Assessed Value', 'Kind of Property'].map((h) => (
                            <th
                                key={h}
                                style={{
                                    textAlign: 'left',
                                    padding: '6px 10px',
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.03em',
                                    color: '#94a3b8',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, idx) => (
                        <tr key={row.id} style={{ borderBottom: '1px solid #F4F3FB' }}>
                            <td style={{ padding: '8px 10px', color: '#94a3b8', fontWeight: 600 }}>{row.rowOrder ?? idx + 1}</td>
                            <td style={{ padding: '8px 10px', color: '#1e293b', fontWeight: 600 }}>{dash(row.classification)}</td>
                            <td style={{ padding: '8px 10px', color: '#1e293b' }}>
                                {dash(row.actualUse)}
                                {row.actualUseOtherText ? ` (${row.actualUseOtherText})` : ''}
                            </td>
                            <td style={{ padding: '8px 10px', color: '#1e293b' }}>
                                {dash(row.area)}{row.areaUnit ? ` ${row.areaUnit}` : ''}
                            </td>
                            <td style={{ padding: '8px 10px', color: '#1e293b' }}>{fmtCurrency(row.marketValue)}</td>
                            <td style={{ padding: '8px 10px', color: '#1e293b' }}>
                                {row.assessmentLevel !== null && row.assessmentLevel !== undefined ? `${row.assessmentLevel}%` : '—'}
                            </td>
                            <td style={{ padding: '8px 10px', color: '#1e293b', fontWeight: 600 }}>{fmtCurrency(row.assessedValue)}</td>
                            <td style={{ padding: '8px 10px', color: '#1e293b' }}>{dash(row.kindOfProperty)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/* ── Property Information card ── */
function PropertyCard({ property }: { property: PropertyInfo }) {
    const sourceNote = property.source && PROPERTY_SOURCE_LABEL[property.source];

    return (
        <div className="td-section">
            <h3 className="td-section-title">
                <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <HomeIcon /> Property Information
                </span>
            </h3>

            {sourceNote && (
                <div className="td-empty-note" style={{ marginBottom: '10px' }}>
                    {sourceNote}
                </div>
            )}

            {property.source === 'NO_LANDHOLDING' ? (
                <div className="td-empty-note">No property record is associated with this request.</div>

            ) : property.source === 'LAND_HOLDING' ? (
                <>
                    <div className="td-grid">
                        <div>
                            <div className="td-field-label">Owner on Record</div>
                            <div className="td-field-value">{dash(property.ownerOnRecord)}</div>
                        </div>
                        <div>
                            <div className="td-field-label">Total Assessed Value</div>
                            <div className="td-field-value">{fmtCurrency(property.assessedValue)}</div>
                        </div>
                    </div>

                    {!!property.landholdingRows?.length ? (
                        <>
                            <div style={{
                                fontSize: '0.7rem', fontWeight: 600, color: '#7A76A8',
                                textTransform: 'uppercase', letterSpacing: '0.03em',
                                marginTop: '18px', marginBottom: '8px', paddingTop: '14px',
                                borderTop: '1px solid #EDEBFB',
                            }}>
                                Land Parcels ({property.landholdingRows.length})
                            </div>
                            <LandholdingRowsTable rows={property.landholdingRows} />
                        </>
                    ) : (
                        // Fallback for older records without landholdingRows populated yet
                        <div className="td-grid" style={{ marginTop: '14px' }}>
                            <div>
                                <div className="td-field-label">ARP / TD No.</div>
                                <div className="td-field-value">{dash(property.taxDeclarationNo)}</div>
                            </div>
                            <div>
                                <div className="td-field-label">Lot No.</div>
                                <div className="td-field-value">{dash(property.lotNo)}</div>
                            </div>
                            <div>
                                <div className="td-field-label">Title No.</div>
                                <div className="td-field-value">{dash(property.titleNumber)}</div>
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <div className="td-field-label">Property Location</div>
                                <div className="td-field-value">{dash(property.location)}</div>
                            </div>
                            <div>
                                <div className="td-field-label">Area</div>
                                <div className="td-field-value">{dash(property.area)}</div>
                            </div>
                        </div>
                    )}
                </>

            ) : property.source === 'TAX_DECLARATION' ? (
                <>
                    <div className="td-grid">
                        <div>
                            <div className="td-field-label">Tax Declaration No. (ARP)</div>
                            <div className="td-field-value">{dash(property.taxDeclarationNo)}</div>
                        </div>
                        <div>
                            <div className="td-field-label">Property Index No. (PIN)</div>
                            <div className="td-field-value">{dash(property.pin)}</div>
                        </div>
                        <div>
                            <div className="td-field-label">OCT / TCT / CLOA No.</div>
                            <div className="td-field-value">{dash(property.octTctNumber)}</div>
                        </div>
                        <div>
                            <div className="td-field-label">Title No.</div>
                            <div className="td-field-value">{dash(property.titleNumber)}</div>
                        </div>
                        <div>
                            <div className="td-field-label">Survey No.</div>
                            <div className="td-field-value">{dash(property.surveyNumber)}</div>
                        </div>
                        <div>
                            <div className="td-field-label">Lot No.</div>
                            <div className="td-field-value">{dash(property.lotNo)}</div>
                        </div>
                        <div>
                            <div className="td-field-label">Block No.</div>
                            <div className="td-field-value">{dash(property.blockNumber)}</div>
                        </div>
                        <div>
                            <div className="td-field-label">Owner on Record</div>
                            <div className="td-field-value">{dash(property.ownerOnRecord)}</div>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <div className="td-field-label">Owner Address</div>
                            <div className="td-field-value">{dash(property.ownerAddress)}</div>
                        </div>
                        <div>
                            <div className="td-field-label">Owner TIN</div>
                            <div className="td-field-value">{dash(property.ownerTin)}</div>
                        </div>
                        <div>
                            <div className="td-field-label">Owner Telephone</div>
                            <div className="td-field-value">{dash(property.ownerTelephone)}</div>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <div className="td-field-label">Property Location</div>
                            <div className="td-field-value">{dash(property.location)}</div>
                        </div>
                        <div>
                            <div className="td-field-label">Total Market Value</div>
                            <div className="td-field-value">{fmtCurrency(property.marketValue)}</div>
                        </div>
                        <div>
                            <div className="td-field-label">Total Assessed Value</div>
                            <div className="td-field-value">{fmtCurrency(property.assessedValue)}</div>
                        </div>
                        <div>
                            <div className="td-field-label">Taxability</div>
                            <div className="td-field-value">{dash(property.taxability)}</div>
                        </div>
                    </div>

                    {!!property.assessmentRows?.length && (
                        <>
                            <div style={{
                                fontSize: '0.7rem', fontWeight: 600, color: '#7A76A8',
                                textTransform: 'uppercase', letterSpacing: '0.03em',
                                marginTop: '18px', marginBottom: '8px', paddingTop: '14px',
                                borderTop: '1px solid #EDEBFB',
                            }}>
                                Assessment Rows ({property.assessmentRows.length})
                            </div>
                            <AssessmentRowsTable rows={property.assessmentRows} />
                        </>
                    )}

                    {property.administratorName && (
                        <>
                            <div style={{
                                fontSize: '0.7rem', fontWeight: 600, color: '#7A76A8',
                                textTransform: 'uppercase', letterSpacing: '0.03em',
                                marginTop: '18px', marginBottom: '8px', paddingTop: '14px',
                                borderTop: '1px solid #EDEBFB',
                            }}>
                                Administrator on Record
                            </div>
                            <div className="td-grid">
                                <div>
                                    <div className="td-field-label">Administrator Name</div>
                                    <div className="td-field-value">{dash(property.administratorName)}</div>
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <div className="td-field-label">Administrator Address</div>
                                    <div className="td-field-value">{dash(property.administratorAddress)}</div>
                                </div>
                                <div>
                                    <div className="td-field-label">Administrator TIN</div>
                                    <div className="td-field-value">{dash(property.administratorTin)}</div>
                                </div>
                                <div>
                                    <div className="td-field-label">Administrator Telephone</div>
                                    <div className="td-field-value">{dash(property.administratorTelephone)}</div>
                                </div>
                            </div>
                        </>
                    )}

                    {(property.boundaryNorth || property.boundarySouth || property.boundaryEast || property.boundaryWest) && (
                        <>
                            <div style={{
                                fontSize: '0.7rem', fontWeight: 600, color: '#7A76A8',
                                textTransform: 'uppercase', letterSpacing: '0.03em',
                                marginTop: '18px', marginBottom: '8px', paddingTop: '14px',
                                borderTop: '1px solid #EDEBFB',
                            }}>
                                Property Boundaries
                            </div>
                            <div className="td-grid">
                                <div>
                                    <div className="td-field-label">North</div>
                                    <div className="td-field-value">{dash(property.boundaryNorth)}</div>
                                </div>
                                <div>
                                    <div className="td-field-label">South</div>
                                    <div className="td-field-value">{dash(property.boundarySouth)}</div>
                                </div>
                                <div>
                                    <div className="td-field-label">East</div>
                                    <div className="td-field-value">{dash(property.boundaryEast)}</div>
                                </div>
                                <div>
                                    <div className="td-field-label">West</div>
                                    <div className="td-field-value">{dash(property.boundaryWest)}</div>
                                </div>
                            </div>
                        </>
                    )}

                    <div style={{
                        fontSize: '0.7rem', fontWeight: 600, color: '#7A76A8',
                        textTransform: 'uppercase', letterSpacing: '0.03em',
                        marginTop: '18px', marginBottom: '8px', paddingTop: '14px',
                        borderTop: '1px solid #EDEBFB',
                    }}>
                        Additional Assessment Details
                    </div>
                    <div className="td-grid">
                        <div>
                            <div className="td-field-label">Effectivity Year</div>
                            <div className="td-field-value">{dash(property.effectivityYear)}</div>
                        </div>
                        <div>
                            <div className="td-field-label">Cancelled TD Number</div>
                            <div className="td-field-value">{dash(property.cancelledTdNumber)}</div>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <div className="td-field-label">Amount in Words</div>
                            <div className="td-field-value">{dash(property.amountInWords)}</div>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <div className="td-field-label">Memoranda</div>
                            <div className="td-field-value">{dash(property.memoranda)}</div>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <div className="td-field-label">Notes</div>
                            <div className="td-field-value">{dash(property.notes)}</div>
                        </div>
                        <div>
                            <div className="td-field-label">Assessor Name</div>
                            <div className="td-field-value">{dash(property.assessorName)}</div>
                        </div>
                        <div>
                            <div className="td-field-label">Assessor Title</div>
                            <div className="td-field-value">{dash(property.assessorTitle)}</div>
                        </div>
                    </div>
                </>

            ) : (
                <div className="td-grid">
                    <div>
                        <div className="td-field-label">Owner on Record</div>
                        <div className="td-field-value">{dash(property.ownerOnRecord)}</div>
                    </div>
                    <div>
                        <div className="td-field-label">Property Location</div>
                        <div className="td-field-value">{dash(property.location)}</div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── component ──────────────────────────────────────────────────────────── */

export function TransactionDetails({
    group,
    transactionsByRef,   // ← was missing
    onClose,
    onReprint,
    onVoid,
    onVoidAll,
}: TransactionDetailsProps) {
    const { transactions } = group;

    const [reprintTarget, setReprintTarget] = useState<{
        transaction: Transaction;
        doc: Transaction['requestedDocuments'][number];
    } | null>(null);

    const [expandedDocId, setExpandedDocId] = useState<string | null>(null);   // ← was missing

    if (!transactions.length) return null;

    return (
        <div className="td-overlay" onClick={onClose}>
            <div className="td-panel" onClick={(e) => e.stopPropagation()}>

                {/* ── sticky header ── */}
                <div className="td-header">
                    <div>
                        <div className="td-header-ref" style={{ fontSize: '1.1rem' }}>
                            {group.declarantName}
                        </div>
                        <div className="td-header-sub">
                            {transactions.length} released {transactions.length === 1 ? 'transaction' : 'transactions'}
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <button className="td-close-btn" onClick={onClose} aria-label="Close details">✕</button>
                        <button
                            type="button"
                            className="td-header-void-btn"
                            onClick={onVoidAll}
                            title="Void all documents for this declarant"
                            aria-label="Void all documents"
                        >
                            <VoidIcon />
                        </button>
                    </div>
                </div>

                <div className="td-body">
                    {transactions.map((t) => {
                        const totalReprints = t.requestedDocuments.reduce((sum, d) => sum + (d.reprintCount || 0), 0);

                        return (
                            <div key={t.id} className="td-transaction-block">

                                {/* Per-transaction header: reference number + staff/date + reprint summary */}
                                <div className="td-transaction-block-header">
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div className="td-header-ref" style={{ color: 'var(--db-primary, #29237A)', fontSize: '1rem' }}>
                                                {t.referenceNumber}
                                            </div>
                                            {totalReprints > 0 && (
                                                <span
                                                    className="td-reprint-summary-badge"
                                                    title="Total reprints across all documents in this transaction"
                                                >
                                                    <PrinterIcon size={10} /> {totalReprints} reprint{totalReprints !== 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>
                                        <div className="td-header-sub" style={{ color: '#7A76A8' }}>
                                            Assigned to {t.assignedStaff} &nbsp;·&nbsp; Requested {fmt(t.dateRequested)}
                                            {t.dateReleased && (
                                                <>
                                                    &nbsp;·&nbsp; Released {fmt(t.dateReleased)}
                                                    {t.releasedBy && <> by {t.releasedBy}</>}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* ── Card 1: Client Information ── */}
                                <div className="td-section">
                                    <h3 className="td-section-title">
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                            <UserIcon /> Client Information
                                        </span>
                                    </h3>
                                    <div className="td-grid">
                                        <div>
                                            <div className="td-field-label">Declarant Name</div>
                                            <div className="td-field-value">{t.client.declarantName || '—'}</div>
                                        </div>
                                        <div>
                                            <div className="td-field-label">Requested By</div>
                                            <div className="td-field-value">{t.client.requestedBy || '—'}</div>
                                        </div>
                                        <div>
                                            <div className="td-field-label">Authorization on File</div>
                                            <div className="td-field-value">
                                                {t.client.authorizationOnFile ? 'Yes' : 'Not Required'}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="td-field-label">Reason / Purpose</div>
                                            <div className="td-field-value">{t.reasonPurpose || '—'}</div>
                                        </div>
                                        {t.client.address && (
                                            <div style={{ gridColumn: '1 / -1' }}>
                                                <div className="td-field-label">Address</div>
                                                <div className="td-field-value">{t.client.address}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* ── Card 2: Property Information ── */}
                                <PropertyCard property={t.property} />

                                {/* ── Card 3: Requested Documents ── */}
                                <div className="td-section">
                                    <h3 className="td-section-title">
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                            <DocIcon /> Requested Documents
                                        </span>
                                        <span style={{
                                            fontSize: '0.7rem', fontWeight: 600,
                                            color: '#7A76A8', textTransform: 'none', letterSpacing: 0,
                                        }}>
                                            {t.requestedDocuments.length} {t.requestedDocuments.length === 1 ? 'document' : 'documents'}
                                        </span>
                                    </h3>
                                    <div className="td-doclist">
                                        {t.requestedDocuments.length === 0 && (
                                            <div className="td-empty-note">No documents recorded.</div>
                                        )}
                                        {t.requestedDocuments.map((doc) => (
                                            <div key={doc.id}>
                                                <div className="td-docitem">
                                                    <span className="td-docitem-name">{doc.documentType}</span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                                                        <ReprintCountBadge
                                                            count={doc.reprintCount}
                                                            expanded={expandedDocId === doc.id}
                                                            onToggle={() =>
                                                                setExpandedDocId((cur) => (cur === doc.id ? null : doc.id))
                                                            }
                                                        />
                                                        <button
                                                            type="button"
                                                            className="td-link-btn"
                                                            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                                                            onClick={() => setReprintTarget({ transaction: t, doc })}
                                                        >
                                                            <PrinterIcon size={13} /> Reprint
                                                        </button>
                                                    </div>
                                                </div>
                                                {expandedDocId === doc.id && (
                                                    <ReprintHistoryList
                                                        originalReference={t.referenceNumber}
                                                        reprintCount={doc.reprintCount}
                                                        transactionsByRef={transactionsByRef}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* ── Card 4: Payment Information ── */}
                                <div className="td-section">
                                    <h3 className="td-section-title">
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                            <CashIcon /> Payment Information
                                        </span>
                                    </h3>
                                    <div className="td-grid">
                                        <div>
                                            <div className="td-field-label">Official Receipt (OR) Number</div>
                                            <div className="td-field-value">{t.payment.orNumber || 'Not yet issued'}</div>
                                        </div>
                                        <div>
                                            <div style={{ marginBottom: '12px' }}>
                                                <div className="td-field-label">Payment Method</div>
                                                <div className="td-field-value">{t.payment.paymentMethod || '—'}</div>
                                            </div>
                                            <div>
                                                <div className="td-field-label">Payment Date</div>
                                                <div className="td-field-value">{fmt(t.payment.paymentDate)}</div>
                                            </div>
                                            <div>
                                                <div className="td-field-label">Date Requested</div>
                                                <div className="td-field-value">{fmt(t.dateRequested)}</div>
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ marginBottom: '12px' }}>
                                                <div className="td-field-label">Released By</div>
                                                <div className="td-field-value">{t.releasedBy || '—'}</div>
                                            </div>
                                            <div>
                                                <div className="td-field-label">Date Released</div>
                                                <div className="td-field-value">{fmt(t.dateReleased)}</div>
                                            </div>
                                        </div>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <div className="td-field-label">OR Justification</div>
                                            <div className="td-field-value">{t.payment.orJustification || 'None'}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* ── Card 5: Actions ── */}
                                <div className="td-section" style={{ background: '#fff8f8', borderColor: '#FECDCA' }}>
                                    <h3 className="td-section-title" style={{ color: '#B0281C', marginBottom: '10px' }}>
                                        Actions
                                    </h3>
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '8px 12px',
                                            background: '#FFF1F0',
                                            border: '1px solid #FECDCA',
                                            borderRadius: '9px',
                                        }}
                                    >
                                        <span style={{
                                            fontFamily: "'Courier New', monospace",
                                            fontWeight: 700,
                                            fontSize: '0.82rem',
                                            color: '#1e293b',
                                            letterSpacing: '0.02em',
                                        }}>
                                            {t.referenceNumber}
                                        </span>
                                        <button
                                            type="button"
                                            className="td-void-btn"
                                            onClick={() => onVoid(t)}
                                        >
                                            Void this transaction
                                        </button>
                                    </div>
                                </div>

                            </div>
                        );
                    })}
                </div>
            </div>

            {reprintTarget && (
                <ReprintConfirmModal
                    open={!!reprintTarget}
                    documentLabel={`${reprintTarget.doc.documentType} - ${reprintTarget.transaction.referenceNumber}`}
                    declarantName={reprintTarget.transaction.client.declarantName}
                    requestedBy={reprintTarget.transaction.client.requestedBy}
                    onCancel={() => setReprintTarget(null)}
                    onConfirm={async () => {
                        await onReprint(reprintTarget.transaction.id, reprintTarget.doc.id);
                        setReprintTarget(null);
                    }}
                />
            )}
        </div>
    );
}