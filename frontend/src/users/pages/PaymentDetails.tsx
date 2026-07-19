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

    // MATCHING THE QUEUE VARIABLES:
    const refNo = payment.referenceNumber; 
    const declarantName = payment.declarant_name;
    const docType = payment.documentType;
    const amountDue = payment.amountDue;

    const handleVerify = () => {
        if (!orNumber || !signatory) return alert("O.R. Number and Signatory are required.");

        // PRESERVING YOUR LOGIC: Shared Receipt Warning
        const isDuplicateInDatabase = orNumber === "12345"; // Keep your mock check
        if (isDuplicateInDatabase && !showSharedWarning) {
            setShowSharedWarning(true);
            return;
        }

        setIsVerified(true);
        setShowSharedWarning(false);
    };

    const handlePrint = async () => {
        if (!orNumber || !signatory) return alert("Verification details incomplete.");

        setIsSaving(true);
        try {
            // REAL DB CONNECTION: Mark as PAID in requests table
            await requestService.releaseRequest(payment.id, { orNumber, signatory });
            
            window.print();
            alert(`Document ${refNo} has been marked as RELEASED.`);
            onBack(); // Return to queue (client will be removed from list)
        } catch (err) {
            alert("Database Error: Could not save payment details.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="td-page" style={{ paddingBottom: '40px' }}>
            <div className="td-page-inner" style={{ maxWidth: '900px', margin: '0 auto' }}>
                
                <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontWeight: 600, marginBottom: '16px', fontSize: '14px' }}>
                    <span>←</span> Back to Pending Queue
                </button>

                <div className="td-card" style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0' }}>
                    
                    {/* Header Banner - Certificate Style */}
                    <div className="td-card-header" style={{ background: 'linear-gradient(135deg, #29237a 0%, #3b3498 100%)', padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h2 style={{ color: '#fff', margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>Payment & Release</h2>
                            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>Final verification before document issuance</span>
                        </div>
                        <span className="td-ref-chip" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '8px 16px', borderRadius: '99px', fontWeight: 700, fontFamily: 'monospace', border: '1px solid rgba(255,255,255,0.3)' }}>
                            {refNo}
                        </span>
                    </div>

                    <div className="td-form-body" style={{ padding: '32px' }}>
                        
                        {/* Section 1: Record Identity */}
                        <div className="td-section" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '24px', marginBottom: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <div style={{ color: '#29237a', fontWeight: 700, fontSize: '0.9rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ width: '4px', height: '16px', background: '#29237a', borderRadius: '2px' }}></span>
                                    Record Details
                                </div>
                                {/* PRESERVING YOUR BUTTON: Edit Typo */}
                                <button onClick={() => onEditDocument(refNo)} style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                                    ✏️ Edit Document Typo
                                </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                                <div>
                                    <label style={{ display: 'block', color: '#64748b', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Declarant</label>
                                    <div style={{ color: '#1e293b', fontWeight: 600, fontSize: '15px' }}>{declarantName}</div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#64748b', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Document Type</label>
                                    <div style={{ color: '#475569', fontWeight: 500, fontSize: '14px' }}>{docType}</div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#64748b', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Amount Due</label>
                                    {/* SAFETY FIX: Number conversion to prevent .toFixed crash */}
                                    <div style={{ color: '#059669', fontWeight: 800, fontSize: '18px' }}>₱{Number(amountDue || 0).toFixed(2)}</div>
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Payment Entry */}
                        <div className="td-section">
                            <div style={{ color: '#29237a', fontWeight: 700, fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '4px', height: '16px', background: '#29237a', borderRadius: '2px' }}></span>
                                Official Receipt Entry
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', background: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <div>
                                    <label style={{ fontWeight: 700, color: '#475569', fontSize: '13px' }}>O.R. Number</label>
                                    <input 
                                        className="td-input"
                                        type="text" 
                                        placeholder="Enter O.R. #"
                                        value={orNumber}
                                        onChange={(e) => { setOrNumber(e.target.value); setIsVerified(false); }}
                                        disabled={isVerified}
                                        style={{ width: '100%', padding: '12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', marginTop: '6px', fontSize: '16px', fontWeight: 600 }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontWeight: 700, color: '#475569', fontSize: '13px' }}>Authorized Signatory</label>
                                    <select 
                                        className="td-select"
                                        value={signatory}
                                        onChange={(e) => setSignatory(e.target.value)}
                                        disabled={isVerified}
                                        style={{ width: '100%', padding: '12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', marginTop: '6px', background: '#fff' }}
                                    >
                                        <option value="">-- Select --</option>
                                        <option value="ENGR. VICENTE P. DESOY">ENGR. VICENTE P. DESOY</option>
                                        <option value="ELVIRA T. ENAO">ELVIRA T. ENAO</option>
                                    </select>
                                </div>
                            </div>

                            {/* PRESERVING YOUR LOGIC: The Shared Warning */}
                            {showSharedWarning && (
                                <div style={{ background: '#fffbeb', border: '1.5px solid #f59e0b', color: '#92400e', padding: '16px', borderRadius: '8px', marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px' }}>
                                    <span>⚠️ <strong>Duplicate O.R. Detected:</strong> This receipt was used today. Is this a bulk payment?</span>
                                    <button onClick={handleVerify} style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}>Confirm & Proceed</button>
                                </div>
                            )}
                        </div>

                        {/* Action Footer */}
                        <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
                            {!isVerified ? (
                                <button 
                                    onClick={handleVerify}
                                    style={{ background: '#29237a', color: '#fff', border: 'none', padding: '16px 32px', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, fontSize: '15px' }}
                                >
                                    Verify Receipt
                                </button>
                            ) : (
                                <button 
                                    onClick={handlePrint}
                                    disabled={isSaving}
                                    style={{ background: '#10b981', color: '#fff', border: 'none', padding: '16px 32px', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}
                                >
                                    {isSaving ? 'Saving...' : '🖨️ Mark Paid & Print Document'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}