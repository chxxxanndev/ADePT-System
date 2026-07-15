import { useState, useEffect, type KeyboardEvent } from 'react';
import type { PendingPaymentRequest } from '../types/PendingPayment';
import { pendingPaymentData } from '../data/PendingPaymentData';
import logoImg from '../../auth-folder/assets/logo.png';
import '../styles/PendingPayment.css';

// ─────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────
function PendingClockIcon() {
    return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="8" stroke="#FFFCF9" strokeWidth="2" />
            <path d="M12 8V12L14.5 14" stroke="#FFFCF9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 3.5L5 6" stroke="#FFFCF9" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

// Kept local for the same reason as PendingClockIcon — swap for a shared
// icon from components/icons.tsx if one already exists there.
function PendingUserIcon() {
    return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="8" r="3.4" stroke="#FFFFFF" strokeWidth="2" />
            <path d="M5 19c0-3.3 3.1-6 7-6s7 2.7 7 6" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

const STATUS_MODIFIER: Record<PendingPaymentRequest['status'], string> = {
    'Awaiting Payment': 'pp-badge--awaiting',
    Paid: 'pp-badge--paid',
    Overdue: 'pp-badge--overdue',
    'Pending Validation': 'pp-badge--awaiting',
    Voided: 'pp-badge--overdue',
};

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────
interface PendingPaymentProps {
    payments?: PendingPaymentRequest[];
    onSelectPayment: (payment: PendingPaymentRequest) => void;
    /** Display name shown in the page header. TODO: wire up to the logged-in user. */
    userName?: string;
    /** Date shown in the page header. TODO: wire up to a real formatted date. */
    userDate?: string;
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────
export function PendingPayment({
    payments: externalPayments,
    onSelectPayment,
    userName = 'Vicente Desoy',
    userDate = 'July 10, 2026',
}: PendingPaymentProps) {
    const [payments, setPayments] = useState<PendingPaymentRequest[]>([]);

    useEffect(() => {
        if (externalPayments) {
            setPayments(externalPayments);
            return;
        }
        // Mock data for now -- swap for a real call once the endpoint exists, e.g.
        // requestService.getPendingPayments().then(setPayments);
        setPayments(pendingPaymentData);
    }, [externalPayments]);

    const handleRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, payment: PendingPaymentRequest) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelectPayment(payment);
        }
    };

    return (
        <div className="pp-page">
            <div className="pp-header">
                <div className="pp-header-brand">
                    <div className="pp-header-logo">
                        <img src={logoImg} alt="ADePT" />
                    </div>
                    <div className="pp-header-brand-text">
                        <span className="pp-header-title">
                            ASSESSOR<span className="pp-header-title-light">DESK</span>
                        </span>
                        <span className="pp-header-subtitle">Office Of The Provincial Assessor</span>
                    </div>
                </div>

                <div className="pp-header-profile">
                    <span className="pp-header-profile-avatar">
                        <PendingUserIcon />
                    </span>
                    <div className="pp-header-profile-info">
                        <span className="pp-header-profile-name">{userName}</span>
                        <span className="pp-header-profile-date">{userDate}</span>
                    </div>
                </div>
            </div>

            <div className="pp-title">
                <span className="pp-title-icon">
                    <PendingClockIcon />
                </span>
                <h2>PENDING PAYMENT</h2>
            </div>

            <div className="pp-card">
                <table className="pp-table">
                    <thead>
                        <tr>
                            <th>Control Number</th>
                            <th>Declarant&apos;s Name</th>
                            <th>Document Type</th>
                            <th>Amount Due</th>
                            <th>Date Requested</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {payments.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="pp-table-empty">
                                    No pending payments at this time.
                                </td>
                            </tr>
                        ) : (
                            payments.map((payment) => (
                                <tr
                                    key={payment.controlNumber}
                                    className="pp-row"
                                    onClick={() => onSelectPayment(payment)}
                                    onKeyDown={(event) => handleRowKeyDown(event, payment)}
                                    tabIndex={0}
                                    role="button"
                                    aria-label={`View payment details for ${payment.declarantName}`}
                                >
                                    <td>{payment.controlNumber}</td>
                                    <td>{payment.declarantName}</td>
                                    <td>{payment.documentType}</td>
                                    <td>{payment.amountDue} Php</td>
                                    <td>{payment.dateRequested}</td>
                                    <td>
                                        <span className={`pp-badge ${STATUS_MODIFIER[payment.status] ?? 'pp-badge--awaiting'}`}>
                                            {payment.status}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}