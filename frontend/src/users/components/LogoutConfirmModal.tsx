import '../styles/ReprintConfirmModal.css';

interface LogoutConfirmModalProps {
    open: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

/**
 * Logout confirmation — reuses the exact same modal design as the
 * system's existing confirmation dialogs (ReprintConfirmModal's
 * rc-modal-overlay / rc-modal / rc-btn classes and stylesheet), with the
 * confirm button in the established destructive color (#e11d48 — the same
 * rose used by the session-expired banner and audit entries).
 */
export function LogoutConfirmModal({ open, onCancel, onConfirm }: LogoutConfirmModalProps) {
    if (!open) return null;

    return (
        <div className="rc-modal-overlay" onClick={onCancel}>
            <div
                className="rc-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="logout-confirm-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="rc-modal-header">
                    <h3 id="logout-confirm-title">Confirm Logout</h3>
                </div>
                <div className="rc-modal-body">
                    <p>Are you sure you want to log out?</p>
                </div>
                <div className="rc-modal-footer">
                    <button type="button" className="rc-btn rc-btn--cancel" onClick={onCancel} autoFocus>
                        Cancel
                    </button>
                    <button type="button" className="rc-btn rc-btn--danger" onClick={onConfirm}>
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
}
