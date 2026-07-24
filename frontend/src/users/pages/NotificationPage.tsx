import { Mail, Clock, ArrowRight, CheckCircle } from 'lucide-react';
import type { NotificationItem } from '../hooks/useNotifications';
import '../styles/NotificationPage.css';

interface NotificationPageProps {
    notifications: NotificationItem[];
    onOpenRequest: (requestId: string, notifId: string) => void;
    loading: boolean;
    unreadCount?: number;
    onMarkAllRead?: () => void;
}

export function NotificationPage({ notifications, onOpenRequest, loading, unreadCount = 0, onMarkAllRead }: NotificationPageProps) {
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
                {loading ? (
                    <div className="notif-loading-state">Loading notifications...</div>
                ) : notifications.length === 0 ? (
                    <div className="notif-empty-state">
                        <div className="notif-empty-icon">
                            <Mail size={48} strokeWidth={1} />
                        </div>
                        <p className="notif-empty-text">No notifications yet.</p>
                    </div>
                ) : (
                    <div className="notif-list">
                        {notifications.map((n) => (
                            <div
                                key={n.id}
                                className={`notif-bell-item ${!n.is_read ? 'notif-bell-item-unread' : ''}`}
                                onClick={() => onOpenRequest(n.request_id, n.id)}
                            >
                                <div
                                    className={`notif-bell-item-icon ${n.is_read ? 'notif-bell-item-icon-read' : 'notif-bell-item-icon-unread'}`}
                                >
                                    {n.is_read ? <CheckCircle size={20} /> : <Mail size={20} />}
                                </div>

                                <div className="notif-bell-item-body">
                                    <div className={`notif-bell-item-text ${n.is_read ? 'notif-bell-item-text-read' : 'notif-bell-item-text-unread'}`}>
                                        <strong>{n.actor?.first_name} {n.actor?.last_name}</strong> {n.message}
                                    </div>
                                    <div className="notif-bell-item-meta-row">
                                        <span className="notif-bell-item-meta notif-bell-item-ref">
                                            Ref: <strong>{n.requests?.reference_number || n.requests?.control_number}</strong>
                                        </span>
                                        <span className="notif-bell-item-meta">
                                            Declarant: <strong>{n.requests?.declarant_name}</strong>
                                        </span>
                                    </div>
                                    <div className="notif-bell-item-time">
                                        <Clock size={12} /> {new Date(n.created_at).toLocaleString()}
                                    </div>
                                </div>

                                <div className="notif-bell-item-arrow">
                                    <ArrowRight size={20} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}