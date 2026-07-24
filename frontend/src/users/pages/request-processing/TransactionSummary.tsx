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

// --- Inline SVG icons (replacing emoji for consistent, crisp rendering) ---

function UserIcon({ size = 20, color = '#29237a' }: { size?: number; color?: string }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ verticalAlign: 'middle', flexShrink: 0 }}
        >
            <circle cx="12" cy="8" r="4" stroke={color} strokeWidth="2" />
            <path
                d="M4 20c0-3.3137 3.5817-6 8-6s8 2.6863 8 6"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    );
}

function DocumentIcon({ size = 20, color = '#1e293b' }: { size?: number; color?: string }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ verticalAlign: 'middle', flexShrink: 0 }}
        >
            <path
                d="M6 2.75h8.5L19 7.25V19.5a1.75 1.75 0 0 1-1.75 1.75H6.75A1.75 1.75 0 0 1 5 19.5V4.5A1.75 1.75 0 0 1 6.75 2.75Z"
                stroke={color}
                strokeWidth="2"
                strokeLinejoin="round"
            />
            <path d="M14 2.75V7.5h4.75" stroke={color} strokeWidth="2" strokeLinejoin="round" />
            <path d="M8.5 12.5h7M8.5 16h7" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
    );
}

export function TransactionSummary({ entryData, onBackToForms, onProceedToQueue }: TransactionSummaryProps) {
    const { items, totalAmount, removeItem, clearCart } = useCart();
    const [submitting, setSubmitting] = useState(false);

    // Safely resolve the primary requester from the cart, falling back to entryData
    const requesterName = items[0]?.requestedByName || entryData.requestedByName || 'N/A';

    const handleSubmitToQueue = async () => {
        setSubmitting(true);
        try {
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
            <div className="rfe-page-inner" style={{ maxWidth: '1100px', margin: '0 auto' }}>
                <div className="rfe-card" style={{ boxShadow: '0 10px 25px -3px rgba(0,0,0,0.1)', borderRadius: '16px' }}>

                    {/* --- HEADER --- */}
                    <div className="rfe-card-header" style={{ padding: '28px 36px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <div>
                            <h2 className="rfe-card-title" style={{ fontSize: '1.7rem', fontWeight: 800, marginBottom: '6px' }}>
                                Transaction Summary
                            </h2>
                            <div className="rfe-card-subtitle" style={{ opacity: 0.9, fontSize: '0.95rem' }}>
                                Review and confirm document queue details before cashier submission
                            </div>
                        </div>
                    </div>

                    <div className="rfe-form-body" style={{ padding: '36px' }}>

                        {/* --- REQUESTER DETAILS HERO STRIP --- */}
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '20px', background: '#f8fafc', padding: '20px 28px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '28px' }}>
                            <div>
                                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Transaction Requester / Client</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', color: '#29237a', fontWeight: 800, marginTop: '2px' }}>
                                    <UserIcon size={20} color="#29237a" /> {requesterName}
                                </div>
                            </div>
                            <div style={{ borderLeft: '1px solid #cbd5e1', paddingLeft: '20px' }}>
                                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Documents</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', color: '#1e293b', fontWeight: 800, marginTop: '2px' }}>
                                    <DocumentIcon size={20} color="#1e293b" /> {items.length} Record(s)
                                </div>
                            </div>
                            <div style={{ borderLeft: '1px solid #cbd5e1', paddingLeft: '20px' }}>
                                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payment Status</span>
                                <div style={{ fontSize: '1rem', color: '#d97706', fontWeight: 700, marginTop: '4px', background: '#fef3c7', padding: '2px 10px', borderRadius: '99px', display: 'inline-block' }}>
                                    Awaiting Cashier
                                </div>
                            </div>
                        </div>

                        {/* --- TABLE SECTION --- */}
                        <div className="lh-table-section" style={{ marginTop: '0', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="lh-property-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ background: '#f1f5f9' }}>
                                        <tr>
                                            <th style={{ padding: '16px 24px', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}>Reference No.</th>
                                            <th style={{ padding: '16px 24px', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}>Declarant (Document Owner)</th>
                                            <th style={{ padding: '16px 24px', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}>Document Type</th>
                                            <th style={{ padding: '16px 24px', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700, textAlign: 'right' }}>Fee (₱)</th>
                                            <th style={{ width: 80, padding: '16px 24px', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700, textAlign: 'center' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                                                    No documents added yet. Click "Add Another Document" below to begin.
                                                </td>
                                            </tr>
                                        ) : (
                                            items.map((item) => (
                                                <tr key={item.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                                                    {/* Atomic Reference No */}
                                                    <td style={{ padding: '16px 24px', fontWeight: 700, color: '#29237a', fontFamily: 'monospace', fontSize: '1.05rem' }}>
                                                        {item.referenceNumber}
                                                    </td>
                                                    {/* Declarant Name */}
                                                    <td style={{ padding: '16px 24px', fontWeight: 700, color: '#334155' }}>
                                                        {item.declarantName || 'N/A'}
                                                    </td>
                                                    {/* Document Type */}
                                                    <td style={{ padding: '16px 24px', fontWeight: 500, color: '#475569' }}>
                                                        <span style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: '6px', fontSize: '0.9rem' }}>
                                                            {item.documentType}
                                                        </span>
                                                    </td>
                                                    {/* Fee */}
                                                    <td style={{ padding: '16px 24px', color: '#059669', fontWeight: 800, textAlign: 'right', fontSize: '1.1rem' }}>
                                                        ₱ {item.fee.toFixed(2)}
                                                    </td>
                                                    {/* Remove Button */}
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
                            <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'flex-end', padding: '20px 28px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Total Amount Due</span>
                                    <div style={{ fontSize: '2.4rem', color: '#29237a', fontWeight: 900, marginTop: '4px' }}>
                                        ₱ {totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* --- FOOTER ACTIONS --- */}
                    <div className="rfe-footer" style={{ padding: '24px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', borderTop: '1px solid #e2e8f0', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>

                        {/* Go Back / Add Another Button */}
                        <button
                            onClick={onBackToForms}
                            disabled={submitting}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '14px 28px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.95rem' }}
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
                            style={{ padding: '14px 32px', fontSize: '1.05rem', borderRadius: '8px', fontWeight: 800, boxShadow: '0 4px 12px rgba(41, 35, 122, 0.2)' }}
                        >
                            {submitting ? 'Submitting to Queue...' : 'Confirm & Send to Cashier →'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}