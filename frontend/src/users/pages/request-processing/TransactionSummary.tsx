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

// --- Inline SVG icons ---

function UserIcon({ size = 20, color = '#29237a' }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ verticalAlign: 'middle', flexShrink: 0 }}>
            <circle cx="12" cy="8" r="4" stroke={color} strokeWidth="2" />
            <path d="M4 20c0-3.3137 3.5817-6 8-6s8 2.6863 8 6" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

function DocumentIcon({ size = 20, color = '#1e293b' }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ verticalAlign: 'middle', flexShrink: 0 }}>
            <path d="M6 2.75h8.5L19 7.25V19.5a1.75 1.75 0 0 1-1.75 1.75H6.75A1.75 1.75 0 0 1 5 19.5V4.5A1.75 1.75 0 0 1 6.75 2.75Z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
            <path d="M14 2.75V7.5h4.75" stroke={color} strokeWidth="2" strokeLinejoin="round" />
            <path d="M8.5 12.5h7M8.5 16h7" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
    );
}

function BuildingIcon({ size = 20, color = '#1e293b' }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ verticalAlign: 'middle', flexShrink: 0 }}>
            <path d="M3 21h18M4 10h16M5 10v7M9 10v7M15 10v7M19 10v7M12 3l9 5H3l9-5z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function WarningIcon({ size = 22, color = '#e11d48' }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

// --- Dynamic colored badge component for Reference Numbers ---
function RefBadge({ refNumber }: { refNumber: string }) {
    let bg, color, icon;

    if (refNumber.startsWith('NLH')) {
        bg = '#ffe4e6';
        color = '#be123c';
        icon = <DocumentIcon size={14} color="#be123c" />;
    } else if (refNumber.startsWith('LH')) {
        bg = '#fef08a';
        color = '#854d0e';
        icon = <DocumentIcon size={14} color="#854d0e" />;
    } else if (refNumber.startsWith('TD')) {
        bg = '#dbeafe';
        color = '#1d4ed8';
        icon = <BuildingIcon size={14} color="#1d4ed8" />;
    } else {
        bg = '#f1f5f9';
        color = '#475569';
        icon = <DocumentIcon size={14} color="#475569" />;
    }

    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: bg, color: color, padding: '6px 12px', borderRadius: '6px', fontSize: '0.95rem', fontWeight: 800, whiteSpace: 'nowrap', border: `1px solid ${color}40` }}>
            {icon} {refNumber}
        </span>
    );
}


