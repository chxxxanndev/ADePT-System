import type { AdminActivityItem } from '../data/dashboardMockData';

interface AdminRecentActivityProps {
    activities: AdminActivityItem[];
}

export function AdminRecentActivity({ activities }: AdminRecentActivityProps) {
    return (
        <div className="admin-card">
            {/* Card Header */}
            <div className="admin-card-header">
                <span className="admin-card-title">Recent Activity</span>
                <button
                    className="activity-full-log-btn"
                    onClick={() => console.log('Open full activity log')}
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
                        <div className={`activity-item ${activity.status}`} key={activity.id}>
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