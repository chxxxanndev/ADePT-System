import { useState } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';
import '../styles/AdminReports.css';
import { SearchIcon } from '../components/icons';
import type { User } from '../../auth-folder/types/auth';

interface MonthlyRequest {
    month: string;
    count: number;
    color: string;
}

interface DistributionSlice {
    label: string;
    percent: number;
    color: string;
}

type RegistrationStatus = 'Registered' | 'Inactive';
type AccountStatus = 'Enabled' | 'Disabled';

interface StaffStatusRow {
    id: string;
    name: string;
    initials: string;
    avatarColor: string;
    role: string;
    registrationStatus: RegistrationStatus;
    accountStatus: AccountStatus;
}

// TODO: replace with real data from a useAdminReports hook / API call
const monthlyRequests: MonthlyRequest[] = [
    { month: 'Feb', count: 210, color: '#29237a' },
    { month: 'Mar', count: 180, color: '#00bcd4' },
    { month: 'Apr', count: 240, color: '#29237a' },
    { month: 'May', count: 300, color: '#00bcd4' },
    { month: 'Jun', count: 260, color: '#29237a' },
    { month: 'Jul', count: 140, color: '#00bcd4' },
];

const totalDocuments = 8984;
const approvalRate = 88;
const avgProcessingDays = 1.8;

const distribution: DistributionSlice[] = [
    { label: 'Tax declaration', percent: 52, color: '#252175' },
    { label: 'Cert. landholding', percent: 26, color: '#00BCD4' },
    { label: 'No landholding', percent: 22, color: '#F2994A' },
];

// TODO: replace with real data from a useStaffStatus hook / API call.
// registrationStatus reflects whether the staff member has completed
// registration and is currently active. accountStatus reflects whether
// their account has been administratively disabled.
const staffStatusRows: StaffStatusRow[] = [
    { id: '1', name: 'Maria Lopez', initials: 'ML', avatarColor: '#29237a', role: 'Cashier', registrationStatus: 'Registered', accountStatus: 'Enabled' },
    { id: '2', name: 'John Cruz', initials: 'JC', avatarColor: '#1E9E5A', role: 'Records Officer', registrationStatus: 'Registered', accountStatus: 'Enabled' },
    { id: '3', name: 'Ana Marquez', initials: 'AM', avatarColor: '#00BCD4', role: 'Encoder', registrationStatus: 'Registered', accountStatus: 'Enabled' },
    { id: '4', name: 'Dennis Cruz', initials: 'DC', avatarColor: '#6D4FC4', role: 'Encoder', registrationStatus: 'Registered', accountStatus: 'Disabled' },
    { id: '5', name: 'Anne Reyes', initials: 'AR', avatarColor: '#D89A1D', role: 'Assessor', registrationStatus: 'Inactive', accountStatus: 'Disabled' },
    { id: '6', name: 'Emilio Bautista', initials: 'EB', avatarColor: '#EF4444', role: 'Cashier', registrationStatus: 'Inactive', accountStatus: 'Enabled' },
    { id: '7', name: 'Linda Santos', initials: 'LS', avatarColor: '#B8791E', role: 'Records Officer', registrationStatus: 'Registered', accountStatus: 'Enabled' },
    { id: '8', name: 'Josephine Reyes', initials: 'JR', avatarColor: '#29237a', role: 'Assessor', registrationStatus: 'Registered', accountStatus: 'Enabled' },
];

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

function AdminBarTooltip({ active, payload }: any) {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0];
    return (
        <div className="ar-chart-tooltip">
            <div className="ar-chart-tooltip-label">{item.payload.month}</div>
            <div style={{ color: item.payload.color }}>
                {item.value.toLocaleString()} requests
            </div>
        </div>
    );
}

interface AdminReportsProps {
    user: User;
}

