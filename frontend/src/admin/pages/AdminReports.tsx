import { useEffect, useMemo, useState } from 'react';
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

const API_BASE_URL = 'http://localhost:5000/api/users';

interface MonthlyRequest {
    month: string;
    count: number;
    color: string;
}

interface RawAccountRequest {
    id: string;
    applicantName?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    requestedRole?: string;
    status?: string;
    submitted?: string;
    created_at?: string;
}

interface ReportRow {
    id: string;
    name: string;
    email: string;
    role: string;
    status: 'pending' | 'approved' | 'disapproved';
    submitted: string;
    submittedRaw: string;
}

function toReportRow(payload: RawAccountRequest): ReportRow {
    const fullName = payload.applicantName || `${payload.first_name || ''} ${payload.last_name || ''}`.trim();
    const status: ReportRow['status'] =
        payload.status === 'approved' ? 'approved'
            : payload.status === 'declined' || payload.status === 'disapproved' || payload.status === 'rejected' ? 'disapproved'
            : 'pending';
    const submittedRaw = payload.submitted || payload.created_at || new Date().toISOString();
    const submittedDate = new Date(submittedRaw);
    return {
        id: payload.id,
        name: fullName || payload.email || 'Unknown applicant',
        email: payload.email || '—',
        role: payload.requestedRole || 'Office Staff',
        status,
        submittedRaw,
        submitted: Number.isNaN(submittedDate.getTime())
            ? submittedRaw
            : submittedDate.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
    };
}

const MONTH_COLORS = ['#29237a', '#00bcd4'];

function buildMonthlyBuckets(rows: ReportRow[]): MonthlyRequest[] {
    // Buckets the last 6 calendar months, oldest first, and counts how many
    // account requests were submitted in each — this is what feeds the bar
    // chart below instead of hardcoded numbers.
    const now = new Date();
    const buckets: { key: string; label: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        buckets.push({
            key: `${d.getFullYear()}-${d.getMonth()}`,
            label: d.toLocaleDateString('en-US', { month: 'short' }),
            count: 0,
        });
    }
    const bucketByKey = new Map(buckets.map((b) => [b.key, b]));

    rows.forEach((row) => {
        const d = new Date(row.submittedRaw);
        if (Number.isNaN(d.getTime())) return;
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        const bucket = bucketByKey.get(key);
        if (bucket) bucket.count += 1;
    });

    return buckets.map((b, i) => ({ month: b.label, count: b.count, color: MONTH_COLORS[i % 2] }));
}

const distribution = [
    { label: 'Tax declaration', percent: 52, color: '#252175' },
    { label: 'Cert. landholding', percent: 26, color: '#00BCD4' },
    { label: 'No landholding', percent: 22, color: '#F2994A' },
];

function buildDonutSegments(slices: typeof distribution, radius: number) {
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
    const [rows, setRows] = useState<ReportRow[]>([]);
    const [loading, setLoading] = useState(false);
    // TODO: replace with a real total-documents count once a documents
    // endpoint exists — account requests alone don't tell us this number.
    const [totalDocuments] = useState(8984);

    const fullName = `${user.firstName || 'Mommy'} ${user.lastName || 'Dionisia'}`;
    const initials = `${user.firstName?.[0] || 'M'}${user.lastName?.[0] || 'D'}`;
    // Every account created through this system is Office Staff — there is
    // no other requestable role — so the report always shows this label
    // regardless of who's currently viewing the page.
    const roleLabel = 'Office Staff';

    const loadReportData = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE_URL}/account-requests`);
            if (!res.ok) throw new Error('Failed to load report data.');
            const data = await res.json();
            setRows((data.requests || []).map(toReportRow));
        } catch {
            setRows([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReportData();
        // Keep this page's counts fresh the moment a decision happens
        // anywhere else in the app (Account Requests page).
        const handler = () => void loadReportData();
        window.addEventListener('staff-directory:updated', handler);
        return () => window.removeEventListener('staff-directory:updated', handler);
    }, []);

    const totalRequestAccounts = rows.length;
    const totalApproved = rows.filter((r) => r.status === 'approved').length;
    const totalDisapproved = rows.filter((r) => r.status === 'disapproved').length;

    const monthlyRequests = useMemo(() => buildMonthlyBuckets(rows), [rows]);

    const filteredRows = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter(
            (r) =>
                r.name.toLowerCase().includes(q) ||
                r.email.toLowerCase().includes(q) ||
                r.role.toLowerCase().includes(q) ||
                r.status.toLowerCase().includes(q)
        );
    }, [rows, searchQuery]);

    const radius = 68;
    const segments = buildDonutSegments(distribution, radius);

    const handleExportPdf = () => {
        // Dependency-free PDF export: the browser's native "Print to PDF"
        // does the job. #admin-reports-print-root is scoped to hide the
        // sidebar/search/export controls via the @media print rules in
        // AdminReports.css (see the snippet appended below).
        window.print();
    };

    return (
        <div className="admin-reports-page" id="admin-reports-print-root">
            {/* Page header */}
            <div className="rq-page-header no-print">
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
                        placeholder="Search applicants, roles, or status"
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
                <div className="ar-stat-card ar-stat-card--gold">
                    <span className="ar-stat-label">Total request accounts</span>
                    <span className="ar-stat-value">{totalRequestAccounts.toLocaleString()}</span>
                </div>
                <div className="ar-stat-card ar-stat-card--green">
                    <span className="ar-stat-label">Total approved</span>
                    <span className="ar-stat-value">{totalApproved.toLocaleString()}</span>
                </div>
                <div className="ar-stat-card ar-stat-card--red">
                    <span className="ar-stat-label">Total disapproved</span>
                    <span className="ar-stat-value">{totalDisapproved.toLocaleString()}</span>
                </div>
            </div>

            {/* Chart row */}
            <div className="ar-charts-row">
                {/* Bar chart — now driven by real account-request submission dates */}
                <div className="admin-card ar-bar-card">
                    <div className="ar-bar-card-header">
                        <h2 className="admin-card-title">Requests by month</h2>
                        <button type="button" className="ar-export-btn no-print" onClick={handleExportPdf}>
                            Export PDF
                        </button>
                    </div>
                    <p className="ar-chart-description">
                        Account requests submitted per month
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
                                    allowDecimals={false}
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

            {/* Searchable account-requests table — this is what the search bar filters */}
            <div className="admin-card ar-search-results-card">
                <h2 className="admin-card-title">Account requests</h2>
                <div className="admin-table-container">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Applicant</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Submitted</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', opacity: 0.6, padding: '20px' }}>
                                        Loading...
                                    </td>
                                </tr>
                            )}
                            {!loading && filteredRows.length === 0 && (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', opacity: 0.6, padding: '20px' }}>
                                        No requests match your search.
                                    </td>
                                </tr>
                            )}
                            {!loading && filteredRows.map((r) => (
                                <tr key={r.id}>
                                    <td><strong>{r.name}</strong></td>
                                    <td>{r.email}</td>
                                    <td>{r.role}</td>
                                    <td style={{ textTransform: 'capitalize' }}>{r.status}</td>
                                    <td>{r.submitted}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}