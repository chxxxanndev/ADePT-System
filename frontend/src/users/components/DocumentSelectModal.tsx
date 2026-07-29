import { useState, useEffect } from 'react';
import type { DeclarantGroup, Transaction } from '../types/transaction';
import '../styles/VoidConfirmModal.css';

interface VoidDocumentSelectModalProps {
    open: boolean;
    group: DeclarantGroup | null;
    onClose: () => void;
    onConfirm: (transactionIds: string[], reason: string) => void;
}

const VOID_REASONS = [
    'Duplicate filing',
    'Declarant withdrew request',
    'Incorrect details encoded',
    'Payment reversed / cancelled',
    'Other',
];

export function VoidDocumentSelectModal({ open, group, onClose, onConfirm }: VoidDocumentSelectModalProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [reasonCode, setReasonCode] = useState(VOID_REASONS[0]);
    const [note, setNote] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (open) {
            setSelectedIds(new Set());
            setReasonCode(VOID_REASONS[0]);
            setNote('');
            setError('');
        }
    }, [open, group?.declarantName]);

    if (!open || !group) return null;

    const toggle = (transactionId: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(transactionId)) next.delete(transactionId);
            else next.add(transactionId);
            return next;
        });
    };

    const count = selectedIds.size;

    const handleConfirm = () => {
        if (count === 0) return;
        if (reasonCode === 'Other' && !note.trim()) {
            setError('Please describe the reason for voiding these documents.');
            return;
        }
        const reason = reasonCode === 'Other'
            ? note.trim()
            : (note.trim() ? `${reasonCode} — ${note.trim()}` : reasonCode);
        onConfirm(Array.from(selectedIds), reason);
    };

    return (
        <div className="vam-backdrop" onClick={onClose}>
            <div className="vam-modal" onClick={(e) => e.stopPropagation()}>
                <div className="vam-header">
                    <div>
                        <h3 className="vam-title">Void documents</h3>
                        <p className="vam-subtitle">{group.declarantName}</p>
                    </div>
                    <button className="vam-close-btn" onClick={onClose} aria-label="Close">✕</button>
                </div>

                <p className="vdm-description">
                    Select one or more documents to void. Each has its own reference number and will be
                    voided independently.
                </p>

                <div className="vdm-doc-list">
                    {group.transactions.map((t: Transaction) => {
                        const isSelected = selectedIds.has(t.id);
                        const hasReprint = t.requestedDocuments.some((d) => d.reprintCount > 0);
                        return (
                            <label
                                key={t.id}
                                className={`vdm-doc-row${isSelected ? ' vdm-doc-row--selected' : ''}`}
                            >
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggle(t.id)}
                                />
                                <div className="vdm-doc-row-info">
                                    <div className="vdm-doc-row-ref">{t.referenceNumber}</div>
                                    <div className="vdm-doc-row-type">
                                        {t.requestedDocuments.map((d) => d.documentType).join(', ')}
                                    </div>
                                </div>
                                <span className={`vdm-doc-row-status${hasReprint ? ' vdm-doc-row-status--reprinted' : ''}`}>
                                    {hasReprint ? 'Reprinted' : t.status}
                                </span>
                            </label>
                        );
                    })}
                </div>

                {count > 0 && (
                    <div className="vam-body" style={{ borderTop: '1px solid #F1EFFB', paddingTop: '14px', marginTop: '14px' }}>
                        <div className="vam-field">
                            <label className="vam-label">Reason</label>
                            <div className="vam-select-wrapper">
                                <select
                                    className="vam-select"
                                    value={reasonCode}
                                    onChange={(e) => { setReasonCode(e.target.value); setError(''); }}
                                >
                                    {VOID_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                                </select>
                                <span className="vam-select-chevron">▾</span>
                            </div>
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
                            Selected {count === 1 ? 'document' : 'documents'} will be marked Void and moved to
                            the Void &amp; Amend log. This can't be undone from here.
                        </p>
                    </div>
                )}

                <div className="vam-footer">
                    <button className="vam-btn vam-btn--cancel" onClick={onClose}>Cancel</button>
                    <button
                        className="vam-btn vam-btn--confirm"
                        disabled={count === 0}
                        onClick={handleConfirm}
                    >
                        Void {count} {count === 1 ? 'document' : 'documents'}
                    </button>
                </div>
            </div>
        </div>
    );
}