export function TransactionSummary({ entryData, onBackToForms, onProceedToQueue }: TransactionSummaryProps) {
    const { items, totalAmount, removeItem, clearCart } = useCart();
    const [submitting, setSubmitting] = useState(false);

    // Track which item the user wants to cancel, so we can show a
    // confirmation modal before actually archiving it.
    const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
    const [cancelling, setCancelling] = useState(false);
    const [cancelError, setCancelError] = useState<string | null>(null);

    // Safely resolve the primary requester from the cart, falling back to entryData
    const requesterName = items[0]?.requestedByName || entryData.requestedByName || 'N/A';

    const cancelTarget = items.find((i) => i.id === cancelTargetId) || null;

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

    // Opens the confirmation modal instead of removing the item right away.
    const handleRequestCancel = (itemId: string) => {
        setCancelError(null);
        setCancelTargetId(itemId);
    };

    const handleDismissCancel = () => {
        if (cancelling) return;
        setCancelTargetId(null);
        setCancelError(null);
    };

    // Confirmed: mark the document as Archived on the backend, then drop it
    // from the local cart. Because Archive Management reads from the same
    // shared transaction registry (filtering status === "Archived"), this
    // document will show up there automatically — tagged as Tax Declaration,
    // Certificate of Land Holding, or No-Landholding Certificate depending on
    // its requestedDocuments, same as any other archived record.
    const handleConfirmCancel = async () => {
        if (!cancelTarget) return;
        setCancelling(true);
        setCancelError(null);
        try {
            await requestService.updateRequest(cancelTarget.id, { status: 'ARCHIVED' }); // was 'Archived'
            removeItem(cancelTarget.id);
            setCancelTargetId(null);
        } catch (err) {
            setCancelError('Failed to cancel this document. Please try again.');
        } finally {
            setCancelling(false);
        }
    };

    return (
        <div className="rfe-page">
            <div className="rfe-page-inner" style={{ paddingTop: '28px', paddingBottom: '32px' }}>
                <div className="rfe-card" style={{ boxShadow: '0 10px 25px -3px rgba(0,0,0,0.1)', borderRadius: '16px' }}>

                    {/* --- HEADER --- */}
                    <div className="rfe-card-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <div>
                            <h2 className="rfe-card-title" style={{ fontSize: '1.7rem', fontWeight: 800, marginBottom: '6px' }}>
                                Transaction Summary
                            </h2>
                            <div className="rfe-card-subtitle" style={{ opacity: 0.9, fontSize: '0.95rem' }}>
                                Review and confirm document queue details before cashier submission
                            </div>
                        </div>
                    </div>

                    <div className="rfe-form-body">

                        {/* --- REQUESTER DETAILS HERO STRIP --- */}
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', background: '#f8fafc', padding: '24px 32px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '28px' }}>
                            <div>
                                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Transaction Requester / Client</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', color: '#29237a', fontWeight: 800, marginTop: '2px' }}>
                                    <UserIcon size={20} color="#29237a" /> {requesterName}
                                </div>
                            </div>
                            <div style={{ borderLeft: '1px solid #cbd5e1', paddingLeft: '24px' }}>
                                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Documents</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', color: '#1e293b', fontWeight: 800, marginTop: '2px' }}>
                                    <DocumentIcon size={20} color="#1e293b" /> {items.length} Record(s)
                                </div>
                            </div>
                        </div>

                        {/* --- TABLE SECTION --- */}
                        <div className="lh-table-section" style={{ marginTop: '0', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="lh-property-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                                    <thead style={{ background: '#f1f5f9' }}>
                                        <tr>
                                            <th style={{ width: '28%', padding: '16px 32px', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}>Reference No.</th>
                                            <th style={{ width: '45%', padding: '16px 32px', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}>Declarant (Document Owner)</th>
                                            <th style={{ width: '15%', padding: '16px 32px', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700, textAlign: 'right' }}>Fee (₱)</th>
                                            <th style={{ width: '12%', padding: '16px 32px', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700, textAlign: 'center' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                                                    No documents added yet. Click "Add Another Document" below to begin.
                                                </td>
                                            </tr>
                                        ) : (
                                            items.map((item) => (
                                                <tr key={item.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '16px 32px' }}>
                                                        <RefBadge refNumber={item.referenceNumber} />
                                                    </td>
                                                    <td style={{ padding: '16px 32px', fontWeight: 700, color: '#334155', lineHeight: '1.4' }}>
                                                        {item.declarantName || 'N/A'}
                                                    </td>
                                                    <td style={{ padding: '16px 32px', color: '#059669', fontWeight: 800, textAlign: 'right', fontSize: '1.1rem' }}>
                                                        ₱ {item.fee.toFixed(2)}
                                                    </td>
                                                    <td style={{ padding: '16px 32px', textAlign: 'center' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRequestCancel(item.id)}
                                                            title="Cancel Document"
                                                            style={{ background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', padding: '7px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', transition: 'all 0.15s ease' }}
                                                            onMouseOver={(e) => { e.currentTarget.style.background = '#ffe4e6'; e.currentTarget.style.borderColor = '#fda4af'; }}
                                                            onMouseOut={(e) => { e.currentTarget.style.background = '#fff1f2'; e.currentTarget.style.borderColor = '#fecdd3'; }}
                                                        >
                                                            Cancel
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
                            <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'flex-end', padding: '24px 32px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
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
                    <div className="rfe-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', borderTop: '1px solid #e2e8f0', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px', flexWrap: 'wrap', gap: '16px' }}>

                        {/* Upgraded Add Another Document Button */}
                        <button
                            onClick={onBackToForms}
                            disabled={submitting}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: '#eef2ff',
                                color: '#29237a',
                                border: '1.5px solid #c7d2fe',
                                padding: '11px 24px',
                                borderRadius: '8px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                fontSize: '0.95rem'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.background = '#e0e7ff';
                                e.currentTarget.style.borderColor = '#a5b4fc';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(41, 35, 122, 0.08)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.background = '#eef2ff';
                                e.currentTarget.style.borderColor = '#c7d2fe';
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            Add Another Document
                        </button>

                        <button
                            className="btn-proceed"
                            onClick={handleSubmitToQueue}
                            disabled={submitting || items.length === 0}
                            style={{ padding: '12px 28px', fontSize: '1rem', borderRadius: '8px', fontWeight: 800, boxShadow: '0 4px 12px rgba(41, 35, 122, 0.2)' }}
                        >
                            {submitting ? 'Processing...' : 'Submit to Pending Payments →'}
                        </button>
                    </div>
                </div>
            </div>

            {/* --- CANCEL CONFIRMATION MODAL --- */}
            {cancelTarget && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(15, 23, 42, 0.55)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '16px'
                    }}
                    onClick={handleDismissCancel}
                >
                    <div
                        style={{
                            background: '#ffffff',
                            borderRadius: '16px',
                            padding: '28px',
                            maxWidth: '420px',
                            width: '100%',
                            boxShadow: '0 20px 40px -8px rgba(0,0,0,0.35)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
                            <div style={{ background: '#ffe4e6', borderRadius: '999px', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <WarningIcon size={22} color="#e11d48" />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1e293b' }}>
                                    Cancel this document?
                                </h3>
                                <p style={{ margin: '6px 0 0', fontSize: '0.9rem', color: '#64748b', lineHeight: 1.5 }}>
                                    Reference <strong style={{ color: '#334155' }}>{cancelTarget.referenceNumber}</strong> for{' '}
                                    <strong style={{ color: '#334155' }}>{cancelTarget.declarantName || 'this client'}</strong> will be removed from this transaction and moved to <strong>Archive Management</strong>. You can restore it from there later if needed.
                                </p>
                            </div>
                        </div>

                        {cancelError && (
                            <div style={{ background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', borderRadius: '8px', padding: '10px 14px', fontSize: '0.85rem', fontWeight: 600, marginBottom: '16px' }}>
                                {cancelError}
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button
                                type="button"
                                onClick={handleDismissCancel}
                                disabled={cancelling}
                                style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}
                            >
                                Keep Document
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmCancel}
                                disabled={cancelling}
                                style={{ background: '#e11d48', color: '#fff', border: '1px solid #e11d48', padding: '10px 20px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', fontSize: '0.9rem', opacity: cancelling ? 0.7 : 1 }}
                            >
                                {cancelling ? 'Cancelling...' : 'Yes, Cancel & Archive'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}