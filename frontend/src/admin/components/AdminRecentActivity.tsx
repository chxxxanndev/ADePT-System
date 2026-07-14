import type { RecentActivityItem } from '../data/dashboardMockData';

interface AdminRecentActivityProps {
    activities: RecentActivityItem[];
}

export function AdminRecentActivity({ activities }: AdminRecentActivityProps) {
    return (
        <div className="admin-card">
            {/* Card Header */}
            <div className="admin-card-header">
                <span className="admin-card-title">Recent Activity</span>
                <button 
                    className="activity-full-log-btn"
                    onClick={() => console.log('View full activity log')}
                >
                    Full Log
                </button>
            </div>

            {/* List of activity items */}
            <div className="activity-stack">
                {activities.map((act) => (
                    <div className={`activity-item ${act.type}`} key={act.id}>
                        {/* Colored visual indicator block */}
                        <div className={`activity-color-block ${act.type}`} />
                        
                        <div className="activity-details">
                            <span className="activity-title">{act.title}</span>
                            <span className="activity-meta">
                                <strong>{act.actor}</strong> , {act.time}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
