import type { AdminActivityItem } from '../data/adminTypes';
import { AuditTypeIcon } from '../services/auditIcons';

interface AdminRecentActivityProps {
    activities: AdminActivityItem[];
    onViewFullLog?: () => void;
}

export function AdminRecentActivity({ activities, onViewFullLog }: AdminRecentActivityProps) {
    const visibleActivities = activities.slice(0, 10);

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
            {visibleActivities.length === 0 ? (
                <div className="admin-empty-state">
                    No recent activity yet.
                </div>
            ) : (
                <div className="activity-stack">
                    {visibleActivities.map((activity) => (
                        <div className="activity-item" key={activity.id}>
                            <AuditTypeIcon type={activity.type} />
                            <div className="activity-details">
                                <span className="activity-title">{activity.title}</span>
                                <span className="activity-meta">
                                    <strong>{activity.actor}</strong> &middot; {activity.time}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}