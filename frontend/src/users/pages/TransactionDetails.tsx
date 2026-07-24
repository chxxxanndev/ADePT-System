import type { Transaction } from '../types/transaction';
import { StatusBadge } from '../components/StatusBadge';

interface TransactionDetailsProps {
    transaction: Transaction;
    onClose: () => void;
    onViewClientHistory?: (declarantName: string) => void;
}

export function TransactionDetails({ transaction, onClose, onViewClientHistory }: TransactionDetailsProps) {
    const { client, property, payment, generatedDocuments, activityTimeline } = transaction;

    return (
        <div className="td-overlay" onClick={onClose}>
            {/* The 'stopPropagation' prevents the panel from closing when clicking inside it */}
            <div className="td-panel" onClick={(e) => e.stopPropagation()}>
                <div className="td-header">
                    <div>
                        <div className="td-header-ref">{transaction.referenceNumber}</div>
                        <div className="td-header-sub">
                            Requested {transaction.dateRequested} · Assigned to {transaction.assignedStaff}
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <StatusBadge status={transaction.status} />
                        <button className="td-close-btn" onClick={onClose} aria-label="Close details">✕</button>
                    </div>
                </div>

                <div className="td-body">
                    {/* Client Information - CLEANED UP */}
                    <div className="td-section">
                        <h3 className="td-section-title">
                            Client Information
                            {onViewClientHistory && (
                                <button
                                    type="button"
                                    className="td-link-btn"
                                    onClick={() => onViewClientHistory(client.declarantName)}
                                >
                                    View client history →
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
                                <div className="td-field-label">Payment Date</div>
                                <div className="td-field-value">{payment.paymentDate || '—'}</div>
                            </div>
                        </div>
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
                                    {entry.actor && (
                                        <div className="td-timeline-meta">{entry.actor}</div>
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