import { RefreshIcon } from '../../users/components/icons';
import type { StaffPerformanceItem } from '../data/dashboardMockData';

interface AdminStaffPerformanceProps {
    items: StaffPerformanceItem[];
    onRefresh: () => void;
    isRefreshing: boolean;
}

export function AdminStaffPerformance({
    items,
    onRefresh,
    isRefreshing
}: AdminStaffPerformanceProps) {
    // Proportional base for width percentage
    const maxRequests = 160;

    return (
        <div className="admin-card">
            {/* Card Header */}
            <div className="admin-card-header">
                <div className="admin-card-title-group" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="admin-card-title" style={{ fontSize: '18px', fontWeight: '750' }}>Staff Performance</span>
                    <span className="staff-performance-pill">Top Performing Staff</span>
                </div>
                <button
                    className={`admin-refresh-btn ${isRefreshing ? 'spinning' : ''}`}
                    onClick={onRefresh}
                    title="Refresh Staff Performance"
                    disabled={isRefreshing}
                >
                    <RefreshIcon size={16} />
                </button>
            </div>

            {/* List of Staff Performance Meters */}
            <div className="staff-list-container">
                {items.map((staff) => {
                    const widthPercent = Math.min(100, Math.max(5, (staff.requests / maxRequests) * 100));

                    return (
                        <div className="staff-performance-item" key={staff.id}>
                            <div className="staff-perf-left">
                                <div
                                    className="staff-perf-avatar"
                                    style={{ backgroundColor: staff.avatarBg }}
                                >
                                    {staff.initials}
                                </div>
                                <span className="staff-perf-name">{staff.name}</span>
                                <div className="staff-perf-bar-wrapper">
                                    <div
                                        className="staff-perf-bar-fill"
                                        style={{ width: `${widthPercent}%` }}
                                    />
                                    <span className="staff-perf-bar-text">
                                        {staff.requests} Request
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}