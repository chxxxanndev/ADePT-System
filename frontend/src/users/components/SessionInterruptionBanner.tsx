import { useEffect, useState } from 'react';

type InterruptionType = 'connection-lost' | 'session-expired' | null;

interface SessionInterruptionBannerProps {
    onLogout: () => void;
}

export function SessionInterruptionBanner({ onLogout }: SessionInterruptionBannerProps) {
    const [interruption, setInterruption] = useState<InterruptionType>(null);

    useEffect(() => {
        const onConnectionLost = () => setInterruption((prev) => prev ?? 'connection-lost');
        const onSessionExpired = () => setInterruption('session-expired');

        window.addEventListener('app:connection-lost', onConnectionLost);
        window.addEventListener('app:session-expired', onSessionExpired);
        return () => {
            window.removeEventListener('app:connection-lost', onConnectionLost);
            window.removeEventListener('app:session-expired', onSessionExpired);
        };
    }, []);

    if (!interruption) return null;

    const isSessionExpired = interruption === 'session-expired';

    return (
        <div
            style={{
                position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 2000, padding: '16px',
            }}
        >
            <div style={{
                background: '#fff', borderRadius: 16, padding: 28, maxWidth: 440, width: '100%',
                boxShadow: '0 20px 40px -8px rgba(0,0,0,0.35)', textAlign: 'center',
            }}>
                <div style={{
                    width: 48, height: 48, borderRadius: '50%', margin: '0 auto 16px',
                    background: isSessionExpired ? '#ffe4e6' : '#fff7ed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    {isSessionExpired ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                    ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="1" y1="1" x2="23" y2="23"></line>
                            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
                            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
                            <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
                            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
                            <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
                            <line x1="12" y1="20" x2="12.01" y2="20"></line>
                        </svg>
                    )}
                </div>

                <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>
                    {isSessionExpired ? 'Your session has ended' : 'Connection interrupted'}
                </h3>

                <p style={{ margin: '0 0 20px', fontSize: '0.9rem', color: '#64748b', lineHeight: 1.5 }}>
                    {isSessionExpired
                        ? 'Your login session is no longer valid. This can happen if the server was restarted or your session expired. Please log out and sign in again.'
                        : "The app can't reach the server right now. If this keeps happening, the backend may have restarted — please log out and sign in again once it's back."}
                </p>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                    {!isSessionExpired && (
                        <button
                            type="button"
                            onClick={() => setInterruption(null)}
                            style={{
                                background: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0',
                                padding: '10px 18px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem',
                            }}
                        >
                            Dismiss
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => { setInterruption(null); onLogout(); }}
                        style={{
                            background: '#e11d48', color: '#fff', border: '1px solid #e11d48',
                            padding: '10px 18px', borderRadius: 8, fontWeight: 800, cursor: 'pointer', fontSize: '0.88rem',
                        }}
                    >
                        Log Out &amp; Sign In Again
                    </button>
                </div>
            </div>
        </div>
    );
}