import { useState, useEffect } from 'react';
import type { DeclarantGroup, Transaction } from '../types/transaction';
import '../styles/VoidConfirmModal.css';

interface VoidDocumentSelectModalProps {
    open: boolean;
    group: DeclarantGroup | null;
    onClose: () => void;
    // May be sync or async — the modal awaits it either way so the button
    // can show a loading state until the void request actually resolves.
    onConfirm: (transactionIds: string[], reason: string) => void | Promise<void>;
}

const VOID_REASONS = [
    'Duplicate filing',
    'Declarant withdrew request',
    'Incorrect details encoded',
    'Payment reversed / cancelled',
    'Other',
];

const SpinnerIcon = () => (
    <svg
        width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="3" strokeLinecap="round"
        style={{ animation: 'vdm-spin 0.8s linear infinite' }}
    >
        <circle cx="12" cy="12" r="9" strokeOpacity="0.25" />
        <path d="M21 12a9 9 0 00-9-9" />
    </svg>
);

export function VoidDocumentSelectModal({ open, group, onClose, onConfirm }: VoidDocumentSelectModalProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [reasonCode, setReasonCode] = useState(VOID_REASONS[0]);
    const [note, setNote] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            setSelectedIds(new Set());
            setReasonCode(VOID_REASONS[0]);
            setNote('');
            setError('');
            setIsSubmitting(false);
        }
    }, [open, group?.declarantName]);

    if (!open || !group) return null;

    const toggle = (transactionId: string) => {
        if (isSubmitting) return; // don't let selection change mid-submit
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(transactionId)) next.delete(transactionId);
            else next.add(transactionId);
            return next;
        });
    };

    const count = selectedIds.size;

    const handleConfirm = async () => {
        if (count === 0 || isSubmitting) return;
        if (reasonCode === 'Other' && !note.trim()) {
            setError('Please describe the reason for voiding these documents.');
            return;
        }
        const reason = reasonCode === 'Other'
            ? note.trim()
            : (note.trim() ? `${reasonCode} — ${note.trim()}` : reasonCode);

        setIsSubmitting(true);
        try {
            // Await regardless of whether onConfirm is sync or async — if the
            // caller's void request fails, it's expected to throw so the
            // button can recover instead of getting stuck spinning forever.
            await onConfirm(Array.from(selectedIds), reason);
        } catch {
            // The caller (TransactionRegistry.tsx's confirmVoidGroup) already
            // surfaces its own error alert and keeps the modal open on
            // failure — just make sure this button isn't left disabled.
            setIsSubmitting(false);
        }
        // On success the parent closes the modal (setVoidGroupTarget(null)),
        // which unmounts/hides this component — no need to reset
        // isSubmitting here, and doing so could cause a flash if the modal
        // hasn't unmounted yet on the same tick.
    };

    return (
        <div className="vam-backdrop" onClick={isSubmitting ? undefined : onClose}>
            <div className="vam-modal" onClick={(e) => e.stopPropagation()}>
                <div className="vam-header">
                    <div>
                        <h3 className="vam-title">Void documents</h3>
                        <p className="vam-subtitle">{group.declarantName}</p>
                    </div>
                    <button
                        className="vam-close-btn"
                        onClick={onClose}
                        aria-label="Close"
                        disabled={isSubmitting}
                        style={isSubmitting ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                    >
                        ✕
                    </button>
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
                                style={isSubmitting ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
                            >
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggle(t.id)}
                                    disabled={isSubmitting}
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
                                    disabled={isSubmitting}
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
                                disabled={isSubmitting}
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
                    <button
                        className="vam-btn vam-btn--cancel"
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                    <button
                        className="vam-btn vam-btn--confirm"
                        disabled={count === 0 || isSubmitting}
                        onClick={handleConfirm}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}
                    >
                        {isSubmitting && <SpinnerIcon />}
                        {isSubmitting
                            ? 'Voiding…'
                            : `Void ${count} ${count === 1 ? 'document' : 'documents'}`}
                    </button>
                </div>
            </div>
        </div>
    );
}