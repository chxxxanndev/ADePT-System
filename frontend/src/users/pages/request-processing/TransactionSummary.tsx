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
            // Send ALL items in the cart to the Cashier Queue
            await Promise.all(items.map(item =>
                requestService.updateRequest(item.id, {
                    status: 'PENDING_PAYMENT'
                })
            ));
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
            <div className="rfe-page-inner" style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <div className="rfe-card" style={{ boxShadow: '0 10px 25px -3px rgba(0,0,0,0.1)' }}>

                    {/* --- CLEAN HEADER --- */}
                    <div className="rfe-card-header" style={{ padding: '24px 32px' }}>
                        <div>
                            <h2 className="rfe-card-title" style={{ fontSize: '1.6rem', marginBottom: '4px' }}>
                                Transaction Summary
                            </h2>
                            <div className="rfe-card-subtitle" style={{ opacity: 0.9, fontSize: '0.95rem' }}>
                                Review requested documents for <strong>{entryData.declarantName}</strong>
                            </div>
                        </div>
                    </div>

                    <div className="rfe-form-body" style={{ padding: '32px' }}>
                        <div className="lh-table-section" style={{ marginTop: '0', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                            <div className="lh-table-header-bar" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '16px 24px' }}>
                                <span style={{ color: '#1e293b', fontWeight: 700 }}>Requested Documents Queue</span>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, background: '#e2e8f0', color: '#475569', padding: '4px 12px', borderRadius: '99px' }}>
                                    {items.length} Item(s)
                                </span>
                            </div>

                            {/* --- TABLE LAYOUT --- */}
                            <div style={{ overflowX: 'auto' }}>
                                <table className="lh-property-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ background: '#fff' }}>
                                        <tr>
                                            <th style={{ minWidth: 160, padding: '16px 24px', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase' }}>Reference No.</th>
                                            <th style={{ minWidth: 250, padding: '16px 24px', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase' }}>Document Type</th>
                                            <th style={{ minWidth: 120, padding: '16px 24px', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', textAlign: 'right' }}>Fee (₱)</th>
                                            <th style={{ width: 80, padding: '16px 24px', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', textAlign: 'center' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                                                    No documents added yet. Click "Add Another Document" below.
                                                </td>
                                            </tr>
                                        ) : (
                                            items.map((item) => (
                                                <tr key={item.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '16px 24px', fontWeight: 700, color: '#29237a', fontFamily: 'monospace', fontSize: '1.05rem' }}>
                                                        {item.referenceNumber}
                                                    </td>
                                                    <td style={{ padding: '16px 24px', fontWeight: 600, color: '#1e293b' }}>
                                                        {item.documentType}
                                                    </td>
                                                    <td style={{ padding: '16px 24px', color: '#059669', fontWeight: 800, textAlign: 'right', fontSize: '1.1rem' }}>
                                                        {item.fee.toFixed(2)}
                                                    </td>
                                                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeItem(item.id)}
                                                            title="Remove document"
                                                            style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                                                        >
                                                            ✕
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* --- TOTALS SECTION --- */}
                        {items.length > 0 && (
                            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', padding: '20px 24px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                    <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Total Amount Due</span>
                                    <div style={{ fontSize: '2.2rem', color: '#29237a', fontWeight: 800, marginTop: '4px' }}>
                                        ₱ {totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* --- FOOTER BUTTONS --- */}
                    <div className="rfe-footer" style={{ padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', borderTop: '1px solid #e2e8f0' }}>

                        {/* Go Back / Add Another Button */}
                        <button
                            onClick={onBackToForms}
                            disabled={submitting}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '12px 24px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseOver={(e) => e.currentTarget.style.background = '#e2e8f0'}
                            onMouseOut={(e) => e.currentTarget.style.background = '#f1f5f9'}
                        >
                            <span>+</span> Add Another Document
                        </button>

                        {/* Submit Button */}
                        <button
                            className="btn-proceed"
                            onClick={handleSubmitToQueue}
                            disabled={submitting || items.length === 0}
                            style={{ padding: '14px 28px', fontSize: '1.05rem', borderRadius: '8px', boxShadow: '0 4px 12px rgba(41, 35, 122, 0.2)' }}
                        >
                            {submitting ? 'Submitting to Queue...' : 'Confirm & Send to Cashier →'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}