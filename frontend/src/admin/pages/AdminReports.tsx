import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
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
    Legend,
} from 'recharts';
import { FileStack, FileCheck2, XCircle, FileText, Copy, Edit3, Ban, Clock, Printer } from 'lucide-react';
import '../styles/AdminReports.css';
import type { User } from '../../auth-folder/types/auth';
import { CalendarIcon, ChevronDownIcon } from '../../users/components/icons';
import { CalendarPicker } from '../components/Calendarpicker';
import { FloatingPopover } from '../../shared/components/FloatingPopover';
import { AdminDocumentDistribution } from '../components/AdminDocumentDistribution';

const PERIOD_OPTIONS = [
    'Today',
    'Yesterday',
    'This Week',
    'Last Week',
    'This Month',
    'Last Month',
    'This Quarter',
    'Last Quarter',
    'This Year',
    'Custom Range...',
];

function toLocalISO(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function parseLocalDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return new Date(y, m, d);
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
}

function rangeForPeriod(period: string): { from: string; to: string } {
    const now = new Date();
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

    switch (period) {
        case 'Today': {
            const d = startOfDay(now);
            return { from: toLocalISO(d), to: toLocalISO(d) };
        }
        case 'Yesterday': {
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            return { from: toLocalISO(d), to: toLocalISO(d) };
        }
        case 'This Week': {
            const start = startOfDay(now);
            const dow = (start.getDay() + 6) % 7;
            const from = new Date(start.getFullYear(), start.getMonth(), start.getDate() - dow);
            const to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 6);
            return { from: toLocalISO(from), to: toLocalISO(to) };
        }
        case 'Last Week': {
            const start = startOfDay(now);
            const dow = (start.getDay() + 6) % 7;
            const mondayThisWeek = new Date(start.getFullYear(), start.getMonth(), start.getDate() - dow);
            const from = new Date(mondayThisWeek.getFullYear(), mondayThisWeek.getMonth(), mondayThisWeek.getDate() - 7);
            const to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 6);
            return { from: toLocalISO(from), to: toLocalISO(to) };
        }
        case 'This Month': {
            const from = new Date(now.getFullYear(), now.getMonth(), 1);
            const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            return { from: toLocalISO(from), to: toLocalISO(to) };
        }
        case 'Last Month': {
            const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const to = new Date(now.getFullYear(), now.getMonth(), 0);
            return { from: toLocalISO(from), to: toLocalISO(to) };
        }
        case 'This Quarter': {
            const quarter = Math.floor(now.getMonth() / 3);
            const from = new Date(now.getFullYear(), quarter * 3, 1);
            const to = new Date(now.getFullYear(), quarter * 3 + 3, 0);
            return { from: toLocalISO(from), to: toLocalISO(to) };
        }
        case 'Last Quarter': {
            const quarter = Math.floor(now.getMonth() / 3) - 1;
            const from = new Date(now.getFullYear(), quarter * 3, 1);
            const to = new Date(now.getFullYear(), quarter * 3 + 3, 0);
            return { from: toLocalISO(from), to: toLocalISO(to) };
        }
        case 'This Year': {
            const from = new Date(now.getFullYear(), 0, 1);
            const to = new Date(now.getFullYear(), 11, 31);
            return { from: toLocalISO(from), to: toLocalISO(to) };
        }
        default:
            return { from: toLocalISO(startOfDay(now)), to: toLocalISO(startOfDay(now)) };
    }
}

function reportFormatShort(date: Date) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isSameDate(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const PENDING_STATUSES = ['Pending', 'Processing', 'Payment Verified'];
const STAFF_DOC_STATUSES = ['Pending', 'Processing', 'Payment Verified', 'Released'];

interface MonthlyRequest {
    month: string;
    taxDeclaration: number;
    landholding: number;
    noLandholding: number;
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
    requestType?: string;
    amendedFromId?: string | null;
    actionTaken?: string | null;
    statusAt?: string | null;
    createdAt?: string | null;
    amountDue?: number;
    amountPaid?: number;
    paymentDate?: string | null;
    voidReason?: string;
    faultType?: string;
    releasedBy?: string | null;
}

interface DistributionSlice {
    label: string;
    count: number;
    color: string;
}

const DOC_TYPE_COLORS = {
    taxDeclaration: '#252175',
    landholding: '#00BCD4',
    noLandholding: '#4CAF50',
} as const;

const DOC_TYPE_SERIES = [
    { key: 'taxDeclaration', label: 'Tax Declaration', color: DOC_TYPE_COLORS.taxDeclaration },
    { key: 'landholding', label: 'Certificate of Landholding', color: DOC_TYPE_COLORS.landholding },
    { key: 'noLandholding', label: 'Certificate of No Landholding', color: DOC_TYPE_COLORS.noLandholding },
] as const;

// A request can carry several document types (the backend joins them with
// ", "). Each recognized type counts toward its own series segment.
function countDocumentTypes(documentType: string): { taxDeclaration: number; landholding: number; noLandholding: number } {
    const counts = { taxDeclaration: 0, landholding: 0, noLandholding: 0 };
    for (const part of documentType.split(',')) {
        const t = part.trim();
        if (/no[- ]landhold/i.test(t)) counts.noLandholding += 1;
        else if (/landhold/i.test(t)) counts.landholding += 1;
        else if (/tax declaration/i.test(t)) counts.taxDeclaration += 1;
    }
    return counts;
}

function buildMonthlyBuckets(rows: ReportRow[]): MonthlyRequest[] {
    const now = new Date();
    const buckets: { key: string; label: string; taxDeclaration: number; landholding: number; noLandholding: number }[] = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        buckets.push({
            key: `${d.getFullYear()}-${d.getMonth()}`,
            label: d.toLocaleDateString('en-US', { month: 'short' }),
            taxDeclaration: 0,
            landholding: 0,
            noLandholding: 0,
        });
    }
    const bucketByKey = new Map(buckets.map((b) => [b.key, b]));

    rows.forEach((row) => {
        const d = new Date(row.submittedRaw);
        if (Number.isNaN(d.getTime())) return;
        const bucket = bucketByKey.get(`${d.getFullYear()}-${d.getMonth()}`);
        if (!bucket) return;
        const counts = countDocumentTypes(row.documentType || '');
        bucket.taxDeclaration += counts.taxDeclaration;
        bucket.landholding += counts.landholding;
        bucket.noLandholding += counts.noLandholding;
    });

    return buckets.map((b) => ({
        month: b.label,
        taxDeclaration: b.taxDeclaration,
        landholding: b.landholding,
        noLandholding: b.noLandholding,
    }));
}

