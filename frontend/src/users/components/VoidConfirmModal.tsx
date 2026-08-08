import { useState, useEffect } from 'react';
import type { Transaction } from '../types/transaction';
import '../styles/VoidConfirmModal.css';
import { ADePTSelect } from './ADePTSelect';

interface VoidConfirmModalProps {
    open: boolean;
    transaction: Transaction | null;
    onClose: () => void;
    onConfirm: (reason: string) => void;
}

const VOID_REASONS = [
    'Duplicate filing',
    'Declarant withdrew request',
    'Incorrect details encoded',
    'Payment reversed / cancelled',
    'Other',
];

export function VoidConfirmModal({ open, transaction, onClose, onConfirm }: VoidConfirmModalProps) {
    const [reasonCode, setReasonCode] = useState(VOID_REASONS[0]);
    const [note, setNote] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (open) {
            setReasonCode(VOID_REASONS[0]);
            setNote('');
            setError('');
        }
    }, [open, transaction?.id]);

    if (!open || !transaction) return null;

    const handleConfirm = () => {
        if (reasonCode === 'Other' && !note.trim()) {
            setError('Please describe the reason for voiding this request.');
            return;
        }
        const reason = reasonCode === 'Other'
            ? note.trim()
            : (note.trim() ? `${reasonCode} — ${note.trim()}` : reasonCode);
        onConfirm(reason);
    };

    return (
        <div className="vam-backdrop" onClick={onClose}>
            <div className="vam-modal" onClick={(e) => e.stopPropagation()}>
                <div className="vam-header">
                    <div>
                        <h3 className="vam-title">Void this request?</h3>
                        <p className="vam-subtitle">{transaction.referenceNumber}</p>
                    </div>
                    <button className="vam-close-btn" onClick={onClose} aria-label="Close">✕</button>
                </div>

                <div className="vam-body">
                    <div className="vam-field">
                        <label className="vam-label">Reason</label>
                        <ADePTSelect
                            value={reasonCode}
                            onChange={(v) => { setReasonCode(v); setError(''); }}
                            options={VOID_REASONS.map((r) => ({ value: r, label: r }))}
                            ariaLabel="Void reason"
                            variant="block"
                        />
                    </div>

                    <div className="vam-field">
                        <label className="vam-label">
                            {reasonCode === 'Other' ? 'Details (required)' : 'Additional notes (optional)'}
                        </label>
                        <textarea
                            className="vam-textarea"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Add any relevant detail…"
                        />
                    </div>

                    {error && <div className="vam-error">{error}</div>}

                    <p className="vam-warning">
                        This request — and every document under it — will be marked Void and moved to the
                        Void &amp; Amend log. This can't be undone from here.
                    </p>
                </div>

                <div className="vam-footer">
                    <button className="vam-btn vam-btn--cancel" onClick={onClose}>Cancel</button>
                    <button className="vam-btn vam-btn--confirm" onClick={handleConfirm}>Void Request</button>
                </div>
            </div>
        </div>
    );
}