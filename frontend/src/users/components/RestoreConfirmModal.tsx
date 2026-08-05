import '../styles/ReprintConfirmModal.css';

interface RestoreConfirmModalProps {
    open: boolean;
    reference: string;
    onCancel: () => void;
    onConfirm: () => void;
}

/**
 * Restore confirmation — reuses the exact same modal design as the
 * system's existing confirmation dialogs (ReprintConfirmModal's
 * rc-modal-overlay / rc-modal / rc-btn classes and stylesheet), replacing
 * the previous native window.confirm() prompt. Restore is a positive
 * action, so the confirm button uses the standard primary navy
 * (rc-btn--confirm), matching ReprintConfirmModal.
 */
export function RestoreConfirmModal({ open, reference, onCancel, onConfirm }: RestoreConfirmModalProps) {
    if (!open) return null;

    return (
        <div className="rc-modal-overlay" onClick={onCancel}>
            <div
                className="rc-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="restore-confirm-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="rc-modal-header">
                    <h3 id="restore-confirm-title">Restore Document</h3>
                </div>
                <div className="rc-modal-body">
                    <p>
                        Restore Reference <strong>{reference}</strong> to the Pending
                        Payments queue?
                    </p>
                </div>
                <div className="rc-modal-footer">
                    <button type="button" className="rc-btn rc-btn--cancel" onClick={onCancel} autoFocus>
                        Cancel
                    </button>
                    <button type="button" className="rc-btn rc-btn--confirm" onClick={onConfirm}>
                        Restore
                    </button>
                </div>
            </div>
        </div>
    );
}
