import { useState } from 'react';
import type { PendingPaymentRequest } from '../types/PendingPayment';

interface PaymentDetailsProps {
    payment: PendingPaymentRequest | null;
    onBack: () => void;
    onEditDocument: (controlNumber: string) => void;
}

export function PaymentDetails({ payment, onBack, onEditDocument }: PaymentDetailsProps) {
    const [orNumber, setOrNumber] = useState('');
    const [signatory, setSignatory] = useState('');
    const [isVerified, setIsVerified] = useState(false);
    const [showSharedWarning, setShowSharedWarning] = useState(false);

    if (!payment) return <div style={{ padding: '40px' }}>Payment data missing.</div>;

    const handleVerify = () => {
        if (!orNumber || !signatory) return alert("O.R. Number and Signatory are required.");

        // SETBACK 1 LOGIC: The "Shared Receipt" Bulk Payment Collision
        // In a real app, this checks the database. We will mock it here:
        const isDuplicateInDatabase = orNumber === "12345";

        if (isDuplicateInDatabase && !showSharedWarning) {
            setShowSharedWarning(true);
            return;
        }

        setIsVerified(true);
        setShowSharedWarning(false);
    };

    const handlePrint = () => {
        window.print();
        alert(`Document ${payment.controlNumber} marked as RELEASED.`);
        onBack(); // Go back to the queue
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontWeight: 'bold', marginBottom: '20px' }}>
                &larr; Back to Queue
            </button>

            <div style={{ background: '#fff', padding: '32px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(41, 35, 122, 0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f1f5f9', paddingBottom: '20px', marginBottom: '24px' }}>
                    <h2 style={{ color: '#29237a', margin: 0 }}>Payment & Document Release</h2>
                    {/* SETBACK 2 LOGIC: Typo Discovered at the Finish Line */}
                    <button
                        onClick={() => onEditDocument(payment.controlNumber)}
                        style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#475569' }}
                    >
                        ✏️ Edit Document Typo
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                    <div>
                        <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Control Number</p>
                        <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>{payment.controlNumber}</h3>
                    </div>
                    <div>
                        <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Declarant Name</p>
                        <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>{payment.declarantName}</h3>
                    </div>
                    <div>
                        <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Document Type</p>
                        <p style={{ margin: 0, fontWeight: 'bold', color: '#475569' }}>{payment.documentType}</p>
                    </div>
                    <div>
                        <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Calculated Fee</p>
                        <h2 style={{ margin: 0, color: '#059669', fontSize: '24px' }}>₱{payment.amountDue.toFixed(2)}</h2>
                    </div>
                </div>

                {/* PHASE 3 LOGIC: Verification Inputs */}
                <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ marginTop: 0, fontSize: '15px', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '16px' }}>Official Receipt & Signatories</h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>O.R. Number</label>
                            <input
                                type="text"
                                placeholder="Enter receipt number..."
                                value={orNumber}
                                onChange={(e) => { setOrNumber(e.target.value); setIsVerified(false); }}
                                disabled={isVerified}
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>Authorized Signatory</label>
                            <select
                                value={signatory}
                                onChange={(e) => setSignatory(e.target.value)}
                                disabled={isVerified}
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', background: '#fff' }}
                            >
                                <option value="">-- Select Signatory --</option>
                                <option value="ENGR. VICENTE P. DESOY">ENGR. VICENTE P. DESOY (Provincial Assessor)</option>
                                <option value="ELVIRA T. ENAO">ELVIRA T. ENAO (LAOO IV)</option>
                                <option value="ISAGANI B. EMBOL">ISAGANI B. EMBOL (LAOO II)</option>
                            </select>
                        </div>
                    </div>

                    {/* SETBACK 1 LOGIC: The Warning Box */}
                    {showSharedWarning && (
                        <div style={{ background: '#fffbeb', border: '1px solid #f59e0b', color: '#92400e', padding: '14px', borderRadius: '8px', marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <strong>⚠️ Duplicate O.R. Detected:</strong><br />
                                This receipt was recently used. Is this a bulk/shared receipt?
                            </div>
                            <button onClick={handleVerify} style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                                Yes, Override & Proceed
                            </button>
                        </div>
                    )}
                </div>

                <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'flex-end' }}>
                    {!isVerified ? (
                        <button
                            onClick={handleVerify}
                            style={{ background: 'linear-gradient(135deg, #29237a 0%, #3730a3 100%)', color: '#fff', border: 'none', padding: '14px 28px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', boxShadow: '0 4px 12px rgba(41,35,122,0.2)' }}
                        >
                            Verify O.R. & Unlock Printing
                        </button>
                    ) : (
                        <button
                            onClick={handlePrint}
                            style={{ background: '#10b981', color: '#fff', border: 'none', padding: '14px 28px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', boxShadow: '0 4px 12px rgba(16,185,129,0.2)' }}
                        >
                            🖨️ Print & Release Document
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}