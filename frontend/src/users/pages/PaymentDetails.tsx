import type { PendingPaymentRequest } from '../types/PendingPayment';
import '../styles/PaymentDetails.css';

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────
interface PaymentDetailsProps {
    /** The payment selected from PendingPayment's onSelectPayment. */
    payment: PendingPaymentRequest | null;
    /** Returns the user to the Pending Payment list. */
    onBack: () => void;
    onProceedToPayment: (payment: PendingPaymentRequest) => void;
    onVoidPayment: (payment: PendingPaymentRequest) => void;
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────
export function PaymentDetails({ payment, onBack, onProceedToPayment, onVoidPayment }: PaymentDetailsProps) {
    if (!payment) {
        return (
            <div className="pd-page">
                <div className="pd-card">
                    <p>We couldn&apos;t find that payment request.</p>
                    <button type="button" className="pd-back-btn" onClick={onBack}>
                        &larr; Back to Pending Payments
                    </button>
                </div>
            </div>
        );
    }

    const handlePayNow = () => {
        onProceedToPayment(payment);
    };

    const handleVoid = () => {
        onVoidPayment(payment);
    };

    return (
        <div className="pd-page">
            <div className="pd-card">
                <button type="button" className="pd-back-btn" onClick={onBack}>
                    &larr; Back to Pending Payments
                </button>

                <h2 className="pd-title">Payment Details</h2>

                <dl className="pd-list">
                    <div className="pd-row">
                        <dt>Control Number</dt>
                        <dd>{payment.controlNumber}</dd>
                    </div>
                    <div className="pd-row">
                        <dt>Declarant&apos;s Name</dt>
                        <dd>{payment.declarantName}</dd>
                    </div>
                    <div className="pd-row">
                        <dt>Document Type</dt>
                        <dd>{payment.documentType}</dd>
                    </div>
                    <div className="pd-row">
                        <dt>Date Requested</dt>
                        <dd>{payment.dateRequested}</dd>
                    </div>
                    <div className="pd-row">
                        <dt>Status</dt>
                        <dd>{payment.status}</dd>
                    </div>
                    <div className="pd-row pd-row--total">
                        <dt>Amount Due</dt>
                        <dd>{payment.amountDue} Php</dd>
                    </div>
                </dl>

                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                    <div style={{ fontWeight: 800, color: '#1E293B', marginBottom: 8 }}>Document Preview</div>
                    <div style={{ color: '#475569', fontSize: 13, lineHeight: 1.6 }}>
                        {payment.formSummary?.title && <div><strong>{payment.formSummary.title}</strong></div>}
                        {payment.formSummary?.ownerName && <div>Owner: {payment.formSummary.ownerName}</div>}
                        {payment.formSummary?.declarantName && <div>Declarant: {payment.formSummary.declarantName}</div>}
                        {payment.formSummary?.propertyIndexNumber && <div>Property Index: {payment.formSummary.propertyIndexNumber}</div>}
                        {payment.formSummary?.taxDeclarationNumber && <div>Tax Declaration No.: {payment.formSummary.taxDeclarationNumber}</div>}
                        {payment.formSummary?.properties?.map((property) => (
                            <div key={property.label}>{property.label}: {property.value}</div>
                        ))}
                        {payment.formSummary?.notes?.map((note) => (
                            <div key={note}>{note}</div>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                    <button type="button" className="pd-pay-btn" onClick={handlePayNow}>
                        Proceed to Payment
                    </button>
                    <button type="button" className="pd-pay-btn" onClick={handleVoid} style={{ backgroundColor: '#B91C1C' }}>
                        Void
                    </button>
                </div>
            </div>
        </div>
    );
}