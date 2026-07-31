import type { DeclarantGroup, Transaction } from '../types/transaction';
import { StatusBadge } from '../components/StatusBadge';

const PrinterIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>;
const VoidIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><line x1="7" y1="7" x2="17" y2="17"/></svg>;

// FIX: payment.paymentDate comes back as a raw ISO timestamp
// (e.g. "2026-07-31T07:33:32.919+00:00"). This formats it into a readable
// local date + time, e.g. "July 31, 2026, 3:33 PM", so the panel shows
// when the client actually paid instead of the raw ISO string.
function formatPaymentDateTime(isoDate: string | null | undefined): string {
    if (!isoDate) return '—';
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return isoDate; // fall back to raw string if unparseable
    return d.toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

interface TransactionDetailsProps {
    group: DeclarantGroup;
    onClose: () => void;
    onReprint: (transactionId: string, docId: string) => void;
    onVoid: (transaction: Transaction) => void;
}

interface TransactionBlockProps {
    transaction: Transaction;
    onReprint: (transactionId: string, docId: string) => void;
    onVoid: (transaction: Transaction) => void;
}

function TransactionBlock({ transaction, onReprint, onVoid }: TransactionBlockProps) {
    // FIX: activityTimeline no longer destructured/used — the "Activity
    // Timeline" section below has been removed from the side panel.
    const { client, property, payment } = transaction;

    // FIX: a Certificate of No Landholding declares the person owns NO
    // property, so there's nothing meaningful to show in Property
    // Information for that request. Only hide the section when every
    // requested document on this transaction is No Landholding — if it's
    // bundled with a document type that does need property details, keep
    // showing it.
    const isNoLandholdingOnly =
        transaction.requestedDocuments.length > 0 &&
        transaction.requestedDocuments.every(
            (doc) => doc.documentType === 'Certificate of No Landholding'
        );

    return (
        <div className="td-transaction-block">
            <div className="td-transaction-block-header">
                <div>
                    <div className="td-header-ref">{transaction.referenceNumber}</div>
                    <div className="td-header-sub">
                        Requested {transaction.dateRequested} · Assigned to {transaction.assignedStaff}
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <StatusBadge status={transaction.status} />
                    <button type="button" className="td-void-btn" onClick={() => onVoid(transaction)}>
                        <VoidIcon /> Void
                    </button>
                </div>
            </div>

            {/* Client Information */}
            <div className="td-section">
                <h3 className="td-section-title">Client Information</h3>
                <div className="td-grid">
                    <div>
                        <div className="td-field-label">Declarant Name</div>
                        <div className="td-field-value">{client.declarantName}</div>
                    </div>
                    <div>
                        <div className="td-field-label">Requested By</div>
                        <div className="td-field-value">{client.requestedBy}</div>
                    </div>
                    <div>
                        <div className="td-field-label">Authorization on File</div>
                        <div className="td-field-value">{client.authorizationOnFile ? 'Yes' : 'Not Needed'}</div>
                    </div>
                    <div>
                        <div className="td-field-label">Reason / Purpose</div>
                        <div className="td-field-value">{transaction.reasonPurpose || '—'}</div>
                    </div>
                </div>
            </div>

            {/* Property Information — skipped entirely for No Landholding requests */}
            {!isNoLandholdingOnly && (
                <div className="td-section">
                    <h3 className="td-section-title">Property Information</h3>
                    <div className="td-grid">
                        <div>
                            <div className="td-field-label">Tax Declaration No.</div>
                            <div className="td-field-value">{property.taxDeclarationNo || '—'}</div>
                        </div>
                        <div>
                            <div className="td-field-label">Owner on Record</div>
                            <div className="td-field-value">{property.ownerOnRecord}</div>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <div className="td-field-label">Location</div>
                            <div className="td-field-value">{property.location}</div>
                        </div>
                        <div>
                            <div className="td-field-label">Lot No.</div>
                            <div className="td-field-value">{property.lotNo || '—'}</div>
                        </div>
                        <div>
                            <div className="td-field-label">Classification</div>
                            <div className="td-field-value">{property.classification || '—'}</div>
                        </div>
                        <div>
                            <div className="td-field-label">Assessed Value</div>
                            <div className="td-field-value">
                                {property.assessedValue ? `₱${property.assessedValue.toLocaleString()}` : '—'}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Requested Documents — reprint sits beside the document type, per document */}
            <div className="td-section">
                <h3 className="td-section-title">Requested Documents</h3>
                <div className="td-doclist">
                    {transaction.requestedDocuments.map((doc) => (
                        <div key={doc.id} className="td-docitem">
                            <span className="td-docitem-name">{doc.documentType}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span className="td-docitem-meta">
                                    {doc.reprintCount > 0 ? `Reprinted ${doc.reprintCount}x` : 'Not reprinted'}
                                </span>
                                <button
                                    type="button"
                                    className="td-link-btn"
                                    onClick={() => onReprint(transaction.id, doc.id)}
                                >
                                    <PrinterIcon /> Reprint
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Payment Information */}
            <div className="td-section">
                <h3 className="td-section-title">Payment Information</h3>
                <div className="td-grid">
                    <div>
                        <div className="td-field-label">OR Number</div>
                        <div className="td-field-value">{payment.orNumber || 'Not yet issued'}</div>
                    </div>
                    <div>
                        <div className="td-field-label">Payment Method</div>
                        <div className="td-field-value">{payment.paymentMethod}</div>
                    </div>
                    <div>
                        <div className="td-field-label">Amount Due</div>
                        <div className="td-field-value">₱40.00</div>
                    </div>
                    <div>
                        <div className="td-field-label">Payment Date</div>
                        <div className="td-field-value">{formatPaymentDateTime(payment.paymentDate)}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function TransactionDetails({ group, onClose, onReprint, onVoid }: TransactionDetailsProps) {
    return (
        <div className="td-overlay" onClick={onClose}>
            <div className="td-panel" onClick={(e) => e.stopPropagation()}>
                <div className="td-header">
                    <div>
                        <div className="td-header-ref">{group.declarantName}</div>
                        <div className="td-header-sub">
                            {group.transactions.length} released {group.transactions.length === 1 ? 'request' : 'requests'}
                        </div>
                    </div>
                    <button className="td-close-btn" onClick={onClose} aria-label="Close details">✕</button>
                </div>

                <div className="td-body">
                    {group.transactions.map((t) => (
                        <TransactionBlock key={t.id} transaction={t} onReprint={onReprint} onVoid={onVoid} />
                    ))}
                </div>
            </div>
        </div>
    );
}