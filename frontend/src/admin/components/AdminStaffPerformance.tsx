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
    return (
        <div className="admin-card">
            {/* Card Header */}
            <div className="admin-card-header">
                <span className="admin-card-title" style={{ fontSize: '18px', fontWeight: '750' }}>Staff Performance</span>
                <button
                    className={`admin-refresh-btn ${isRefreshing ? 'spinning' : ''}`}
                    onClick={onRefresh}
                    title="Refresh Staff Performance"
                    disabled={isRefreshing}
                >
                    <RefreshIcon size={16} />
                </button>
            </div>

            <span className="staff-performance-pill">Top Performing Staff</span>

            {/* List of Staff Performance Rows */}
            <div className="staff-list-container">
                {items.map((staff) => (
                    <div className="staff-performance-item" key={staff.id}>
                        <div className="staff-perf-left">
                            <div
                                className="staff-perf-avatar"
                                style={{ backgroundColor: staff.avatarBg }}
                            >
                                {staff.initials}
                            </div>
                            <span className="staff-perf-name">{staff.name}</span>
                        </div>
                        <span className="staff-perf-req-pill">{staff.requests} Request</span>
                    </div>
                ))}
            </div>
        </div>
    );
}