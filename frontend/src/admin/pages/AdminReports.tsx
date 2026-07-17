import { useState } from 'react';
import '../styles/AdminReports.css';
import { SearchIcon } from '../components/icons';
import type { User } from '../../auth-folder/types/auth';

interface MonthlyRequest {
    month: string;
    count: number;
}

interface DistributionSlice {
    label: string;
    percent: number;
    color: string;
}

// TODO: replace with real data from a useAdminReports hook / API call
const monthlyRequests: MonthlyRequest[] = [
    { month: 'Feb', count: 210 },
    { month: 'Mar', count: 180 },
    { month: 'Apr', count: 240 },
    { month: 'May', count: 300 },
    { month: 'Jun', count: 260 },
    { month: 'Jul', count: 140 },
];

const totalDocuments = 8984;
const approvalRate = 88;
const avgProcessingDays = 1.8;

const distribution: DistributionSlice[] = [
    { label: 'Tax declaration', percent: 52, color: '#252175' },
    { label: 'Cert. landholding', percent: 26, color: '#00BCD4' },
    { label: 'No landholding', percent: 22, color: '#F2994A' },
];

// Build stroke-dasharray offsets for each donut segment
function buildDonutSegments(slices: DistributionSlice[], radius: number) {
    const circumference = 2 * Math.PI * radius;
    let cumulative = 0;
    return slices.map((slice) => {
        const dash = (slice.percent / 100) * circumference;
        const segment = {
            ...slice,
            dasharray: `${dash} ${circumference - dash}`,
            dashoffset: -cumulative,
        };
        cumulative += dash;
        return segment;
    });
}

interface AdminReportsProps {
    user: User;
}

export function AdminReports({ user }: AdminReportsProps) {
    const [searchQuery, setSearchQuery] = useState('');

    const fullName = `${user.firstName || 'Mommy'} ${user.lastName || 'Dionisia'}`;
    const initials = `${user.firstName?.[0] || 'M'}${user.lastName?.[0] || 'D'}`;
    const roleLabel = user.role === 'SUPER_ADMIN' ? 'Super Admin' : user.role === 'OFFICE_STAFF' ? 'Office Staff' : user.role || 'Super Admin';

    const maxCount = Math.max(...monthlyRequests.map((m) => m.count));
    const radius = 68;
    const segments = buildDonutSegments(distribution, radius);

    return (
        <div className="admin-reports-page">
            {/* Page header — matches Request Queue's header pattern */}
            <div className="rq-page-header">
                <div className="rq-page-header-row">
                    <div>
                        <h1 className="rq-page-title">Reports &amp; Analytics</h1>
                        <p className="rq-page-subtitle">Trends across staff performance and document processing.</p>
                    </div>

                    <div className="admin-profile-widget">
                        <div className="profile-widget-avatar-container">
                            {initials}
                        </div>
                        <div className="profile-widget-info">
                            <span className="profile-widget-name">{fullName}</span>
                            <span className="profile-widget-email">{user.email || 'provincialassessor@gmail.com'}</span>
                            <div className="profile-widget-meta">
                                <span className="profile-widget-role">{roleLabel}</span>
                                <span>Last Login : Today • 8:12 AM</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search bar */}
                <div className="rq-search-wrapper">
                    <input
                        type="text"
                        className="rq-search-input"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <span className="rq-search-icon">
                        <SearchIcon size={16} />
                    </span>
                </div>
            </div>

            {/* Stat cards */}
            <div className="ar-stats-row">
                <div className="ar-stat-card ar-stat-card--plain">
                    <span className="ar-stat-label">Total documents</span>
                    <span className="ar-stat-value">{totalDocuments.toLocaleString()}</span>
                </div>
                <div className="ar-stat-card ar-stat-card--green">
                    <span className="ar-stat-label">Approval rate</span>
                    <span className="ar-stat-value">{approvalRate}%</span>
                </div>
                <div className="ar-stat-card ar-stat-card--gold">
                    <span className="ar-stat-label">Avg. processing time</span>
                    <span className="ar-stat-value">{avgProcessingDays} days</span>
                </div>
            </div>

            {/* Chart row */}
            <div className="ar-charts-row">
                {/* Bar chart */}
                <div className="admin-card ar-bar-card">
                    <div className="ar-bar-card-header">
                        <h2 className="admin-card-title">Requests by month</h2>
                        <button type="button" className="ar-export-btn">Export</button>
                    </div>

                    <div className="ar-bar-chart">
                        {monthlyRequests.map((item, idx) => (
                            <div className="ar-bar-column" key={item.month}>
                                <span className="ar-bar-value">{item.count}</span>
                                <div
                                    className={`ar-bar ${idx % 2 === 0 ? 'ar-bar--navy' : 'ar-bar--teal'}`}
                                    style={{ height: `${(item.count / maxCount) * 100}%` }}
                                />
                                <span className="ar-bar-label">{item.month}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Donut chart */}
                <div className="admin-card donut-chart-card ar-donut-card">
                    <h2 className="admin-card-title ar-donut-title">Document distribution</h2>

                    <div className="donut-chart-container">
                        <svg viewBox="0 0 170 170" className="donut-chart-svg">
                            {segments.map((seg) => (
                                <circle
                                    key={seg.label}
                                    className="donut-segment"
                                    cx="85"
                                    cy="85"
                                    r={radius}
                                    stroke={seg.color}
                                    strokeDasharray={seg.dasharray}
                                    strokeDashoffset={seg.dashoffset}
                                />
                            ))}
                        </svg>
                        <div className="donut-chart-center-text">
                            <span className="donut-center-val">{totalDocuments.toLocaleString()}</span>
                            <span className="donut-center-label">Total</span>
                        </div>
                    </div>

                    <div className="donut-legend-list">
                        {distribution.map((slice) => (
                            <div className="donut-legend-item" key={slice.label}>
                                <div className="donut-legend-item-left">
                                    <span className="donut-legend-marker" style={{ backgroundColor: slice.color }} />
                                    {slice.label}
                                </div>
                                <div className="donut-legend-item-right">
                                    <span className="donut-legend-pct">{slice.percent}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}