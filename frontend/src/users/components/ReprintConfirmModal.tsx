import { useState } from 'react';
import '../styles/ReprintConfirmModal.css';


interface ReprintConfirmModalProps {
    open: boolean;
    documentLabel: string;   // "Certificate of No Landholding - NLH-2026-1772"
    declarantName: string;
    requestedBy: string;
    onCancel: () => void;
    onConfirm: () => Promise<void> | void;
}

export function ReprintConfirmModal({
    open, documentLabel, declarantName, requestedBy, onCancel, onConfirm,
}: ReprintConfirmModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!open) return null;

    const handleProceed = async () => {
        setError(null);
        setIsSubmitting(true);
        try {
            await onConfirm();
        } catch (err: any) {
            setError(err?.message || 'Failed to create reprint request. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="rc-modal-overlay" onClick={() => !isSubmitting && onCancel()}>
            <div className="rc-modal" onClick={(e) => e.stopPropagation()}>
                <div className="rc-modal-header"><h3>Reprint Document</h3></div>
                <div className="rc-modal-body">
                    <p>You will be reprinting <strong>"{documentLabel}"</strong>.</p>
                    <div className="rc-modal-meta">
                        <div>
                            <span className="rc-modal-meta-label">Declarant</span>
                            <span className="rc-modal-meta-value">{declarantName || '—'}</span>
                        </div>
                        <div>
                            <span className="rc-modal-meta-label">Requested By</span>
                            <span className="rc-modal-meta-value">{requestedBy || '—'}</span>
                        </div>
                    </div>
                    <p className="rc-modal-note">
                        This creates a new payment request for the reprint. You'll be taken to
                        Pending Payments to process it.
                    </p>
                    {error && <p className="rc-modal-error">{error}</p>}
                </div>
                <div className="rc-modal-footer">
                    <button type="button" className="rc-btn rc-btn--cancel" onClick={onCancel} disabled={isSubmitting}>
                        Cancel
                    </button>
                    <button type="button" className="rc-btn rc-btn--confirm" onClick={handleProceed} disabled={isSubmitting}>
                        {isSubmitting ? 'Processing…' : 'Reprint'}
                    </button>
                </div>
            </div>
        </div>
    );
}