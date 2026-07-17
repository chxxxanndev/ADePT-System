import type { PendingPaymentRequest } from '../../types/PendingPayment';
import '../../styles/PaymentDetails.css';

interface VoidAmendPageProps {
    documents: PendingPaymentRequest[];
    onBack: () => void;
}

export function VoidAmendPage({ documents, onBack }: VoidAmendPageProps) {
    return (
        <div className="pd-page">
            <div className="pd-card" style={{ maxWidth: 840 }}>
                <button type="button" className="pd-back-btn" onClick={onBack}>
                    ← Back to Pending Payment
                </button>

                <h2 className="pd-title">Void & Amend</h2>
                <p style={{ marginTop: -8, color: '#6B6875' }}>
                    These documents were routed for voiding and amendment. They are ready for staff correction.
                </p>

                <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
                    {documents.length === 0 ? (
                        <div style={{ padding: 16, border: '1px solid #E3E0FA', borderRadius: 12, color: '#6B6875' }}>
                            No documents routed for voiding.
                        </div>
                    ) : (
                        documents.map((document) => (
                            <div key={document.controlNumber} style={{ border: '1px solid #F2D0D0', borderRadius: 12, padding: 16, background: '#FFF8F8' }}>
                                <div style={{ fontWeight: 800, color: '#991B1B' }}>{document.controlNumber}</div>
                                <div style={{ color: '#6B6875', marginTop: 4 }}>{document.declarantName}</div>
                                <div style={{ marginTop: 8, color: '#334155', fontSize: 13 }}>
                                    {document.documentType} • {document.amountDue} Php
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
