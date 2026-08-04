import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AboutADePT } from '../../users/pages/AboutADePT';
import '../../users/styles/dashboard.css'; // supplies the --db-* tokens AboutADePT.css depends on

export function DeveloperCredit() {
    const [showModal, setShowModal] = useState(false);

    return (
        <>
            <div className="developer-credit" onClick={() => setShowModal(true)}>
                Developed by <span className="developer-credit-link">ADePT Development Team</span>
            </div>

            {showModal && createPortal(
                <div className="as-modal-overlay" onClick={() => setShowModal(false)}>
                    <div
                        className="as-modal about-us-full-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="about-us-modal-title"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            className="about-us-modal-close"
                            onClick={() => setShowModal(false)}
                            aria-label="Close"
                        >
                            ×
                        </button>

                        <div className="as-modal-body about-us-full-modal-body">
                            <AboutADePT />
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}