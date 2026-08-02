import { useEffect, useMemo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { fetchReportsAnalytics, fetchDashboardMetrics } from '../services/userManagementService';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    Legend,
} from 'recharts';
import '../styles/AdminReports.css';
import type { User } from '../../auth-folder/types/auth';
import { RefreshIcon } from '../../users/components/icons';
import { AdminDocumentDistribution } from '../components/AdminDocumentDistribution';

const PENDING_STATUSES = ['Pending', 'Processing', 'Payment Verified'];

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
    assignedStaff: string;
    status: string;
    orNumber: string;
    submittedRaw: string;
}

interface DistributionSlice {
    label: string;
    count: number;
    color: string;
}

const MONTH_COLORS = ['#29237a', '#00bcd4'];

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
            // Fetch both sources in parallel:
            // - reportsData  → row-level table data (aging, staff pending, etc.)
            // - metrics      → document distribution counted from request_documents
            //                  (same source as the Admin Dashboard donut chart)
            const [data, metrics] = await Promise.all([
                fetchReportsAnalytics(),
                fetchDashboardMetrics().catch(() => null),
            ]);

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
                    assignedStaff: r.assignedStaff || r.processedBy || 'Unassigned',
                    status: r.status || 'Pending',
                    orNumber: r.orNumber || 'N/A',
                    submittedRaw: r.requestedDate || '',
                })));
            }

            // Use the same distribution the Dashboard uses:
            // metrics.distribution is built by counting request_documents rows
            // directly, so it matches the Dashboard donut chart exactly.
            if (metrics?.distribution && metrics.distribution.length > 0) {
                const slices: DistributionSlice[] = metrics.distribution.map((d: any) => ({
                    label: d.label,
                    count: d.value ?? d.count ?? 0,
                    color: d.color,
                }));
                setDistribution(slices);
            } else {
                setDistribution([]);
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

    interface AgingRow {
        status: string;
        under3: number;
        d3to7: number;
        d8to14: number;
        over14: number;
        total: number;
    }

    const agingRows = useMemo<AgingRow[]>(() => {
        const now = Date.now();
        const statuses = ['Pending', 'Processing', 'Payment Verified', 'Released', 'Void', 'Cancelled'];
        const buckets = [
            { key: 'under3', label: 'Under 3 days', max: 3 },
            { key: 'd3to7', label: '3–7 days', max: 7 },
            { key: 'd8to14', label: '1–2 weeks', max: 14 },
            { key: 'over14', label: 'Over 2 weeks', max: Infinity },
        ] as const;

        const agingMap: Record<string, Record<string, number>> = {};
        statuses.forEach((s) => {
            agingMap[s] = { under3: 0, d3to7: 0, d8to14: 0, over14: 0 };
        });

        rows.forEach((r) => {
            const ageDays = (now - new Date(r.submittedRaw).getTime()) / (1000 * 60 * 60 * 24);
            const bucket = buckets.find((b) => ageDays < b.max) || buckets[buckets.length - 1];
            if (agingMap[r.status]) agingMap[r.status][bucket.key]++;
        });

        return statuses
            .filter((s) => {
                const v = agingMap[s];
                return v.under3 || v.d3to7 || v.d8to14 || v.over14;
            })
            .map((status): AgingRow => {
                const v = agingMap[status];
                const total = v.under3 + v.d3to7 + v.d8to14 + v.over14;
                // FIX: Explicitly returning properties to satisfy AgingRow interface
                return { 
                  status, 
                  under3: v.under3, 
                  d3to7: v.d3to7, 
                  d8to14: v.d8to14, 
                  over14: v.over14, 
                  total 
                };
            });
    }, [rows]);

    interface MonthlyRate {
        month: string;
        released: number;
        voided: number;
        total: number;
        releaseRate: number;
        voidRate: number;
    }

    const monthlyRates = useMemo<MonthlyRate[]>(() => {
        const now = new Date();
        const buckets: { key: string; month: string; total: number; released: number; voided: number }[] = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            buckets.push({
                key: `${d.getFullYear()}-${d.getMonth()}`,
                month: d.toLocaleDateString('en-US', { month: 'short' }),
                total: 0,
                released: 0,
                voided: 0,
            });
        }
        const byKey = new Map(buckets.map((b) => [b.key, b]));

        rows.forEach((r) => {
            const d = new Date(r.submittedRaw);
            if (Number.isNaN(d.getTime())) return;
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            const b = byKey.get(key);
            if (!b) return;
            b.total++;
            if (r.status === 'Released' || r.status === 'approved') b.released++;
            if (r.status === 'Void' || r.status === 'Cancelled' || r.status === 'disapproved') b.voided++;
        });

        return buckets.map((b) => ({
            month: b.month,
            total: b.total,
            released: b.released,
            voided: b.voided,
            releaseRate: b.total > 0 ? Math.round((b.released / b.total) * 100) : 0,
            voidRate: b.total > 0 ? Math.round((b.voided / b.total) * 100) : 0,
        }));
    }, [rows]);

    const [staffStatusFilter, setStaffStatusFilter] = useState<string>('all');
    interface StaffPendingRow {
        staff: string;
        status: string;
        count: number;
    }
    const staffPendingRows = useMemo<StaffPendingRow[]>(() => {
        const grouped: Record<string, Record<string, number>> = {};
        rows.forEach((r) => {
            if (!PENDING_STATUSES.includes(r.status)) return;
            if (staffStatusFilter !== 'all' && r.status !== staffStatusFilter) return;
            const staff = r.assignedStaff || r.processedBy || 'Unassigned';
            if (!grouped[staff]) grouped[staff] = {};
            grouped[staff][r.status] = (grouped[staff][r.status] || 0) + 1;
        });
        const result: StaffPendingRow[] = [];
        Object.entries(grouped).forEach(([staff, statuses]) => {
            Object.entries(statuses).forEach(([status, count]) => {
                result.push({ staff, status, count });
            });
        });
        result.sort((a, b) => b.count - a.count);
        return result;
    }, [rows, staffStatusFilter]);

    const [staffPopup, setStaffPopup] = useState<{ staff: string; status: string } | null>(null);

    const getStaffFiltered = useCallback(
        (staff: string, status: string): ReportRow[] => {
            return rows.filter((r) => {
                const s = r.assignedStaff || r.processedBy || 'Unassigned';
                return s === staff && r.status === status;
            });
        },
        [rows]
    );

    const [agingPopup, setAgingPopup] = useState<{ status: string; bucketKey: string } | null>(null);

    const bucketLabels: Record<string, string> = {
        under3: 'Under 3 days',
        d3to7: '3\u20137 days',
        d8to14: '1\u20132 weeks',
        over14: 'Over 2 weeks',
    };

    const getAgingFiltered = useCallback(
        (status: string, bucketKey: string): ReportRow[] => {
            const now = Date.now();
            const matchesAge = (age: number): boolean => {
                if (Number.isNaN(age)) return bucketKey === 'over14';
                const ranges: Record<string, { min: number; max: number }> = {
                    under3: { min: 0, max: 3 },
                    d3to7: { min: 3, max: 7 },
                    d8to14: { min: 7, max: 14 },
                    over14: { min: 14, max: Infinity },
                };
                const r = ranges[bucketKey];
                return age >= r.min && age < r.max;
            };
            return rows.filter((r) => {
                if (r.status !== status) return false;
                const age = (now - new Date(r.submittedRaw).getTime()) / (1000 * 60 * 60 * 24);
                return matchesAge(age);
            });
        },
        [rows]
    );

    return (
        <div className="admin-reports-page" id="admin-reports-print-root">
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

            {error && (
                <div className="ar-error-banner">
                    ⚠ {error} — showing last available data.
                </div>
            )}

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

            <div className="ar-charts-row">
                <div className="admin-card ar-bar-card">
                    <div className="ar-bar-card-header">
                        <h2 className="admin-card-title">Requests by month</h2>
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

                <AdminDocumentDistribution
                    slices={distribution}
                    isRefreshing={loading}
                />
            </div>

            <div className="ar-charts-row" style={{ marginTop: '24px' }}>
                <div className="admin-card ar-bar-card">
                    <h2 className="admin-card-title" style={{ margin: 0 }}>
                        Aging Report
                        <span style={{ marginLeft: '10px', fontSize: '13px', fontWeight: 500, color: '#6b6f80' }}>
                            ({rows.length} requests)
                        </span>
                    </h2>
                    <p className="ar-chart-description" style={{ marginTop: 2, marginBottom: 16 }}>
                        How long each request has been in its current status
                    </p>
                    <div className="admin-table-container">
                        {loading ? (
                            <div style={{ padding: '32px', textAlign: 'center', color: '#9aa0af' }}>Loading…</div>
                        ) : agingRows.length === 0 ? (
                            <div style={{ padding: '32px', textAlign: 'center', color: '#9aa0af' }}>No data available.</div>
                        ) : (
                            <table className="admin-table" style={{ minWidth: 0 }}>
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left' }}>Status</th>
                                        <th>&lt; 3 days</th>
                                        <th>3–7 days</th>
                                        <th>1–2 wks</th>
                                        <th>&gt; 2 wks</th>
                                        <th>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {agingRows.map((r) => (
                                        <tr key={r.status}>
                                            <td style={{ textAlign: 'left', fontWeight: 600 }}>{r.status}</td>
                                            {(['under3', 'd3to7', 'd8to14', 'over14'] as const).map((bk) => (
                                                <td key={bk}>
                                                    {r[bk] > 0 ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => setAgingPopup({ status: r.status, bucketKey: bk })}
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                padding: 0,
                                                                font: 'inherit',
                                                                color: '#3D2E7C',
                                                                fontWeight: 700,
                                                                cursor: 'pointer',
                                                                textDecoration: 'underline',
                                                                textDecorationStyle: 'dotted',
                                                                textUnderlineOffset: 3,
                                                            }}
                                                        >
                                                            {r[bk]}
                                                        </button>
                                                    ) : (
                                                        r[bk]
                                                    )}
                                                </td>
                                            ))}
                                            <td style={{ fontWeight: 700 }}>{r.total}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                <div className="admin-card ar-bar-card">
                    <h2 className="admin-card-title" style={{ margin: 0 }}>
                        Approval Rate Trends
                    </h2>
                    <p className="ar-chart-description" style={{ marginTop: 2, marginBottom: 16 }}>
                        Monthly release rate compared to voided / cancelled rate
                    </p>
                    <div className="ar-chart-canvas" style={{ height: '220px' }}>
                        {loading ? (
                            <div className="ar-chart-loading">Loading…</div>
                        ) : (
                            <ResponsiveContainer>
                                <LineChart
                                    data={monthlyRates}
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
                                        domain={[0, 100]}
                                        tickFormatter={(v: number) => `${v}%`}
                                    />
                                    <Tooltip
                                        // FIX: Cast to any to bypass Recharts ValueType incompatibility
                                        formatter={(value: any, name: any) => [
                                            `${value}%`,
                                            name === 'releaseRate' ? 'Released' : 'Voided / Cancelled',
                                        ]}
                                        contentStyle={{
                                            borderRadius: 8,
                                            border: '1px solid #EDEEF3',
                                            boxShadow: '0 4px 12px rgba(41,35,122,0.12)',
                                            fontSize: 13,
                                        }}
                                    />
                                    <Legend
                                        formatter={(value: string) =>
                                            value === 'releaseRate' ? 'Released' : 'Voided / Cancelled'
                                        }
                                        wrapperStyle={{ fontSize: 12, fontWeight: 600 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="releaseRate"
                                        stroke="#1E9E5A"
                                        strokeWidth={2.5}
                                        dot={{ r: 4, fill: '#1E9E5A' }}
                                        activeDot={{ r: 6 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="voidRate"
                                        stroke="#DC2626"
                                        strokeWidth={2.5}
                                        dot={{ r: 4, fill: '#DC2626' }}
                                        activeDot={{ r: 6 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                    <p className="ar-chart-description" style={{ marginTop: 8 }}>
                        Monthly release rate vs void/cancel rate
                    </p>
                </div>
            </div>

            {!loading && (
                <div className="admin-card" style={{ padding: '22px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                        <div>
                            <h2 className="admin-card-title" style={{ margin: 0 }}>
                                Staff Pending Documents
                            </h2>
                            <p className="ar-chart-description" style={{ marginTop: 2, marginBottom: 16 }}>
                                Active staff with pending, processing, or payment-verified documents
                            </p>
                        </div>
                        <select
                            value={staffStatusFilter}
                            onChange={(e) => setStaffStatusFilter(e.target.value)}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                border: '1px solid #E2E4EC',
                                background: '#FFFFFF',
                                color: '#3D2E7C',
                                fontWeight: 600,
                                fontSize: '12px',
                                cursor: 'pointer',
                            }}
                        >
                            <option value="all">All Statuses</option>
                            {PENDING_STATUSES.map((s) => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                    <div className="admin-table-container" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                        {staffPendingRows.length === 0 ? (
                            <div style={{ padding: '32px', textAlign: 'center', color: '#9aa0af' }}>
                                No pending documents.
                            </div>
                        ) : (
                            <table className="admin-table" style={{ minWidth: 0 }}>
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left' }}>Staff</th>
                                        <th>Status</th>
                                        <th>Document Count</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {staffPendingRows.map((r, i) => (
                                        <tr key={`${r.staff}-${r.status}-${i}`}>
                                            <td style={{ textAlign: 'left', fontWeight: 600 }}>{r.staff}</td>
                                            <td>
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                    padding: '4px 12px', borderRadius: '999px',
                                                    fontSize: '12px', fontWeight: 600, border: '1px solid transparent',
                                                    background: r.status === 'Pending' ? '#FFF6E5' :
                                                        r.status === 'Processing' ? '#E8F0FE' : '#E7F8EE',
                                                    color: r.status === 'Pending' ? '#D89A1D' :
                                                        r.status === 'Processing' ? '#3267d6' : '#2e7d32',
                                                }}>
                                                    <span style={{
                                                        width: 6, height: 6, borderRadius: '50%',
                                                        background: 'currentColor', flexShrink: 0,
                                                    }} />
                                                    {r.status}
                                                </span>
                                            </td>
                                            <td>
                                                {r.count > 0 ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setStaffPopup({ staff: r.staff, status: r.status })}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            padding: 0,
                                                            font: 'inherit',
                                                            color: '#3D2E7C',
                                                            fontWeight: 700,
                                                            cursor: 'pointer',
                                                            textDecoration: 'underline',
                                                            textDecorationStyle: 'dotted',
                                                            textUnderlineOffset: 3,
                                                        }}
                                                    >
                                                        {r.count}
                                                    </button>
                                                ) : r.count}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {staffPopup && createPortal(
                <div
                    onClick={() => setStaffPopup(null)}
                    style={{
                        position: 'fixed', inset: 0,
                        background: 'rgba(15, 23, 42, 0.55)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '20px', zIndex: 1100,
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: 'min(700px, 100%)', maxHeight: '80vh',
                            display: 'flex', flexDirection: 'column',
                            background: '#FFFFFF', borderRadius: '14px',
                            boxShadow: '0 20px 55px rgba(15, 23, 42, 0.2)',
                            padding: '24px',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
                            <div>
                                <h3 style={{ margin: '0 0 4px', color: '#1F2333' }}>{staffPopup.staff}</h3>
                                <p style={{ margin: 0, color: '#6B6F80', fontSize: '0.95rem' }}>
                                    {staffPopup.status} &mdash; {getStaffFiltered(staffPopup.staff, staffPopup.status).length} document(s)
                                </p>
                            </div>
                            <button onClick={() => setStaffPopup(null)} style={{ border: 'none', background: 'transparent', fontSize: '1.4rem', color: '#6B6F80', cursor: 'pointer', lineHeight: 1 }}>&times;</button>
                        </div>
                        <div style={{ overflowY: 'auto', flex: 1 }}>
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Reference No.</th>
                                        <th>Client</th>
                                        <th>Document Type</th>
                                        <th>Date</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {getStaffFiltered(staffPopup.staff, staffPopup.status).map((row) => (
                                        <tr key={row.id}>
                                            <td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#5d6178' }}>{row.referenceNo}</td>
                                            <td><strong>{row.clientName}</strong></td>
                                            <td>{row.documentType}</td>
                                            <td>{row.requestedDate}</td>
                                            <td>{row.status}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {agingPopup && createPortal(
                <div
                    onClick={() => setAgingPopup(null)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(15, 23, 42, 0.55)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px',
                        zIndex: 1100,
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: 'min(700px, 100%)',
                            maxHeight: '80vh',
                            display: 'flex',
                            flexDirection: 'column',
                            background: '#FFFFFF',
                            borderRadius: '14px',
                            boxShadow: '0 20px 55px rgba(15, 23, 42, 0.2)',
                            padding: '24px',
                        }}
                    >
                        <div style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            gap: '12px',
                            marginBottom: '16px',
                        }}>
                            <div>
                                <h3 style={{ margin: '0 0 4px', color: '#1F2333' }}>
                                    {agingPopup.status}
                                </h3>
                                <p style={{ margin: 0, color: '#6B6F80', fontSize: '0.95rem' }}>
                                    {bucketLabels[agingPopup.bucketKey]} &mdash; {getAgingFiltered(agingPopup.status, agingPopup.bucketKey).length} request(s)
                                </p>
                            </div>
                            <button
                                onClick={() => setAgingPopup(null)}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    fontSize: '1.4rem',
                                    color: '#6B6F80',
                                    cursor: 'pointer',
                                    lineHeight: 1,
                                }}
                            >
                                &times;
                            </button>
                        </div>

                        <div style={{ overflowY: 'auto', flex: 1 }}>
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Reference No.</th>
                                        <th>Client</th>
                                        <th>Document Type</th>
                                        <th>Date</th>
                                        <th>Processed By</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {getAgingFiltered(agingPopup.status, agingPopup.bucketKey).map((row) => (
                                        <tr key={row.id}>
                                            <td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#5d6178' }}>
                                                {row.referenceNo}
                                            </td>
                                            <td><strong>{row.clientName}</strong></td>
                                            <td>{row.documentType}</td>
                                            <td>{row.requestedDate}</td>
                                            <td>{row.processedBy}</td>
                                            <td>{row.status}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}