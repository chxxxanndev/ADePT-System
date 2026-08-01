import type { DeclarantGroup, PropertyInfo, Transaction } from '../types/transaction';

/* ── icons ─────────────────────────────────────────────────────────────── */

const PrinterIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9V2h12v7" />
        <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
        <path d="M6 14h12v8H6z" />
    </svg>
);

const UserIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
);

const HomeIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
        <path d="M9 21V12h6v9" />
    </svg>
);

const DocIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
);

const CashIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="3" />
        <path d="M6 12h.01M18 12h.01" />
    </svg>
);

/* ── types ──────────────────────────────────────────────────────────────── */

export interface TransactionDetailsProps {
    group: DeclarantGroup;
    onClose: () => void;
    onReprint: (transactionId: string, docId: string) => void;
    onVoid: (transaction: Transaction) => void;
}

/* ── helpers ─────────────────────────────────────────────────────────────── */

/** Format an ISO or date string for human-readable display. */
function fmt(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: '2-digit' });
}

/** Render a dash for anything empty/missing. */
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

/* ── Property Information card — field set depends entirely on `source`,
   since the backend (getTransactionRegistry) only ever populates the
   fields relevant to that source and leaves the rest blank. ── */
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
                // No property record exists for this request — nothing meaningful to show.
                <div className="td-empty-note">No property record is associated with this request.</div>

            ) : property.source === 'LAND_HOLDING' ? (
                // Only the fields encoded_landholding_property_rows actually has.
                <div className="td-grid">
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
                    <div>
                        <div className="td-field-label">Owner on Record</div>
                        <div className="td-field-value">{dash(property.ownerOnRecord)}</div>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                        <div className="td-field-label">Property Location</div>
                        <div className="td-field-value">{dash(property.location)}</div>
                    </div>
                    <div>
                        <div className="td-field-label">Area</div>
                        <div className="td-field-value">{dash(property.area)}</div>
                    </div>
                    <div>
                        <div className="td-field-label">Assessed Value</div>
                        <div className="td-field-value">{fmtCurrency(property.assessedValue)}</div>
                    </div>
                </div>

            ) : property.source === 'TAX_DECLARATION' ? (
                // Full field set — everything encoded_tax_declarations exposes.
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
                            <div className="td-field-label">Classification</div>
                            <div className="td-field-value">{dash(property.classification)}</div>
                        </div>
                        <div>
                            <div className="td-field-label">Area</div>
                            <div className="td-field-value">{dash(property.area)}</div>
                        </div>
                        <div>
                            <div className="td-field-label">Market Value</div>
                            <div className="td-field-value">{fmtCurrency(property.marketValue)}</div>
                        </div>
                        <div>
                            <div className="td-field-label">Assessed Value</div>
                            <div className="td-field-value">{fmtCurrency(property.assessedValue)}</div>
                        </div>
                        <div>
                            <div className="td-field-label">Taxability</div>
                            <div className="td-field-value">{dash(property.taxability)}</div>
                        </div>
                    </div>

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
                // UNKNOWN source — no TD/landholding/no-landholding record matched at
                // all. Only property_location and declarant name may be populated.
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

export function TransactionDetails({ group, onClose, onReprint, onVoid }: TransactionDetailsProps) {
    const { transactions } = group;
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
                    <button className="td-close-btn" onClick={onClose} aria-label="Close details">✕</button>
                </div>

                <div className="td-body">
                    {transactions.map((t) => (
                        <div key={t.id} className="td-transaction-block">

                            {/* Per-transaction header: reference number + staff/date */}
                            <div className="td-transaction-block-header">
                                <div>
                                    <div className="td-header-ref" style={{ color: 'var(--db-primary, #29237A)', fontSize: '1rem' }}>
                                        {t.referenceNumber}
                                    </div>
                                    <div className="td-header-sub" style={{ color: '#7A76A8' }}>
                                        Assigned to {t.assignedStaff} &nbsp;·&nbsp; Requested {fmt(t.dateRequested)}
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
                                        <div key={doc.id} className="td-docitem">
                                            <span className="td-docitem-name">{doc.documentType}</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                                                <span className="td-docitem-meta">
                                                    {doc.reprintCount > 0
                                                        ? `Reprinted ${doc.reprintCount}×`
                                                        : 'Not reprinted'}
                                                </span>
                                                <button
                                                    type="button"
                                                    className="td-link-btn"
                                                    style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                                                    onClick={() => onReprint(t.id, doc.id)}
                                                >
                                                    <PrinterIcon /> Reprint
                                                </button>
                                            </div>
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
            <div style={{ marginBottom: '12px' }}>
                <div className="td-field-label">Official Receipt (OR) Number</div>
                <div className="td-field-value">{t.payment.orNumber || 'Not yet issued'}</div>
            </div>
            <div>
                <div className="td-field-label">Verified / Released By</div>
                <div className="td-field-value">{t.payment.verifiedBy || '—'}</div>
            </div>
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
                    ))}
                </div>
            </div>
        </div>
    );
}