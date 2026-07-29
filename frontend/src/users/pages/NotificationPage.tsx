import { Mail, Clock, ArrowRight, CheckCircle, AlertTriangle } from 'lucide-react';
import type { NotificationItem } from '../hooks/useNotifications';
import '../styles/NotificationPage.css';

interface NotificationPageProps {
    notifications: NotificationItem[];
    onOpenRequest: (requestId: string, notifId: string) => void;
    loading: boolean;
    error?: string;
    onRetry?: () => void;
    unreadCount?: number;
    onMarkAllRead?: () => void;
}

// Ensure the Ref Number format: PREFIX-YEAR-XXXX
function toGenericRef(ref?: string): string {
    if (!ref) return '';
    const prefix = ref.split('-')[0] || 'REF';
    const year = new Date().getFullYear();
    return `${prefix}-${year}-XXXX`;
}

export function NotificationPage({
    notifications,
    onOpenRequest,
    loading,
    error,
    onRetry,
    unreadCount = 0,
    onMarkAllRead,
}: NotificationPageProps) {

    // BUG FIX: Only show the "Failed to load" error if we have NO data to show.
    // This prevents the "glitch" screen during session restoration.
    const showLoading = loading && notifications.length === 0;
    const showError = error && !loading && notifications.length === 0;
    const showEmpty = !loading && !error && notifications.length === 0;

    return (
        <div className="page-transition" style={{ padding: '20px' }}>
            <div className="notif-page-header">
                <div>
                    <h2 className="notif-page-title">Notification Center</h2>
                    <p className="notif-page-subtitle">View forwarded tasks and system updates.</p>
                </div>
                {unreadCount > 0 && onMarkAllRead && (
                    <button className="notif-mark-all-header-btn" onClick={onMarkAllRead}>
                        Mark all as read
                    </button>
                )}
            </div>

            <div className="dashboard-card notif-panel">
                {showLoading ? (
                    <div className="notif-loading-state">Loading notifications...</div>
                ) : showError ? (
                    <div className="notif-empty-state">
                        <div className="notif-empty-icon">
                            <AlertTriangle size={48} strokeWidth={1} />
                        </div>
                        <p className="notif-empty-text">{error}</p>
                        {onRetry && (
                            <button className="notif-mark-all-header-btn" style={{ marginTop: 12 }} onClick={onRetry}>
                                Retry Connection
                            </button>
                        )}
                    </div>
                ) : showEmpty ? (
                    <div className="notif-empty-state">
                        <div className="notif-empty-icon">
                            <Mail size={48} strokeWidth={1} />
                        </div>
                        <p className="notif-empty-text">No notifications yet.</p>
                    </div>
                ) : (
                    <div className="notif-list">
                        {notifications.map((n) => {
                            const senderName = n.actor?.first_name
                                ? `${n.actor.first_name} ${n.actor.last_name ?? ''}`.trim()
                                : 'A staff member';

                            const genericRef = toGenericRef(n.requests?.reference_number);

                            return (
                                <div
                                    key={n.id}
                                    className={`notif-bell-item ${!n.is_read ? 'notif-bell-item-unread' : ''}`}
                                    onClick={() => onOpenRequest(n.request_id, n.id)}
                                >
                                    {/* Icon Column */}
                                    <div className={`notif-bell-item-icon ${n.is_read ? 'notif-bell-item-icon-read' : 'notif-bell-item-icon-unread'}`}>
                                        {n.is_read ? <CheckCircle size={20} /> : <Mail size={20} />}
                                    </div>

                                    <div className="notif-bell-item-body">
                                        {/* Row 1: Staff Name (Uppercase/Bold) + Message */}
                                        <div className="notif-bell-item-text">
                                            <strong style={{ textTransform: 'uppercase' }}>{senderName}</strong>
                                            <span className="notif-message-text"> {n.message}</span>
                                        </div>

                                        {/* Row 2: Blue Bold Reference + Declarant */}
                                        <div className="notif-bell-item-meta-row" style={{ marginTop: '4px' }}>
                                            <span className="notif-bell-item-meta">
                                                Ref: <strong style={{ color: '#1e1b4b', fontWeight: 800 }}>{genericRef}</strong>
                                            </span>
                                            {n.requests?.declarant_name && (
                                                <span className="notif-bell-item-meta" style={{ marginLeft: '12px' }}>
                                                    Declarant: <strong style={{ color: '#334155' }}>{n.requests.declarant_name}</strong>
                                                </span>
                                            )}
                                        </div>

                                        {/* Row 3: Gray Timestamp with Icon */}
                                        <div className="notif-bell-item-time" style={{ marginTop: '4px', color: '#94a3b8' }}>
                                            <Clock size={12} style={{ marginRight: '4px' }} />
                                            {new Date(n.created_at).toLocaleString()}
                                        </div>
                                    </div>

                                    {/* Action Column */}
                                    <div className="notif-bell-item-arrow">
                                        <ArrowRight size={18} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}