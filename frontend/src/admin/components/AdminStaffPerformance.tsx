import { RefreshIcon } from '../../users/components/icons';
import type { StaffPerformanceItem } from '../services/userManagementService';

interface AdminStaffPerformanceProps {
    items: StaffPerformanceItem[];
    onRefresh: () => void;
    isRefreshing: boolean;
    onViewFull: () => void;
}

export function AdminStaffPerformance({
    items,
    onRefresh,
    isRefreshing,
    onViewFull,
}: AdminStaffPerformanceProps) {
    const maxRequests = items[0]?.requests ?? 1;

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
                {items.length === 0 && (
                    <p style={{ color: '#9aa0af', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
                        No performance data yet.
                    </p>
                )}
                {items.map((staff, index) => (
                    <div className="staff-performance-item" key={staff.id}>
                        <div className="staff-perf-left">
                            <span className="staff-perf-rank">#{index + 1}</span>
                            <div
                                className="staff-perf-avatar"
                                style={{ backgroundColor: staff.avatarBg }}
                            >
                                {staff.initials}
                            </div>
                            <div className="staff-perf-info">
                                <span className="staff-perf-name">{staff.name}</span>
                                <div className="staff-perf-bar-bg">
                                    <div
                                        className="staff-perf-bar-fill"
                                        style={{
                                            width: `${maxRequests > 0 ? (staff.requests / maxRequests) * 100 : 0}%`,
                                            backgroundColor: staff.avatarBg,
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                        <span className="staff-perf-req-pill">{staff.requests} req</span>
                    </div>
                ))}
            </div>

            {/* View Full button */}
            <button
                type="button"
                className="staff-perf-view-full-btn"
                onClick={onViewFull}
            >
                View Full Performance →
            </button>
        </div>
    );
}