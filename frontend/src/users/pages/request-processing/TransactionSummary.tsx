import { useState } from 'react';
import { useCart } from '../../hooks/TransactionCartContext';
import { requestService } from '../../services/requestService';
import type { CompletedEntryData } from '../../types/taxDeclaration';

import '../../styles/RequestFormEntry.css';
import '../../styles/LandholdingCertificate.css';
import '../../styles/TaxDeclaration.css';

interface TransactionSummaryProps {
    entryData: CompletedEntryData;
    onBackToForms: () => void;
    onProceedToQueue: () => void;
}

export function TransactionSummary({ entryData, onBackToForms, onProceedToQueue }: TransactionSummaryProps) {
    const { items, totalAmount, removeItem, clearCart } = useCart();
    const [submitting, setSubmitting] = useState(false);

    const handleSubmitToQueue = async () => {
        setSubmitting(true);
        try {
            await requestService.updateRequest(entryData.requestId, {
                ...entryData,
                status: 'PENDING_PAYMENT'
            });
            clearCart();
            onProceedToQueue();
        } catch (err) {
            alert('Failed to submit transaction to queue.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="rfe-page">
            <div className="rfe-page-inner">
                <div className="rfe-card">
                    <div className="rfe-card-header">
                        <div className="rfe-card-header-left">
                            <div>
                                <h2 className="rfe-card-title">Transaction Summary</h2>
                                <div className="rfe-card-subtitle">Review requested documents for {entryData.declarantName}</div>
                            </div>
                        </div>
                        <span className="rfe-ref-chip">{entryData.referenceNumber}</span>
                    </div>

                    <div className="rfe-form-body">
                        <div className="lh-table-section" style={{ marginTop: '0', border: 'none' }}>
                            <div className="lh-table-header-bar">
                                <span>Requested Documents Queue</span>
                                <span style={{ fontSize: '0.85rem', fontWeight: 'normal', opacity: 0.8 }}>{items.length} Item(s)</span>
                            </div>

                            <div style={{ overflowX: 'auto' }}>
                                <table className="lh-property-table">
                                    <thead>
                                        <tr>
                                            <th style={{ minWidth: 250 }}>Document Type</th>
                                            <th style={{ minWidth: 150 }} className="lh-td-right">Fee (₱)</th>
                                            <th style={{ width: 60, textAlign: 'center' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.length === 0 ? (
                                            <tr><td colSpan={3} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>No documents added yet. Go back to add documents.</td></tr>
                                        ) : (
                                            items.map((item) => (
                                                <tr key={item.id}>
                                                    <td style={{ fontWeight: 500, color: '#1e293b' }}>{item.documentType}</td>
                                                    <td className="lh-td-right" style={{ color: '#059669', fontWeight: 600 }}>{item.fee.toFixed(2)}</td>
                                                    <td style={{ textAlign: 'center' }}><button type="button" className="lh-row-remove-btn" onClick={() => removeItem(item.id)} title="Remove document">✕</button></td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {items.length > 0 && (
                            <div className="td-summary-row" style={{ marginTop: '20px', justifyContent: 'flex-end', padding: '16px 24px' }}>
                                <div className="td-amount-words-block" style={{ flex: 'none', alignItems: 'flex-end' }}>
                                    <span className="td-amount-words-label" style={{ fontSize: '1rem' }}>Total Amount Due</span>
                                    <div className="td-amount-words-value" style={{ fontSize: '1.5rem', color: '#29237a' }}>
                                        ₱ {totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="rfe-footer">
                        <button className="btn-reset-form" onClick={onBackToForms} disabled={submitting}>← Add More Documents</button>
                        <button className="btn-proceed" onClick={handleSubmitToQueue} disabled={submitting || items.length === 0}>{submitting ? 'Submitting to Queue...' : 'Confirm & Send to Cashier →'}</button>
                    </div>
                </div>
            </div>
        </div>
    );
}