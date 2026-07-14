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
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────
export function PaymentDetails({ payment, onBack }: PaymentDetailsProps) {
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
        // TODO: hook this up to the real payment flow / requestService call.
        console.log('Proceeding to pay:', payment.controlNumber);
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

                <button type="button" className="pd-pay-btn" onClick={handlePayNow}>
                    Proceed to Payment
                </button>
            </div>
        </div>
    );
}