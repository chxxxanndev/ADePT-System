import { useState } from 'react';
import type { PendingPaymentRequest } from '../types/PendingPayment';
import { requestService } from '../services/requestService';

interface PaymentDetailsProps {
    payment: PendingPaymentRequest;
    onBack: () => void;
    onEditDocument: (referenceNumber: string) => void;
}

export function PaymentDetails({ payment, onBack, onEditDocument }: PaymentDetailsProps) {
    const [orNumber, setOrNumber] = useState('');
    const [signatory, setSignatory] = useState('');
    const [isVerified, setIsVerified] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showSharedWarning, setShowSharedWarning] = useState(false);

    if (!payment) return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Payment data missing.</div>;

    // We adjust these variables here to match exactly what your PendingPayment.tsx sends:
    const displayRef = payment.refNumber; 
    const displayName = payment.declarant;
    const displayDoc = payment.docType;
    const displayAmount = payment.amount;

    const handleVerify = () => {
        if (!orNumber || !signatory) return alert("O.R. Number and Signatory are required.");
        
        const isDuplicateInDatabase = orNumber === "12345";
        if (isDuplicateInDatabase && !showSharedWarning) {
            setShowSharedWarning(true);
            return;
        }

        setIsVerified(true);
        setShowSharedWarning(false);
    };

    const handlePrint = async () => {
        if (!orNumber || !signatory) return alert("Enter O.R. and Signatory");

        setIsSaving(true);
        try {
            // payment.id is still used for the DB call
            await requestService.releaseRequest(payment.id, { orNumber, signatory });
            window.print();
            alert(`Document ${displayRef} marked as RELEASED.`);
            onBack(); 
        } catch (err) {
            alert("Failed to save payment details.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="td-page" style={{ paddingBottom: '40px' }}>
            <div className="td-page-inner" style={{ maxWidth: '900px', margin: '0 auto' }}>
                
                <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontWeight: 600, marginBottom: '16px', fontSize: '14px' }}>
                    <span>←</span> Return to Queue
                </button>

                <div className="td-card" style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0' }}>
                    
                    {/* Header */}
                    <div className="td-card-header" style={{ background: 'linear-gradient(135deg, #29237a 0%, #3b3498 100%)', padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h2 style={{ color: '#fff', margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>Payment & Release</h2>
                            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>Final verification before issuance</span>
                        </div>
                        <span className="td-ref-chip" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '8px 16px', borderRadius: '99px', fontWeight: 700, fontFamily: 'monospace', border: '1px solid rgba(255,255,255,0.3)' }}>
                            {displayRef}
                        </span>
                    </div>

                    <div className="td-form-body" style={{ padding: '32px' }}>
                        
                        {/* Section 1: Record Details */}
                        <div className="td-section" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '24px', marginBottom: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <div style={{ color: '#29237a', fontWeight: 700, fontSize: '0.9rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ width: '4px', height: '16px', background: '#29237a', borderRadius: '2px' }}></span>
                                    Record Identity
                                </div>
                                <button onClick={() => onEditDocument(displayRef)} style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                                    ✏️ Fix Typo
                                </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                                <div>
                                    <label style={{ display: 'block', color: '#64748b', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Declarant</label>
                                    <div style={{ color: '#1e293b', fontWeight: 600, fontSize: '15px' }}>{displayName}</div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#64748b', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Document Type</label>
                                    <div style={{ color: '#475569', fontWeight: 500, fontSize: '14px' }}>{displayDoc}</div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#64748b', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Amount to Pay</label>
                                    {/* FIX: Use displayAmount and handle undefined with a fallback to 0 */}
                                    <div style={{ color: '#059669', fontWeight: 800, fontSize: '18px' }}>₱{Number(displayAmount || 0).toFixed(2)}</div>
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Verification */}
                        <div className="td-section">
                            <div style={{ color: '#29237a', fontWeight: 700, fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '4px', height: '16px', background: '#29237a', borderRadius: '2px' }}></span>
                                Payment & Verification
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', background: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <div>
                                    <label style={{ fontWeight: 700, color: '#475569', fontSize: '13px' }}>O.R. Number</label>
                                    <input 
                                        type="text" 
                                        value={orNumber}
                                        onChange={(e) => { setOrNumber(e.target.value); setIsVerified(false); }}
                                        disabled={isVerified}
                                        style={{ width: '100%', padding: '12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', marginTop: '6px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontWeight: 700, color: '#475569', fontSize: '13px' }}>Signatory</label>
                                    <select 
                                        value={signatory}
                                        onChange={(e) => setSignatory(e.target.value)}
                                        disabled={isVerified}
                                        style={{ width: '100%', padding: '12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', marginTop: '6px', background: '#fff' }}
                                    >
                                        <option value="">-- Select Signatory --</option>
                                        <option value="ENGR. VICENTE P. DESOY">ENGR. VICENTE P. DESOY</option>
                                        <option value="ELVIRA T. ENAO">ELVIRA T. ENAO</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
                            {!isVerified ? (
                                <button onClick={handleVerify} style={{ background: '#29237a', color: '#fff', border: 'none', padding: '16px 32px', borderRadius: '10px', cursor: 'pointer', fontWeight: 800 }}>Verify Receipt</button>
                            ) : (
                                <button onClick={handlePrint} disabled={isSaving} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '16px 32px', borderRadius: '10px', cursor: 'pointer', fontWeight: 800 }}>
                                    {isSaving ? 'Saving...' : '🖨️ Mark Paid & Print'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}