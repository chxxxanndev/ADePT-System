import { useState } from 'react';
import { RefreshIcon } from '../../users/components/icons';
import type { StaffPerformanceItem } from '../services/userManagementService';

interface AdminStaffPerformanceProps {
    items: StaffPerformanceItem[];
    allTimeItems: StaffPerformanceItem[];
    onRefresh: () => void;
    isRefreshing: boolean;
    onViewFull: () => void;
}

export function AdminStaffPerformance({
    items,
    allTimeItems,
    onRefresh,
    isRefreshing,
    onViewFull,
}: AdminStaffPerformanceProps) {
    const [showAll, setShowAll] = useState(false);

    const activeItems = showAll ? allTimeItems : items;
    const visibleItems = activeItems.slice(0, 10);
    const maxRequests = visibleItems[0]?.requests ?? 1;

    return (
        <div className="admin-card">
            {/* Card Header */}
            <div className="admin-card-header">
                <span className="admin-card-title" style={{ fontSize: '18px', fontWeight: '750' }}>Staff Performance</span>
                <div className="admin-card-actions">
                    {/* All Requests toggle */}
                    <button
                        type="button"
                        className="staff-perf-view-full-btn"
                        onClick={() => setShowAll((prev) => !prev)}
                        style={{
                            background: showAll ? 'var(--admin-primary, #3D2E7C)' : undefined,
                            color: showAll ? '#fff' : undefined,
                            borderColor: showAll ? 'var(--admin-primary, #3D2E7C)' : undefined,
                            transition: 'background 0.18s, color 0.18s',
                        }}
                        title={showAll ? 'Switch back to date-filtered view' : 'Show all-time totals'}
                    >
                        {showAll ? 'Date Filtered' : 'All Requests'}
                    </button>

                    <button
                        type="button"
                        className="staff-perf-view-full-btn"
                        onClick={onViewFull}
                    >
                        View Full Performance
                    </button>

                    <button
                        className={`admin-refresh-btn ${isRefreshing ? 'spinning' : ''}`}
                        onClick={onRefresh}
                        title="Refresh Staff Performance"
                        disabled={isRefreshing}
                    >
                        <RefreshIcon size={16} />
                    </button>
                </div>
            </div>

            {/* Mode badge */}
            <span className="staff-performance-pill">
                {showAll ? 'All-Time Rankings' : 'Top Performing Staff'}
            </span>

            {/* List of Staff Performance Rows */}
            <div className="staff-list-container">
                {visibleItems.length === 0 && (
                    <p style={{ color: '#9aa0af', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
                        {showAll
                            ? 'No performance data available.'
                            : 'No data for the selected period.'}
                    </p>
                )}
                {visibleItems.map((staff, index) => (
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
        </div>
    );
}