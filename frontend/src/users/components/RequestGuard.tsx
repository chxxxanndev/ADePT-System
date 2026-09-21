import { useEffect, useRef } from 'react';
import '../styles/RequestGuard.css';

interface RequestGuardProps {
    attemptedView: string;
    onGoToEntry: () => void;
    onBackToDashboard: () => void;
}

export function RequestGuard({ attemptedView, onGoToEntry, onBackToDashboard }: RequestGuardProps) {
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = cardRef.current;
        if (!el) return;
        requestAnimationFrame(() => el.classList.add('guard-visible'));
    }, []);

    return (
        <div className="guard-page">
            <div className="guard-card" ref={cardRef}>
                <div className="guard-accent-bar" />

                <div className="guard-body">
                    <div className="guard-icon-wrap">
                        <svg
                            className="guard-icon"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                    </div>

                    <h2 className="guard-title">Request Entry Not Completed</h2>

                    <p className="guard-message">
                        You are trying to access{' '}
                        <strong className="guard-highlight">{attemptedView}</strong> under{' '}
                        <strong className="guard-highlight">Request Processing</strong>, but the{' '}
                        <strong className="guard-highlight">Request Form Entry</strong> has not been
                        filled in and submitted yet.
                    </p>

                    <div className="guard-divider" />

                    <div className="guard-steps">
                        <div className="guard-step">
                            <span className="guard-step-num">1</span>
                            <div className="guard-step-text">
                                <strong>Fill in the Request Form Entry</strong>
                                <span>Enter declarant details, document type, and purpose.</span>
                            </div>
                        </div>
                        <div className="guard-step-arrow">→</div>
                        <div className="guard-step">
                            <span className="guard-step-num step-muted">2</span>
                            <div className="guard-step-text">
                                <strong>Proceed to {attemptedView}</strong>
                                <span>The form will open automatically after saving the entry.</span>
                            </div>
                        </div>
                    </div>

                    <div className="guard-actions">
                        <button className="guard-btn-primary" onClick={onGoToEntry}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 18l6-6-6-6" />
                            </svg>
                            Go to Request Form Entry
                        </button>
                        <button className="guard-btn-secondary" onClick={onBackToDashboard}>
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
