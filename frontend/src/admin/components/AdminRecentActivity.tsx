import type { AdminActivityItem } from '../data/dashboardMockData';

interface AdminRecentActivityProps {
    activities: AdminActivityItem[];
    onViewFullLog?: () => void;
}

export function AdminRecentActivity({ activities, onViewFullLog }: AdminRecentActivityProps) {
    return (
        <div className="admin-card">
            {/* Card Header */}
            <div className="admin-card-header">
                <span className="admin-card-title">Recent Activity</span>
                <button
                    className="activity-full-log-btn"
                    onClick={() => onViewFullLog?.()}
                >
                    Full Log
                </button>
            </div>

            {/* Activity Stack */}
            <div className="activity-stack">
                {activities.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#64748B', padding: '12px 0' }}>
                        No recent activity yet.
                    </p>
                ) : (
                    activities.map((activity) => (
                        <div className="activity-item" key={activity.id}>
                            <div className={`activity-color-block ${activity.status}`} />
                            <div className="activity-details">
                                <span className="activity-title">{activity.title}</span>
                                <span className="activity-meta">
                                    <strong>{activity.actor}</strong> &middot; {activity.time}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}