function AdminBarTooltip({ active, payload }: any) {
    if (!active || !payload || !payload.length) return null;
    const entry = payload[0].payload as MonthlyRequest;
    const items = DOC_TYPE_SERIES.filter((s) => entry[s.key] > 0);
    return (
        <div className="ar-chart-tooltip">
            <div className="ar-chart-tooltip-label">{entry.month}</div>
            {items.map((s) => (
                <div key={s.key} style={{ color: s.color }}>
                    {entry[s.key].toLocaleString()} {s.label}
                </div>
            ))}
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
    const [error, setError] = useState<string | null>(null);
    const [dateFilterLabel, setDateFilterLabel] = useState('All Time');
    const [dateRange, setDateRange] = useState<{ from: string; to: string } | null>(null);
    const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
    const [dateView, setDateView] = useState<'list' | 'calendar'>('list');
    const dateDropdownRef = useRef<HTMLDivElement>(null);

    function handleSelectPeriod(period: string) {
        if (period === 'Custom Range...') {
            setDateView('calendar');
            return;
        }
        setDateFilterLabel(period);
        const newRange = rangeForPeriod(period);
        setDateRange(newRange);
        setDateDropdownOpen(false);
        setDateView('list');
        void loadReportData(false, newRange);
    }

    function handleApplyRange(start: Date, end: Date) {
        const label = isSameDate(start, end)
            ? reportFormatShort(start)
            : `${reportFormatShort(start)} \u2013 ${reportFormatShort(end)}`;
        setDateFilterLabel(label);
        const newRange = { from: toLocalISO(start), to: toLocalISO(end) };
        setDateRange(newRange);
        setDateDropdownOpen(false);
        setDateView('list');
        void loadReportData(false, newRange);
    }

    function handleClearDateFilter() {
        setDateFilterLabel('All Time');
        setDateRange(null);
        setDateDropdownOpen(false);
        setDateView('list');
        void loadReportData(false, null);
    }

    // ── Print / CSV export ──
    function handlePrintReport() {
        window.print();
    }

    async function handleExportCsv() {
        const XLSX = await import('xlsx');
        const headers = [
            'Reference No.', 'Declarant', 'Document Type', 'Request Type', 'Date', 'Status',
            'Assigned Staff', 'Processed By', 'Released By', 'OR Number',
            'Amount Due (PHP)', 'Amount Paid (PHP)', 'Payment Date', 'Void/Cancel Reason', 'Fault Type',
        ];
        const toRow = (r: ReportRow): (string | number)[] => [
            r.referenceNo,
            r.clientName,
            r.documentType,
            r.requestType ?? 'ORIGINAL',
            r.requestedDate,
            r.status,
            r.assignedStaff || r.processedBy || 'Unassigned',
            r.processedBy,
            r.releasedBy ?? '',
            r.orNumber,
            r.amountDue ?? 0,
            r.amountPaid ?? 0,
            r.paymentDate ?? '',
            r.voidReason ?? '',
            r.faultType ?? '',
        ];

        const from = dateRange?.from ?? null;
        const to = dateRange?.to ?? null;
        const singleDay = !!from && !!to && from === to;

        const wb = XLSX.utils.book_new();

        const buildSheet = (name: string, sheetRows: ReportRow[]): void => {
            const totalDue = sheetRows.reduce((s, r) => s + (r.amountDue ?? 0), 0);
            const totalPaid = sheetRows.reduce((s, r) => s + (r.amountPaid ?? 0), 0);
            const aoa: (string | number)[][] = [
                ['ADePT System - Reports & Analytics'],
                [`Period: ${dateFilterLabel}`, `Exported: ${new Date().toLocaleString()}`],
                [`Subset: ${name}`, `Requests: ${sheetRows.length}`],
                [],
                headers,
                ...sheetRows.map((r) => toRow(r)),
                [],
                ['Summary'],
                ['Total Requests in Sheet', sheetRows.length],
                ['Total Amount Due (PHP)', totalDue],
                ['Total Amount Collected (PHP)', totalPaid],
            ];
            const ws = XLSX.utils.aoa_to_sheet(aoa);
            ws['!cols'] = headers.map((h) => ({
                wch: h.length <= 8 ? 14 : Math.min(Math.max(h.length + 2, 14), 30),
            }));
            XLSX.utils.book_append_sheet(wb, ws, name);
        };

        if (singleDay) {
            buildSheet('Report', filteredRows);
        } else {
            const byMonth = new Map<string, { key: string; rows: ReportRow[] }>();
            filteredRows.forEach((r) => {
                const d = parseLocalDate(r.submittedRaw);
                const key = d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : 'Unknown';
                if (!byMonth.has(key)) {
                    byMonth.set(key, {
                        key,
                        rows: [],
                    });
                }
                byMonth.get(key)!.rows.push(r);
            });
            Array.from(byMonth.values())
                .sort((a, b) => a.key.localeCompare(b.key))
                .forEach((g) => {
                    const [y, m] = g.key.split('-').map(Number);
                    const label = isNaN(y) || isNaN(m)
                        ? g.key
                        : `${new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short' })} ${y}`;
                    buildSheet(label, g.rows);
                });
        }

        const grouped: Record<string, Record<string, number>> = {};
        filteredRows.forEach((r) => {
            const staff = r.assignedStaff || r.processedBy || 'Unassigned';
            if (!grouped[staff]) grouped[staff] = {};
            grouped[staff][r.status] = (grouped[staff][r.status] || 0) + 1;
        });
        const workloadAoa: (string | number)[][] = [
            ['Staff Workload', 'Status', 'Document Count'],
            ...Object.entries(grouped).flatMap(([staff, statuses]) =>
                Object.entries(statuses).map(([status, count]) => [staff, status, count])
            ),
        ];
        const wsWorkload = XLSX.utils.aoa_to_sheet(workloadAoa);
        wsWorkload['!cols'] = [
            { wch: 24 },
            { wch: 18 },
            { wch: 15 },
        ];
        XLSX.utils.book_append_sheet(wb, wsWorkload, 'Staff Workload');

        const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([out], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safe = (s: string) => s.replace(/[^\w-]+/g, '').toLowerCase();
        a.download = singleDay
            ? `report-${from}.xlsx`
            : from && to
                ? `report-${safe(from)}_to_${safe(to)}.xlsx`
                : 'report-all-time.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Admin';
    const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}` || 'A';
    const roleLabel =
        user.role === 'SUPER_ADMIN' ? 'Super Admin' :
            user.role === 'ADMIN' ? 'Admin' :
                'Office Staff';

    const loadReportData = useCallback(async (isRefresh = false, rangeOverride?: { from: string; to: string } | null) => {
        if (!isRefresh) setLoading(true);
        setError(null);
        try {
            const activeRange = rangeOverride !== undefined ? rangeOverride : dateRange;
            const [data, metrics] = await Promise.all([
                fetchReportsAnalytics(),
                fetchDashboardMetrics(activeRange?.from, activeRange?.to).catch(() => null),
            ]);

            if (data.totalDocuments !== undefined) {
                setTotalDocuments(data.totalDocuments);
            }

            if (data.rows) {
                setRows(data.rows.map((r: any) => ({
                    id: r.id,
                    referenceNo: r.referenceNo || 'N/A',
                    clientName: r.clientName || 'Anonymous Declarant',
                    documentType: r.documentType || 'N/A',
                    requestedDate: r.requestedDate || '',
                    processedBy: r.processedBy || 'Office Staff',
                    assignedStaff: r.assignedStaff || r.processedBy || 'Unassigned',
                    status: r.status || 'Pending',
                    orNumber: r.orNumber || 'N/A',
                    submittedRaw: r.requestedDate || '',
                    requestType: r.requestType ?? r.request_type ?? 'ORIGINAL',
                    amendedFromId: r.amendedFromId ?? r.amended_from_id ?? null,
                    actionTaken: r.actionTaken ?? r.action_taken ?? 'PENDING',
                    statusAt: r.statusAt ?? null,
                    createdAt: r.createdAt ?? null,
                    amountDue: r.amountDue ?? 0,
                    amountPaid: r.amountPaid ?? 0,
                    paymentDate: r.paymentDate ?? null,
                    voidReason: r.voidReason ?? '',
                    faultType: r.faultType ?? '',
                    releasedBy: r.releasedBy ?? null,
                })));
            }

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
        }
    }, [dateRange]);

    useEffect(() => {
        void loadReportData();
    }, [loadReportData]);

    const filteredRows = useMemo(() => {
        if (!dateRange) return rows;
        const from = new Date(`${dateRange.from}T00:00:00`);
        const to = new Date(`${dateRange.to}T23:59:59.999`);
        return rows.filter((r) => {
            const d = new Date(r.submittedRaw);
            if (Number.isNaN(d.getTime())) return false;
            return d >= from && d <= to;
        });
    }, [rows, dateRange]);

    const totalApproved = filteredRows.filter((r) => r.status === 'Released' || r.status === 'approved').length;
    const totalVoided = filteredRows.filter((r) => r.status === 'Void' || r.status === 'disapproved').length;
    const totalCancelled = filteredRows.filter((r) => r.status === 'Cancelled').length;
    const totalPending = filteredRows.filter((r) => PENDING_STATUSES.includes(r.status)).length;
    const totalRequestAccounts = dateRange ? filteredRows.length : (totalDocuments || filteredRows.length);

    const originalCount = filteredRows.filter((r) => r.requestType === 'ORIGINAL').length;
    const reprintCount = filteredRows.filter((r) => r.requestType === 'REPRINT').length;
    const amendedCount = filteredRows.filter((r) => !!r.amendedFromId).length;

    const monthlyRequests = useMemo(() => buildMonthlyBuckets(filteredRows), [filteredRows]);

    // ── Previous-period window (for % change deltas) ──
    const previousRows = useMemo(() => {
        if (!dateRange) return [];
        const from = parseLocalDate(dateRange.from);
        const to = parseLocalDate(dateRange.to);
        if (!from || !to) return [];
        const lengthMs = to.getTime() - from.getTime() + 24 * 60 * 60 * 1000;
        const prevFrom = new Date(from.getTime() - lengthMs);
        const prevTo = new Date(from.getTime() - 1);
        return rows.filter((r) => {
            const d = parseLocalDate(r.submittedRaw);
            if (!d) return false;
            return d >= prevFrom && d <= prevTo;
        });
    }, [rows, dateRange]);

    const countOf = (list: ReportRow[], predicate: (r: ReportRow) => boolean) =>
        list.filter(predicate).length;

    const pctDelta = (current: number, previous: number): number | null => {
        if (previous === 0) return null;
        return Math.round(((current - previous) / previous) * 100);
    };

    const deltas = useMemo(() => {
        const prev = {
            total: previousRows.length,
            released: countOf(previousRows, (r) => r.status === 'Released' || r.status === 'approved'),
            voided: countOf(previousRows, (r) => r.status === 'Void' || r.status === 'disapproved'),
            cancelled: countOf(previousRows, (r) => r.status === 'Cancelled'),
            pending: countOf(previousRows, (r) => PENDING_STATUSES.includes(r.status)),
            collected: previousRows.reduce((sum, r) => sum + (r.amountPaid || 0), 0),
        };
        return {
            total: pctDelta(filteredRows.length, prev.total),
            released: pctDelta(totalApproved, prev.released),
            voided: pctDelta(totalVoided, prev.voided),
            cancelled: pctDelta(totalCancelled, prev.cancelled),
            pending: pctDelta(totalPending, prev.pending),
            collected: pctDelta(
                filteredRows.reduce((sum, r) => sum + (r.amountPaid || 0), 0),
                prev.collected
            ),
        };
    }, [previousRows, filteredRows, totalApproved, totalVoided, totalCancelled, totalPending]);

    // ── Revenue (period-scoped) ──
    const revenueStats = useMemo(() => {
        const totalFees = filteredRows.reduce((sum, r) => sum + (r.amountDue || 0), 0);
        const totalCollected = filteredRows.reduce((sum, r) => sum + (r.amountPaid || 0), 0);
        return { totalFees, totalCollected, totalOutstanding: totalFees - totalCollected };
    }, [filteredRows]);

    const monthlyRevenue = useMemo(() => {
        const now = new Date();
        const buckets: { key: string; month: string; revenue: number }[] = [];
        for (let m = 11; m >= 0; m--) {
            const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
            buckets.push({
                key: `${d.getFullYear()}-${d.getMonth()}`,
                month: d.toLocaleDateString('en-US', { month: 'short' }),
                revenue: 0,
            });
        }
        const byKey = new Map(buckets.map((b) => [b.key, b]));
        filteredRows.forEach((r) => {
            if (!r.paymentDate) return;
            const d = new Date(r.paymentDate);
            if (Number.isNaN(d.getTime())) return;
            const b = byKey.get(`${d.getFullYear()}-${d.getMonth()}`);
            if (b) b.revenue += r.amountPaid || 0;
        });
        return buckets;
    }, [filteredRows]);

    // ── Void / cancelled reason breakdown (period-scoped) ──
    const voidReasonBreakdown = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredRows.forEach((r) => {
            if (r.status !== 'Void' && r.status !== 'Cancelled' && r.status !== 'disapproved') return;
            const reason = (r.voidReason || '').trim();
            const key = reason
                ? (reason.length > 48 ? `${reason.slice(0, 48)}\u2026` : reason)
                : (r.status === 'Cancelled' ? 'Cancelled from pending payment' : 'No reason provided');
            counts[key] = (counts[key] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([reason, count]) => ({ reason, count }))
            .sort((a, b) => b.count - a.count);
    }, [filteredRows]);

    // ── Peak activity buckets (period-scoped, from createdAt) ──
    const hourlyActivity = useMemo(() => {
        const buckets = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));
        filteredRows.forEach((r) => {
            const d = new Date(r.createdAt || r.submittedRaw);
            if (Number.isNaN(d.getTime())) return;
            buckets[d.getHours()].count += 1;
        });
        return buckets;
    }, [filteredRows]);

    const byDayActivity = useMemo(() => {
        const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const buckets = labels.map((label) => ({ day: label, count: 0 }));
        filteredRows.forEach((r) => {
            const d = new Date(r.createdAt || r.submittedRaw);
            if (Number.isNaN(d.getTime())) return;
            buckets[d.getDay()].count += 1;
        });
        return buckets;
    }, [filteredRows]);

    // ── Staff performance (period-scoped) ──
    const staffPerformance = useMemo(() => {
        const grouped: Record<string, { released: number; reprints: number; voided: number; turnaroundMs: number; releaseCount: number }> = {};
        filteredRows.forEach((r) => {
            const staff = r.processedBy || 'Office Staff';
            if (!grouped[staff]) {
                grouped[staff] = { released: 0, reprints: 0, voided: 0, turnaroundMs: 0, releaseCount: 0 };
            }
            const s = grouped[staff];
            if (r.status === 'Released' || r.status === 'approved') {
                s.released += 1;
                const start = new Date(r.createdAt || r.submittedRaw).getTime();
                const end = new Date(r.statusAt || '').getTime();
                if (!Number.isNaN(start) && !Number.isNaN(end)) {
                    s.turnaroundMs += end - start;
                    s.releaseCount += 1;
                }
            }
            if (r.requestType === 'REPRINT') s.reprints += 1;
            if (r.status === 'Void' || r.status === 'Cancelled' || r.status === 'disapproved') s.voided += 1;
        });
        return Object.entries(grouped)
            .map(([staff, s]) => ({
                staff,
                released: s.released,
                reprints: s.reprints,
                voided: s.voided,
                avgTurnaroundDays: s.releaseCount > 0
                    ? Math.round((s.turnaroundMs / s.releaseCount) / (1000 * 60 * 60 * 24) * 10) / 10
                    : null,
            }))
            .filter((s) => s.released || s.reprints || s.voided)
            .sort((a, b) => b.released - a.released);
    }, [filteredRows]);

    const renderDelta = (delta: number | null, invert = false) => {
        if (delta === null) return null;
        const up = delta > 0;
        const good = invert ? !up : up;
        return (
            <span className={`ar-stat-delta ${good ? 'good' : 'bad'}`}>
                {up ? '\u25B2' : '\u25BC'} {Math.abs(delta)}%
            </span>
        );
    };

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

        filteredRows.forEach((r) => {
            const ageDays = (now - new Date(r.statusAt || r.submittedRaw).getTime()) / (1000 * 60 * 60 * 24);
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
    }, [filteredRows]);

    const [trendYear, setTrendYear] = useState<number>(() => new Date().getFullYear());
    const [nowYear, setNowYear] = useState<number>(() => new Date().getFullYear());
    const userPickedYearRef = useRef(false);

    // Poll for the real-world year changing (e.g. a tab left open across
    // New Year's) so the dropdown and default selection stay current
    // without requiring a page refresh.
    useEffect(() => {
        const interval = setInterval(() => {
            const currentYear = new Date().getFullYear();
            setNowYear((prev) => (prev !== currentYear ? currentYear : prev));
            if (!userPickedYearRef.current) {
                setTrendYear((prev) => (prev !== currentYear ? currentYear : prev));
            }
        }, 60 * 1000); // check once a minute; cheap and plenty responsive for a year rollover
        return () => clearInterval(interval);
    }, []);

    function handleTrendYearChange(yr: number) {
        userPickedYearRef.current = yr !== nowYear;
        setTrendYear(yr);
    }

    const availableYears = useMemo(() => {
        const setY = new Set<number>();
        setY.add(nowYear);
        rows.forEach((r) => {
            const d = parseLocalDate(r.submittedRaw);
            if (d) {
                setY.add(d.getFullYear());
            }
        });
        return Array.from(setY).sort((a, b) => b - a);
    }, [rows, nowYear]);

    interface MonthlyRate {
        month: string;
        released: number;
        voided: number;
        total: number;
        releaseRate: number;
        voidRate: number;
    }

    const monthlyRates = useMemo<MonthlyRate[]>(() => {
        const buckets: { key: string; month: string; total: number; released: number; voided: number }[] = [];
        for (let m = 0; m < 12; m++) {
            const d = new Date(trendYear, m, 1);
            buckets.push({
                key: `${trendYear}-${m}`,
                month: d.toLocaleDateString('en-US', { month: 'short' }),
                total: 0,
                released: 0,
                voided: 0,
            });
        }
        const byKey = new Map(buckets.map((b) => [b.key, b]));

        rows.forEach((r) => {
            const d = parseLocalDate(r.submittedRaw);
            if (!d) return;
            if (d.getFullYear() !== trendYear) return;
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
    }, [rows, trendYear]);

    const [staffStatusFilter, setStaffStatusFilter] = useState<string>('all');
    interface StaffPendingRow {
        staff: string;
        status: string;
        count: number;
    }
    const staffPendingRows = useMemo<StaffPendingRow[]>(() => {
        const grouped: Record<string, Record<string, number>> = {};
        filteredRows.forEach((r) => {
            if (!STAFF_DOC_STATUSES.includes(r.status)) return;
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
    }, [filteredRows, staffStatusFilter]);

    const [staffPopup, setStaffPopup] = useState<{ staff: string; status: string } | null>(null);

    const getStaffFiltered = useCallback(
        (staff: string, status: string): ReportRow[] => {
            return filteredRows.filter((r) => {
                const s = r.assignedStaff || r.processedBy || 'Unassigned';
                return s === staff && r.status === status;
            });
        },
        [filteredRows]
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
            return filteredRows.filter((r) => {
                if (r.status !== status) return false;
                const age = (now - new Date(r.statusAt || r.submittedRaw).getTime()) / (1000 * 60 * 60 * 24);
                return matchesAge(age);
            });
        },
        [filteredRows]
    );

    return (
        <div className="admin-reports-page" id="admin-reports-print-root">
            <div className="rq-page-header no-print">
                <div className="rq-page-header-row">
                    <div>
                        <h1 className="rq-page-title">Reports &amp; Analytics</h1>
                        <p className="rq-page-subtitle">Trends across staff performance and document processing.</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
                        <div className="ar-header-actions">
                            <button type="button" className="ar-export-btn" onClick={handleExportCsv}>
                                <FileText size={15} /> Export Excel
                            </button>
                            <button type="button" className="ar-export-btn" onClick={handlePrintReport}>
                                <Printer size={15} /> Print
                            </button>
                        </div>

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

                        <div className="date-selector-wrapper" ref={dateDropdownRef}>
                            <button
                                className="date-selector-btn"
                                onClick={() => setDateDropdownOpen((prev) => !prev)}
                                type="button"
                                title="Filter reports by date range"
                            >
                                <CalendarIcon size={16} />
                                <span>Report Period: <strong>{dateFilterLabel}</strong></span>
                                <ChevronDownIcon size={14} />
                            </button>

                    <FloatingPopover
                        open={dateDropdownOpen}
                        triggerRef={dateDropdownRef}
                        onClose={() => {
                            setDateDropdownOpen(false);
                            setDateView('list');
                        }}
                        className={`period-dropdown${dateView === 'calendar' ? ' period-dropdown-calendar' : ''}`}
                    >
                        {dateView === 'list' && (
                            <>
                                {PERIOD_OPTIONS.map((period) => (
                                    <button
                                        key={period}
                                        type="button"
                                        className={`date-selector-option ${period === dateFilterLabel ? 'active' : ''}`}
                                        onClick={() => handleSelectPeriod(period)}
                                    >
                                        {period}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    className="date-selector-option"
                                    onClick={handleClearDateFilter}
                                >
                                    All Time
                                </button>
                            </>
                        )}

                        {dateView === 'calendar' && (
                            <CalendarPicker onApply={handleApplyRange} onCancel={() => setDateView('list')} />
                        )}
                    </FloatingPopover>
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
                <div className="ar-stat-card">
                    <div className="ar-stat-card-top">
                        <span className="ar-stat-label">Total Requests</span>
                        <div className="ar-stat-icon ar-stat-icon--primary">
                            <FileStack size={18} />
                        </div>
                    </div>
                    <div className="ar-stat-value-row">
                        <span className="ar-stat-value">
                            {loading ? '—' : totalRequestAccounts.toLocaleString()}
                        </span>
                    </div>
                    <div className="ar-stat-delta-row">{renderDelta(deltas.total)}</div>
                </div>

                <div className="ar-stat-card">
                    <div className="ar-stat-card-top">
                        <span className="ar-stat-label">Total Released</span>
                        <div className="ar-stat-icon ar-stat-icon--success">
                            <FileCheck2 size={18} />
                        </div>
                    </div>
                    <div className="ar-stat-value-row">
                        <span className="ar-stat-value">
                            {loading ? '—' : totalApproved.toLocaleString()}
                        </span>
                    </div>
                    <div className="ar-stat-delta-row">{renderDelta(deltas.released)}</div>
                </div>

                <div className="ar-stat-card">
                    <div className="ar-stat-card-top">
                        <span className="ar-stat-label">Total Void</span>
                        <div className="ar-stat-icon ar-stat-icon--error">
                            <XCircle size={18} />
                        </div>
                    </div>
                    <div className="ar-stat-value-row">
                        <span className="ar-stat-value">
                            {loading ? '—' : totalVoided.toLocaleString()}
                        </span>
                    </div>
                    <div className="ar-stat-delta-row">{renderDelta(deltas.voided, true)}</div>
                </div>

                <div className="ar-stat-card">
                    <div className="ar-stat-card-top">
                        <span className="ar-stat-label">Total Cancelled</span>
                        <div className="ar-stat-icon ar-stat-icon--muted">
                            <Ban size={18} />
                        </div>
                    </div>
                    <div className="ar-stat-value-row">
                        <span className="ar-stat-value">
                            {loading ? '—' : totalCancelled.toLocaleString()}
                        </span>
                    </div>
                    <div className="ar-stat-delta-row">{renderDelta(deltas.cancelled, true)}</div>
                </div>

                <div className="ar-stat-card">
                    <div className="ar-stat-card-top">
                        <span className="ar-stat-label">Total Pending</span>
                        <div className="ar-stat-icon ar-stat-icon--amber">
                            <Clock size={18} />
                        </div>
                    </div>
                    <div className="ar-stat-value-row">
                        <span className="ar-stat-value">
                            {loading ? '—' : totalPending.toLocaleString()}
                        </span>
                    </div>
                    <div className="ar-stat-delta-row">{renderDelta(deltas.pending, true)}</div>
                </div>
            </div>

            <div className="ar-stats-row">
                <div className="ar-stat-card">
                    <div className="ar-stat-card-top">
                        <span className="ar-stat-label">Original</span>
                        <div className="ar-stat-icon ar-stat-icon--primary">
                            <FileText size={18} />
                        </div>
                    </div>
                    <div className="ar-stat-value-row">
                        <span className="ar-stat-value ar-stat-value--indigo">
                            {loading ? '—' : originalCount.toLocaleString()}
                        </span>
                    </div>
                </div>

                <div className="ar-stat-card">
                    <div className="ar-stat-card-top">
                        <span className="ar-stat-label">Reprint</span>
                        <div className="ar-stat-icon ar-stat-icon--gold">
                            <Copy size={18} />
                        </div>
                    </div>
                    <div className="ar-stat-value-row">
                        <span className="ar-stat-value ar-stat-value--gold">
                            {loading ? '—' : reprintCount.toLocaleString()}
                        </span>
                    </div>
                </div>

                <div className="ar-stat-card">
                    <div className="ar-stat-card-top">
                        <span className="ar-stat-label">Amended</span>
                        <div className="ar-stat-icon ar-stat-icon--purple">
                            <Edit3 size={18} />
                        </div>
                    </div>
                    <div className="ar-stat-value-row">
                        <span className="ar-stat-value ar-stat-value--purple">
                            {loading ? '—' : amendedCount.toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>

            <div className="ar-stats-row">
                <div className="ar-stat-card ar-stat-card--revenue">
                    <div className="ar-stat-card-top">
                        <span className="ar-stat-label">Total Fees</span>
                        <div className="ar-stat-icon ar-stat-icon--primary">
                            <FileStack size={18} />
                        </div>
                    </div>
                    <div className="ar-stat-value-row">
                        <span className="ar-stat-value">
                            {loading ? '—' : `\u20B1${revenueStats.totalFees.toLocaleString()}`}
                        </span>
                    </div>
                </div>

                <div className="ar-stat-card ar-stat-card--revenue">
                    <div className="ar-stat-card-top">
                        <span className="ar-stat-label">Collected</span>
                        <div className="ar-stat-icon ar-stat-icon--success">
                            <FileCheck2 size={18} />
                        </div>
                    </div>
                    <div className="ar-stat-value-row">
                        <span className="ar-stat-value">
                            {loading ? '—' : `\u20B1${revenueStats.totalCollected.toLocaleString()}`}
                        </span>
                    </div>
                    <div className="ar-stat-delta-row">{renderDelta(deltas.collected)}</div>
                </div>

                <div className="ar-stat-card ar-stat-card--revenue">
                    <div className="ar-stat-card-top">
                        <span className="ar-stat-label">Outstanding</span>
                        <div className="ar-stat-icon ar-stat-icon--amber">
                            <Clock size={18} />
                        </div>
                    </div>
                    <div className="ar-stat-value-row">
                        <span className="ar-stat-value">
                            {loading ? '—' : `\u20B1${revenueStats.totalOutstanding.toLocaleString()}`}
                        </span>
                    </div>
                </div>
            </div>

            <div className="ar-charts-row">
                <div className="admin-card ar-bar-card">
                    <div className="ar-bar-card-header">
                        <h2 className="admin-card-title">Requests by month</h2>
                    </div>
                    <p className="ar-chart-description">
                        Document requests per month by type (last 6 months)
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
                                    <Bar dataKey="taxDeclaration" fill={DOC_TYPE_COLORS.taxDeclaration} radius={[4, 4, 0, 0]} barSize={10} />
                                    <Bar dataKey="landholding" fill={DOC_TYPE_COLORS.landholding} radius={[4, 4, 0, 0]} barSize={10} />
                                    <Bar dataKey="noLandholding" fill={DOC_TYPE_COLORS.noLandholding} radius={[4, 4, 0, 0]} barSize={10} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    <div className="ar-chart-legend">
                        {DOC_TYPE_SERIES.map((s) => (
                            <div className="ar-legend-item" key={s.key}>
                                <span className="ar-legend-dot" style={{ backgroundColor: s.color }} />
                                {s.label}
                            </div>
                        ))}
                    </div>
                </div>

                <AdminDocumentDistribution
                    slices={distribution}
                    isRefreshing={loading}
                />
            </div>

            <div className="ar-charts-row" style={{ gridTemplateColumns: '1fr' }}>
                <div className="admin-card ar-bar-card">
                    <h2 className="admin-card-title">Monthly Revenue</h2>
                    <p className="ar-chart-description">
                        Collections per month (last 12 months)
                    </p>
                    <div className="ar-chart-canvas">
                        {loading ? (
                            <div className="ar-chart-loading">Loading chart data…</div>
                        ) : (
                            <ResponsiveContainer>
                                <BarChart
                                    data={monthlyRevenue}
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
                                        tickFormatter={(v: number) => `\u20B1${v}`}
                                    />
                                    <Tooltip
                                        formatter={(value: any) => [`\u20B1${Number(value).toLocaleString()}`, 'Collected']}
                                        cursor={{ fill: 'rgba(41,35,122,0.04)' }}
                                        contentStyle={{ borderRadius: 8, border: '1px solid #EDEEF3', fontSize: 13 }}
                                    />
                                    <Bar dataKey="revenue" fill="#3D2E7C" radius={[4, 4, 0, 0]} barSize={12} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            <div className="ar-charts-row">
                <div className="admin-card ar-bar-card">
                    <h2 className="admin-card-title">Peak Hours</h2>
                    <p className="ar-chart-description">
                        Requests submitted per hour of the day
                    </p>
                    <div className="ar-chart-canvas">
                        {loading ? (
                            <div className="ar-chart-loading">Loading chart data…</div>
                        ) : (
                            <ResponsiveContainer>
                                <BarChart
                                    data={hourlyActivity}
                                    margin={{ top: 8, right: 8, left: -12, bottom: 8 }}
                                >
                                    <CartesianGrid vertical={false} stroke="rgba(41,35,122,0.08)" />
                                    <XAxis
                                        dataKey="hour"
                                        tick={{ fontSize: 11, fill: '#8b8fa3' }}
                                        axisLine={{ stroke: 'rgba(41,35,122,0.12)' }}
                                        tickLine={false}
                                        interval={1}
                                        tickFormatter={(v: number) => `${v}h`}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 11, fill: '#8b8fa3' }}
                                        axisLine={false}
                                        tickLine={false}
                                        allowDecimals={false}
                                    />
                                    <Tooltip
                                        formatter={(value: any) => [value, 'Requests']}
                                        labelFormatter={(label: any) => `${label}:00`}
                                        cursor={{ fill: 'rgba(41,35,122,0.04)' }}
                                        contentStyle={{ borderRadius: 8, border: '1px solid #EDEEF3', fontSize: 13 }}
                                    />
                                    <Bar dataKey="count" fill="#00BCD4" radius={[4, 4, 0, 0]} barSize={12} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                    <p className="ar-chart-description" style={{ marginTop: 10, marginBottom: 4 }}>
                        Requests per day of the week
                    </p>
                    <div className="ar-day-bars">
                        {byDayActivity.map((d) => {
                            const max = Math.max(1, ...byDayActivity.map((b) => b.count));
                            const pct = Math.round((d.count / max) * 100);
                            return (
                                <div className="ar-day-bar-item" key={d.day}>
                                    <span className="ar-day-bar-count">{d.count}</span>
                                    <div className="ar-day-bar-track">
                                        <div className="ar-day-bar" style={{ height: `${Math.max(pct, 3)}%` }} />
                                    </div>
                                    <span className="ar-day-bar-label">{d.day}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="admin-card ar-bar-card">
                    <h2 className="admin-card-title">Void / Cancel Reasons</h2>
                    <p className="ar-chart-description">
                        Why requests were voided or cancelled
                    </p>
                    <div className="ar-void-reasons">
                        {loading ? (
                            <div className="ar-chart-loading">Loading…</div>
                        ) : voidReasonBreakdown.length === 0 ? (
                            <div style={{ padding: '24px', textAlign: 'center', color: '#9aa0af', fontSize: 13 }}>
                                No voided or cancelled requests in this period.
                            </div>
                        ) : (
                            voidReasonBreakdown.slice(0, 8).map((item, i) => {
                                const max = voidReasonBreakdown[0].count;
                                const pct = Math.round((item.count / max) * 100);
                                return (
                                    <div className="ar-void-reason-item" key={`${item.reason}-${i}`}>
                                        <div className="ar-void-reason-top">
                                            <span className="ar-void-reason-label" title={item.reason}>{item.reason}</span>
                                            <span className="ar-void-reason-count">{item.count}</span>
                                        </div>
                                        <div className="ar-void-reason-bar-track">
                                            <div
                                                className="ar-void-reason-bar"
                                                style={{ width: `${Math.max(pct, 4)}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '24px' }}>
                <div className="admin-card ar-bar-card">
                    <h2 className="admin-card-title" style={{ margin: 0 }}>
                        Aging Report
                        <span style={{ marginLeft: '10px', fontSize: '13px', fontWeight: 500, color: '#6b6f80' }}>
                            ({filteredRows.length} requests)
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                        <div>
                            <h2 className="admin-card-title" style={{ margin: 0 }}>
                                Approval Rate Trends
                            </h2>
                            <p className="ar-chart-description" style={{ marginTop: 2, marginBottom: 0 }}>
                                Monthly release rate compared to voided / cancelled rate ({trendYear})
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#6b6f80', marginRight: '2px' }}>Year:</span>
                            <select
                                value={trendYear}
                                onChange={(e) => handleTrendYearChange(Number(e.target.value))}
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
                                {availableYears.map((yr) => (
                                    <option key={yr} value={yr}>
                                        {yr}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
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
                                Staff Workload
                            </h2>
                            <p className="ar-chart-description" style={{ marginTop: 2, marginBottom: 16 }}>
                                Document counts per staff by status, including released documents
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
                            {STAFF_DOC_STATUSES.map((s) => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                    <div className="admin-table-container" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                        {staffPendingRows.length === 0 ? (
                            <div style={{ padding: '32px', textAlign: 'center', color: '#9aa0af' }}>
                                No documents in this period.
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
                                                        r.status === 'Processing' ? '#E8F0FE' :
                                                        r.status === 'Payment Verified' ? '#E8F5E9' : '#E7F8EE',
                                                    color: r.status === 'Pending' ? '#D89A1D' :
                                                        r.status === 'Processing' ? '#3267d6' :
                                                        r.status === 'Payment Verified' ? '#2e7d32' : '#1E9E5A',
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

            {!loading && (
                <div className="admin-card" style={{ padding: '22px' }}>
                    <div>
                        <h2 className="admin-card-title" style={{ margin: 0 }}>
                            Staff Performance
                        </h2>
                        <p className="ar-chart-description" style={{ marginTop: 2, marginBottom: 16 }}>
                            Releases, reprints, voids and average turnaround per staff
                        </p>
                    </div>
                    <div className="admin-table-container" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                        {staffPerformance.length === 0 ? (
                            <div style={{ padding: '32px', textAlign: 'center', color: '#9aa0af' }}>
                                No staff activity in this period.
                            </div>
                        ) : (
                            <table className="admin-table" style={{ minWidth: 0 }}>
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left' }}>Staff</th>
                                        <th>Released</th>
                                        <th>Avg. Turnaround</th>
                                        <th>Reprints</th>
                                        <th>Void / Cancelled</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {staffPerformance.map((r, i) => (
                                        <tr key={`${r.staff}-${i}`}>
                                            <td style={{ textAlign: 'left', fontWeight: 600 }}>{r.staff}</td>
                                            <td style={{ fontWeight: 700, color: '#1E9E5A' }}>{r.released}</td>
                                            <td>{r.avgTurnaroundDays !== null ? `${r.avgTurnaroundDays} days` : '—'}</td>
                                            <td>{r.reprints}</td>
                                            <td style={{ color: r.voided > 0 ? '#C62828' : undefined }}>{r.voided}</td>
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
                                        <th>Declarant</th>
                                        <th>Date</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {getStaffFiltered(staffPopup.staff, staffPopup.status).map((row) => (
                                        <tr key={row.id}>
                                            <td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#5d6178' }}>{row.referenceNo}</td>
                                            <td><strong>{row.clientName}</strong></td>
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
                                        <th>Declarant</th>
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