import type { Transaction } from '../types/transaction';
import { StatusBadge } from '../components/StatusBadge';

interface TransactionDetailsProps {
    transaction: Transaction;
    onClose: () => void;
    onViewClientHistory?: (declarantName: string) => void;
}

// Note: this renders as a slide-over panel for now (no routing set up yet).
// Later this can become its own routed page at /transactions/:id and just
// receive `transaction` as a prop the same way — no internal changes needed.
export function TransactionDetails({ transaction, onClose, onViewClientHistory }: TransactionDetailsProps) {
    const { client, property, payment, generatedDocuments, activityTimeline } = transaction;

    return (
        <div className="td-overlay" onClick={onClose}>
            <div className="td-panel" onClick={(e) => e.stopPropagation()}>
                <div className="td-header">
                    <div>
                        <div className="td-header-ref">{transaction.referenceNumber}</div>
                        <div className="td-header-sub">Requested {transaction.dateRequested} · Assigned to {transaction.assignedStaff}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <StatusBadge status={transaction.status} />
                        <button className="td-close-btn" onClick={onClose} aria-label="Close details">✕</button>
                    </div>
                </div>

                <div className="td-body">
                    {/* Client Information */}
                    <div className="td-section">
                        <h3 className="td-section-title">
                            Client Information
                            {onViewClientHistory && (
                                <button
                                    type="button"
                                    className="td-link-btn"
                                    onClick={() => onViewClientHistory(client.declarantName)}
                                >
                                    View all requests by this client →
                                </button>
                            )}
                        </h3>
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
                                <div className="td-field-label">Contact Number</div>
                                <div className="td-field-value">{client.contactNumber || '—'}</div>
                            </div>
                            <div>
                                <div className="td-field-label">Relationship to Declarant</div>
                                <div className="td-field-value">{client.relationshipToDeclarant || '—'}</div>
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <div className="td-field-label">Address</div>
                                <div className="td-field-value">{client.address || '—'}</div>
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

                    {/* Property Information */}
                    <div className="td-section">
                        <h3 className="td-section-title">Property Information</h3>
                        <div className="td-grid">
                            <div>
                                <div className="td-field-label">Tax Declaration No.</div>
                                <div className="td-field-value">{property.taxDeclarationNo}</div>
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

                    {/* Requested Documents */}
                    <div className="td-section">
                        <h3 className="td-section-title">Requested Documents</h3>
                        <div className="td-doclist">
                            {transaction.requestedDocuments.map((doc) => (
                                <div key={doc} className="td-docitem">
                                    <span className="td-docitem-name">{doc}</span>
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
                                <div className="td-field-value">₱{payment.amountDue.toFixed(2)}</div>
                            </div>
                            <div>
                                <div className="td-field-label">Amount Paid</div>
                                <div className="td-field-value">₱{payment.amountPaid.toFixed(2)}</div>
                            </div>
                            <div>
                                <div className="td-field-label">Payment Date</div>
                                <div className="td-field-value">{payment.paymentDate || '—'}</div>
                            </div>
                            <div>
                                <div className="td-field-label">Verified By</div>
                                <div className="td-field-value">{payment.verifiedBy || '—'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Generated Documents */}
                    <div className="td-section">
                        <h3 className="td-section-title">Generated Documents</h3>
                        {generatedDocuments.length === 0 ? (
                            <p className="td-empty-note">No documents generated yet for this transaction.</p>
                        ) : (
                            <div className="td-doclist">
                                {generatedDocuments.map((doc) => (
                                    <div key={doc.id} className="td-docitem">
                                        <div>
                                            <div className="td-docitem-name">{doc.documentName}</div>
                                            <div className="td-docitem-meta">{doc.fileRef} · Generated {doc.dateGenerated} by {doc.generatedBy}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Activity Timeline */}
                    <div className="td-section">
                        <h3 className="td-section-title">Activity Timeline</h3>
                        <div className="td-timeline">
                            {activityTimeline.map((entry) => (
                                <div key={entry.id} className="td-timeline-item">
                                    <span className="td-timeline-dot" />
                                    <div className="td-timeline-time">{entry.time} · {entry.date}</div>
                                    <div className="td-timeline-action">{entry.action}</div>
                                    {(entry.actor || entry.note) && (
                                        <div className="td-timeline-meta">
                                            {entry.actor}{entry.actor && entry.note ? ' — ' : ''}{entry.note}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