export function AdminReports({ user }: AdminReportsProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [staffSearchQuery, setStaffSearchQuery] = useState('');

    const fullName = `${user.firstName || 'Mommy'} ${user.lastName || 'Dionisia'}`;
    const initials = `${user.firstName?.[0] || 'M'}${user.lastName?.[0] || 'D'}`;
    const roleLabel = user.role === 'SUPER_ADMIN' ? 'Super Admin' : user.role === 'OFFICE_STAFF' ? 'Office Staff' : user.role || 'Super Admin';

    const radius = 68;
    const segments = buildDonutSegments(distribution, radius);

    const filteredStaff = staffStatusRows.filter((s) => {
        const query = staffSearchQuery.toLowerCase();
        return s.name.toLowerCase().includes(query) || s.role.toLowerCase().includes(query);
    });

    return (
        <div className="admin-reports-page">
            {/* Page header */}
            <div className="rq-page-header">
                <div className="rq-page-header-row">
                    <div>
                        <h1 className="rq-page-title">Reports &amp; Analytics</h1>
                        <p className="rq-page-subtitle">Trends across staff performance and document processing.</p>
                    </div>

                    <div className="admin-profile-widget audit-user-chip">
                        <div className="profile-widget-avatar-container">
                            {initials}
                        </div>
                        <div className="profile-widget-info audit-user-info">
                            <span className="profile-widget-name audit-user-name">{fullName}</span>
                            <span className="profile-widget-role">{roleLabel}</span>
                        </div>
                    </div>
                </div>

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
                {/* Bar chart — now recharts, styled like Transaction & Document Status Overview */}
                <div className="admin-card ar-bar-card">
                    <div className="ar-bar-card-header">
                        <h2 className="admin-card-title">Requests by month</h2>
                        <button type="button" className="ar-export-btn">Export</button>
                    </div>
                    <p className="ar-chart-description">
                        Total document requests received per month
                    </p>

                    <div className="ar-chart-canvas">
                        <ResponsiveContainer>
                            <BarChart
                                data={monthlyRequests}
                                margin={{ top: 8, right: 8, left: -12, bottom: 8 }}
                            >
                                <CartesianGrid vertical={false} stroke="rgba(41,35,122,0.08)" />
                                <XAxis
                                    dataKey="month"
                                    tick={{ fontSize: 11, fill: '#8b8fa3' }}
                                    axisLine={{ stroke: 'rgba(41,35,122,0.12)' }}
                                    tickLine={false}
                                    interval={0}
                                />
                                <YAxis
                                    tick={{ fontSize: 11, fill: '#8b8fa3' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    content={<AdminBarTooltip />}
                                    cursor={{ fill: 'rgba(41,35,122,0.04)' }}
                                />
                                <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={56}>
                                    {monthlyRequests.map((entry, i) => (
                                        <Cell key={i} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="ar-chart-legend">
                        <div className="ar-legend-item">
                            <span className="ar-legend-dot" style={{ backgroundColor: '#29237a' }} />
                            Navy months
                        </div>
                        <div className="ar-legend-item">
                            <span className="ar-legend-dot" style={{ backgroundColor: '#00bcd4' }} />
                            Teal months
                        </div>
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

            {/* Staff status roster — names with registration & account status pills */}
            <div className="admin-card ar-staff-table-card">
                <div className="ar-staff-table-header">
                    <div>
                        <h2 className="admin-card-title">Staff status</h2>
                        <span className="ar-staff-table-count">{staffStatusRows.length} staff members</span>
                    </div>

                    <div className="rq-search-wrapper ar-staff-search-wrapper">
                        <input
                            type="text"
                            className="rq-search-input"
                            placeholder="Search staff name or role"
                            value={staffSearchQuery}
                            onChange={(e) => setStaffSearchQuery(e.target.value)}
                        />
                        <span className="rq-search-icon">
                            <SearchIcon size={16} />
                        </span>
                    </div>
                </div>

                <div className="admin-table-container">
                    <table className="admin-table ar-staff-table">
                        <thead>
                            <tr>
                                <th>Staff</th>
                                <th>Role</th>
                                <th>Registration Status</th>
                                <th>Account Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStaff.map((s) => (
                                <tr key={s.id}>
                                    <td>
                                        <div className="ar-staff-cell">
                                            <div className="ar-staff-avatar" style={{ backgroundColor: s.avatarColor }}>
                                                {s.initials}
                                            </div>
                                            <span className="ar-staff-name">{s.name}</span>
                                        </div>
                                    </td>
                                    <td>{s.role}</td>
                                    <td>
                                        <span
                                            className={`ar-status-pill ${s.registrationStatus === 'Registered' ? 'ar-status-registered' : 'ar-status-inactive'
                                                }`}
                                        >
                                            <span className="ar-status-dot" />
                                            {s.registrationStatus}
                                        </span>
                                    </td>
                                    <td>
                                        <span
                                            className={`ar-status-pill ${s.accountStatus === 'Enabled' ? 'ar-status-enabled' : 'ar-status-disabled'
                                                }`}
                                        >
                                            <span className="ar-status-dot" />
                                            {s.accountStatus}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}