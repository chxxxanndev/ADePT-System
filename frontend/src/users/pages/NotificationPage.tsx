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
    onNavigateToDashboard?: () => void;
}

// Shows only the document-type prefix + current year + "XXXX" — the real
// unique reference number is only generated once the request is actually
// proceeded to document fill-out, so it must never be exposed here.
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
    onNavigateToDashboard,
}: NotificationPageProps) {
    return (
        <div className="notif-container page-transition">
            {/* Breadcrumb — Dashboard > Notification Center */}
            <nav className="notif-breadcrumb" aria-label="Breadcrumb">
                <button
                    type="button"
                    className="notif-breadcrumb-item--link"
                    onClick={onNavigateToDashboard}
                >
                    Dashboard
                </button>
                <span className="notif-breadcrumb-sep">&gt;</span>
                <span className="notif-breadcrumb-item--current">Notification Center</span>
            </nav>

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
                {loading ? (
                    <div className="notif-loading-state">Loading notifications...</div>
                ) : error ? (
                    <div className="notif-empty-state">
                        <div className="notif-empty-icon">
                            <AlertTriangle size={48} strokeWidth={1} />
                        </div>
                        <p className="notif-empty-text">{error}</p>
                        {onRetry && (
                            <button className="notif-mark-all-header-btn" style={{ marginTop: 12 }} onClick={onRetry}>
                                Retry
                            </button>
                        )}
                    </div>
                ) : notifications.length === 0 ? (
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
                            const genericRef = toGenericRef(n.requests?.reference_number || n.requests?.control_number);

                            return (
                                <div
                                    key={n.id}
                                    className={`notif-bell-item ${!n.is_read ? 'notif-bell-item-unread' : ''}`}
                                    onClick={() => onOpenRequest(n.request_id, n.id)}
                                >
                                    <div className={`notif-bell-item-icon ${n.is_read ? 'notif-bell-item-icon-read' : 'notif-bell-item-icon-unread'}`}>
                                        {n.is_read ? <CheckCircle size={20} /> : <Mail size={20} />}
                                    </div>

                                    <div className="notif-bell-item-body">
                                        <div className={`notif-bell-item-text ${n.is_read ? 'notif-bell-item-text-read' : 'notif-bell-item-text-unread'}`}>
                                            <strong>{senderName}</strong> {n.message}
                                        </div>
                                        <div className="notif-bell-item-meta-row">
                                            {genericRef && (
                                                <span className="notif-bell-item-meta notif-bell-item-ref">
                                                    Ref: <strong>{genericRef}</strong>
                                                </span>
                                            )}
                                            {n.requests?.declarant_name && (
                                                <span className="notif-bell-item-meta">
                                                    Declarant: <strong>{n.requests.declarant_name}</strong>
                                                </span>
                                            )}
                                        </div>
                                        <div className="notif-bell-item-time">
                                            <Clock size={12} /> {new Date(n.created_at).toLocaleString()}
                                        </div>
                                    </div>

                                    <div className="notif-bell-item-arrow">
                                        <ArrowRight size={20} />
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