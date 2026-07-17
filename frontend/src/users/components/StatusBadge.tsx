import type { TransactionStatus } from '../types/transaction';

interface StatusBadgeProps {
    status: TransactionStatus;
}

const STATUS_CLASS_MAP: Record<TransactionStatus, string> = {
    'Pending': 'tr-badge--pending',
    'For Payment': 'tr-badge--forpayment',
    'Payment Verified': 'tr-badge--paymentverified',
    'Processing': 'tr-badge--processing',
    'Ready for Release': 'tr-badge--readyforrelease',
    'Released': 'tr-badge--released',
    'Void': 'tr-badge--void',
    'Archived': 'tr-badge--archived',
};

export function StatusBadge({ status }: StatusBadgeProps) {
    return (
        <span className={`tr-badge ${STATUS_CLASS_MAP[status]}`}>
            {status}
        </span>
    );
}
