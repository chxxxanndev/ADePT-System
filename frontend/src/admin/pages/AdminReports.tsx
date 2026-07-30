import { useEffect, useMemo, useState } from 'react';
import { fetchReportsAnalytics } from '../services/userManagementService';
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
import type { User } from '../../auth-folder/types/auth';
import { hasAdminLevel } from '../../utils/permissions';
import { RefreshIcon } from '../../users/components/icons';

interface MonthlyRequest {
    month: string;
    count: number;
    color: string;
}

interface ReportRow {
    id: string;
    referenceNo: string;
    clientName: string;
    documentType: string;
    requestedDate: string;
    processedBy: string;
    status: string;
    orNumber: string;
    // raw ISO date string for bucketing
    submittedRaw: string;
}

interface DistributionSlice {
    label: string;
    percent: number;
    color: string;
}

const MONTH_COLORS = ['#29237a', '#00bcd4'];
const FALLBACK_COLORS = ['#252175', '#00BCD4', '#F2994A', '#4CAF50', '#FDD835', '#9C27B0'];

function buildMonthlyBuckets(rows: ReportRow[]): MonthlyRequest[] {
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
    const [rows, setRows] = useState<ReportRow[]>([]);
    const [totalDocuments, setTotalDocuments] = useState(0);
    const [distribution, setDistribution] = useState<DistributionSlice[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Admin';
    const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}` || 'A';
    const roleLabel =
        user.role === 'SUPER_ADMIN' ? 'Super Admin' :
        user.role === 'ADMIN' ? 'Admin' :
        'Office Staff';

    const loadReportData = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);
        try {
            const data = await fetchReportsAnalytics();

            if (data.totalDocuments !== undefined) {
                setTotalDocuments(data.totalDocuments);
            }

            if (data.rows) {
                setRows(data.rows.map((r: any) => ({
                    id: r.id,
                    referenceNo: r.referenceNo || 'N/A',
                    clientName: r.clientName || 'Anonymous Client',
                    documentType: r.documentType || 'N/A',
                    requestedDate: r.requestedDate || '',
                    processedBy: r.processedBy || 'Office Staff',
                    status: r.status || 'Pending',
                    orNumber: r.orNumber || 'N/A',
                    // use requestedDate as the raw ISO string for monthly bucketing
                    submittedRaw: r.requestedDate || '',
                })));
            }

            // Build document distribution from actual data if available
            if (data.rows && data.rows.length > 0) {
                const typeCounts: Record<string, number> = {};
                data.rows.forEach((r: any) => {
                    const doc = r.documentType || 'Unknown';
                    typeCounts[doc] = (typeCounts[doc] || 0) + 1;
                });
                const total = Object.values(typeCounts).reduce((a, b) => a + b, 0) || 1;
                const slices: DistributionSlice[] = Object.entries(typeCounts).map(([label, count], i) => ({
                    label,
                    percent: Math.round((count / total) * 100),
                    color: FALLBACK_COLORS[i % FALLBACK_COLORS.length],
                }));
                setDistribution(slices);
            } else {
                setDistribution([
                    { label: 'Tax Declaration', percent: 52, color: '#252175' },
                    { label: 'Cert. Landholding', percent: 26, color: '#00BCD4' },
                    { label: 'No Landholding', percent: 22, color: '#F2994A' },
                ]);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load reports data.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        void loadReportData();
    }, []);

    const totalApproved = rows.filter((r) => r.status === 'Released' || r.status === 'approved').length;
    const totalDisapproved = rows.filter((r) => r.status === 'Void' || r.status === 'Cancelled' || r.status === 'disapproved').length;
    const totalRequestAccounts = totalDocuments || rows.length;

    const monthlyRequests = useMemo(() => buildMonthlyBuckets(rows), [rows]);

    const canExport = hasAdminLevel(user, 'MEDIUM');

    const radius = 68;
    const segments = buildDonutSegments(distribution, radius);

    const handleExportPdf = () => {
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

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                            type="button"
                            className={`admin-refresh-btn${refreshing ? ' spinning' : ''}`}
                            onClick={() => void loadReportData(true)}
                            disabled={refreshing || loading}
                            title="Refresh reports"
                        >
                            <RefreshIcon size={16} />
                        </button>

                        <div className="admin-profile-widget audit-user-chip">
                            <div className="profile-widget-avatar-container">
                                {user.avatarUrl
                                    ? <img src={user.avatarUrl} alt={fullName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                    : initials}
                            </div>
                            <div className="profile-widget-info audit-user-info">
                                <span className="profile-widget-name audit-user-name">{fullName}</span>
                                <span className="profile-widget-role">{roleLabel}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Error banner */}
            {error && (
                <div className="ar-error-banner">
                    ⚠ {error} — showing last available data.
                </div>
            )}

            {/* Stat cards */}
            <div className="ar-stats-row">
                <div className="ar-stat-card ar-stat-card--gold">
                    <span className="ar-stat-label">Total Requests</span>
                    <span className="ar-stat-value">
                        {loading ? '—' : totalRequestAccounts.toLocaleString()}
                    </span>
                </div>
                <div className="ar-stat-card ar-stat-card--green">
                    <span className="ar-stat-label">Total Released</span>
                    <span className="ar-stat-value">
                        {loading ? '—' : totalApproved.toLocaleString()}
                    </span>
                </div>
                <div className="ar-stat-card ar-stat-card--red">
                    <span className="ar-stat-label">Total Voided / Cancelled</span>
                    <span className="ar-stat-value">
                        {loading ? '—' : totalDisapproved.toLocaleString()}
                    </span>
                </div>
            </div>

            {/* Chart row */}
            <div className="ar-charts-row">
                {/* Bar chart */}
                <div className="admin-card ar-bar-card">
                    <div className="ar-bar-card-header">
                        <h2 className="admin-card-title">Requests by month</h2>
                        {canExport && (
                            <button type="button" className="ar-export-btn no-print" onClick={handleExportPdf}>
                                Export PDF
                            </button>
                        )}
                    </div>
                    <p className="ar-chart-description">
                        Document requests submitted per month (last 6 months)
                    </p>

                    <div className="ar-chart-canvas">
                        {loading ? (
                            <div className="ar-chart-loading">Loading chart data…</div>
                        ) : (
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
                        )}
                    </div>

                    <div className="ar-chart-legend">
                        <div className="ar-legend-item">
                            <span className="ar-legend-dot" style={{ backgroundColor: '#29237a' }} />
                            Older months
                        </div>
                        <div className="ar-legend-item">
                            <span className="ar-legend-dot" style={{ backgroundColor: '#00bcd4' }} />
                            Recent months
                        </div>
                    </div>
                </div>

                {/* Donut chart — now driven by real document type distribution */}
                <div className="admin-card donut-chart-card ar-donut-card">
                    <h2 className="admin-card-title ar-donut-title">Document distribution</h2>

                    {loading ? (
                        <div className="ar-chart-loading">Loading…</div>
                    ) : (
                        <>
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
                        </>
                    )}
                </div>
            </div>

            {/* Requests table */}
            <div className="admin-card" style={{ marginTop: '24px' }}>
                <div style={{ padding: '20px 24px 12px', borderBottom: '1px solid #ecedf3' }}>
                    <h2 className="admin-card-title" style={{ margin: 0 }}>
                        All Requests
                        <span style={{ marginLeft: '10px', fontSize: '13px', fontWeight: 500, color: '#6b6f80' }}>
                            ({rows.length} total)
                        </span>
                    </h2>
                </div>
                <div className="admin-table-container">
                    {loading ? (
                        <div style={{ padding: '32px', textAlign: 'center', color: '#9aa0af' }}>Loading requests…</div>
                    ) : rows.length === 0 ? (
                        <div style={{ padding: '32px', textAlign: 'center', color: '#9aa0af' }}>No requests found.</div>
                    ) : (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Reference No.</th>
                                    <th>Client</th>
                                    <th>Document Type</th>
                                    <th>Date</th>
                                    <th>Processed By</th>
                                    <th>O.R. No.</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row) => (
                                    <tr key={row.id}>
                                        <td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#5d6178' }}>
                                            {row.referenceNo}
                                        </td>
                                        <td><strong>{row.clientName}</strong></td>
                                        <td>{row.documentType}</td>
                                        <td>{row.requestedDate}</td>
                                        <td>{row.processedBy}</td>
                                        <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{row.orNumber}</td>
                                        <td>
                                            <span className={`status-indicator ${
                                                row.status === 'Released' ? 'rq-status-released' :
                                                row.status === 'Processing' ? 'rq-status-processing' :
                                                row.status === 'Payment Verified' ? 'rq-status-paid' :
                                                row.status === 'Void' || row.status === 'Cancelled' ? 'rq-status-void' :
                                                'rq-status-pending'
                                            }`}>
                                                <span className="status-dot" />
                                                {row.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}