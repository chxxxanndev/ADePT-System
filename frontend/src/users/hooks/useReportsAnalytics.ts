/**
 * useReportsAnalytics
 *
 * Single source of truth for Reports & Analytics data derived from the
 * real Transaction Registry API.  Reports.tsx, Dashboard.tsx (analytics
 * section + recent transactions), VoidAndAmend.tsx, and ArchiveManagement.tsx
 * all read from this same registry fetch (directly or via this hook), so a
 * status change made in one place (e.g. voiding a transaction in the
 * Transaction Registry) is reflected everywhere else the next time that
 * screen mounts.
 *
 * NOTE ON CACHING: each call to this hook performs its own network fetch.
 * Because the app only ever mounts one top-level view at a time (Dashboard's
 * home view XOR Reports XOR VoidAndAmend XOR ArchiveManagement), this does
 * not create simultaneous duplicate requests today — but if two of these
 * are ever mounted at once, wrap this hook in a React Context/Provider (or
 * a lightweight cache like SWR/React Query) to fully dedupe the fetch.
 *
 * All period bucketing (daily / weekly / monthly) is done on the client
 * because the current backend exposes individual transactions, not
 * pre-aggregated counts.  Swap the internals for a dedicated analytics
 * endpoint later without touching any UI component.
 *
 * `range` (optional) is the Dashboard Period selector's resolved date
 * range — when provided, all `selected*` fields below are filtered to it;
 * when omitted, `selected*` falls back to the full transaction set, so
 * every existing caller (Reports.tsx, VoidAndAmend.tsx, ArchiveManagement.tsx)
 * that calls useReportsAnalytics() with no argument is unaffected.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchTransactionRegistry } from '../services/transactionService';
import type { Transaction } from '../types/transaction';
import type { WeeklyTrendPoint, DocumentDistributionSlice, PeriodRange, TrendPoint } from '../types/dashboard';
import type { DeclarantRecord } from '../data/reportsMockData';

// ─── Period-bucketed metric ────────────────────────────────────────────────
export interface PeriodMetric {
    daily: number;
    weekly: number;
    monthly: number;
}

// ─── Trend (period-over-period comparison) ────────────────────────────────
export interface TrendInfo {
    direction: 'up' | 'down';
    percentage: number;
    comparedTo: string;
}

export interface PeriodTrend {
    daily: TrendInfo;
    weekly: TrendInfo;
    monthly: TrendInfo;
}

// ─── Status-chart bar ─────────────────────────────────────────────────────
export interface StatusChartBar {
    label: string;
    count: number;
    color: string;
}

// ─── Top-level shape returned by the hook ─────────────────────────────────
export interface ReportsAnalyticsData {
    /** Raw fetched transactions (all statuses), for consumers that need
     *  more than the derived aggregates below — e.g. Dashboard's Recent
     *  Transactions widget. Avoids a second independent fetch. */
    transactions: Transaction[];

    /** Transactions successfully released */
    documentsReleased: PeriodMetric;
    documentsReleasedTrend: PeriodTrend;
    /** All transactions in the registry (any status) */
    totalRequests: PeriodMetric;
    totalRequestsTrend: PeriodTrend;
    /** Tax Declaration counts by period */
    taxDeclarationCounts: PeriodMetric;
    /** Live count of non-terminal (pending / processing) transactions */
    pendingCount: number;
    /** Voided transaction count */
    voidedCount: number;
    /** Archived transaction count */
    archivedCount: number;
    /** Reprinted document count (sum of reprintCount across all docs) */
    reprintedCount: number;

    /** Fixed "last 5 calendar weeks" release counts — kept for any other
     *  consumer that still wants the old, picker-independent view. */
    weeklyTrend: WeeklyTrendPoint[];

    /** Document-type breakdown for the donut chart (all-time) */
    documentDistribution: DocumentDistributionSlice[];
    /** Sum of all distribution counts (all-time) */
    totalDocuments: number;

    /** Status distribution bars for the Reports bar chart (all-time) */
    statusChart: StatusChartBar[];

    /** Per-transaction rows for the Reports declarant table */
    declarantRows: DeclarantRecord[];

    // ── Period-selector-aware fields (Dashboard Period picker) ──
    /** Non-null only when a Dashboard Period range is active. */
    selectedRange: PeriodRange | null;
    /** Transactions falling inside `range` (or all transactions if no range given). */
    selectedTransactions: Transaction[];
    selectedTotalRequests: number;
    selectedDocumentsReleased: number;
    selectedPendingCount: number;
    selectedVoidedCount: number;
    selectedArchivedCount: number;
    selectedCancelledCount: number;
    selectedReprintedCount: number;
    selectedDocumentDistribution: DocumentDistributionSlice[];
    selectedTotalDocuments: number;
    selectedStatusChart: StatusChartBar[];
    /** Real processed/released counts, bucketed to fit the selected range
     *  (hourly for a single day, daily for ~2 weeks, weekly for ~1-2
     *  months, monthly beyond that). Falls back to a 5-week window
     *  bucketed by week when no range is active. */
    selectedTrend: TrendPoint[];

    loading: boolean;
    error: string | null;
    /** Re-run the registry fetch (e.g. after an error, or a "Retry" click) */
    refetch: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const NOW = new Date();

/** Returns true if the ISO date-string falls within today (local). */
function isToday(iso: string): boolean {
    const d = new Date(iso);
    return (
        d.getFullYear() === NOW.getFullYear() &&
        d.getMonth() === NOW.getMonth() &&
        d.getDate() === NOW.getDate()
    );
}

/** Returns true if the ISO date-string falls within yesterday (local). */
function isYesterday(iso: string): boolean {
    const d = new Date(iso);
    const yesterday = new Date(NOW);
    yesterday.setDate(NOW.getDate() - 1);
    return (
        d.getFullYear() === yesterday.getFullYear() &&
        d.getMonth() === yesterday.getMonth() &&
        d.getDate() === yesterday.getDate()
    );
}

/** Returns true if the ISO date-string falls within the current calendar week (Mon–Sun). */
function isThisWeek(iso: string): boolean {
    const d = new Date(iso);
    const startOfWeek = new Date(NOW);
    const day = NOW.getDay(); // 0 = Sunday
    startOfWeek.setDate(NOW.getDate() - ((day + 6) % 7)); // Monday
    startOfWeek.setHours(0, 0, 0, 0);
    return d >= startOfWeek && d <= NOW;
}

/** Returns true if the ISO date-string falls within the previous calendar week (Mon–Sun). */
function isLastWeek(iso: string): boolean {
    const d = new Date(iso);
    const day = NOW.getDay();
    const startOfThisWeek = new Date(NOW);
    startOfThisWeek.setDate(NOW.getDate() - ((day + 6) % 7));
    startOfThisWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);
    const endOfLastWeek = new Date(startOfThisWeek.getTime() - 1); // 1ms before this week starts

    return d >= startOfLastWeek && d <= endOfLastWeek;
}

/** Returns true if the ISO date-string falls within the current calendar month. */
function isThisMonth(iso: string): boolean {
    const d = new Date(iso);
    return d.getFullYear() === NOW.getFullYear() && d.getMonth() === NOW.getMonth();
}

/** Returns true if the ISO date-string falls within the previous calendar month. */
function isLastMonth(iso: string): boolean {
    const d = new Date(iso);
    const lastMonth = new Date(NOW.getFullYear(), NOW.getMonth() - 1, 1);
    return d.getFullYear() === lastMonth.getFullYear() && d.getMonth() === lastMonth.getMonth();
}

/**
 * Given a list of transactions and a predicate, counts how many of them
 * (a) satisfy `pred` and (b) have at least one document of `docType`.
 */
function countByDocType(txns: Transaction[], docType: string, pred: (t: Transaction) => boolean): number {
    return txns.filter(t => pred(t) && t.requestedDocuments.some(d =>
        d.documentType.toLowerCase().includes(docType.toLowerCase())
    )).length;
}

/** Formats a Date as "DD Mon YYYY · HH:MM AM/PM" matching the Reports table style. */
function formatReleaseDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        + ' · '
        + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

/** Builds a period-over-period trend, guarding against divide-by-zero. */
function computeTrend(current: number, previous: number, comparedTo: string): TrendInfo {
    if (previous === 0) {
        return { direction: current > 0 ? 'up' : 'down', percentage: current > 0 ? 100 : 0, comparedTo };
    }
    const pct = Math.round(((current - previous) / previous) * 100);
    return { direction: pct >= 0 ? 'up' : 'down', percentage: Math.abs(pct), comparedTo };
}

/**
 * Bucket Released transactions into weekly groups (last 5 weeks)
 * for the old, picker-independent weeklyTrend field.
 */
function buildWeeklyTrend(released: Transaction[]): WeeklyTrendPoint[] {
    const buckets: { label: string; start: Date; end: Date }[] = [];
    for (let i = 4; i >= 0; i--) {
        const end = new Date(NOW);
        end.setDate(NOW.getDate() - i * 7);
        end.setHours(23, 59, 59, 999);
        const start = new Date(end);
        start.setDate(end.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        buckets.push({ label: `Week ${5 - i}`, start, end });
    }

    return buckets.map(b => ({
        label: b.label,
        value: released.filter(t => {
            const d = new Date(t.dateRequested);
            return d >= b.start && d <= b.end;
        }).length,
    }));
}

type BucketUnit = 'hour' | 'day' | 'week' | 'month';

/** Formats a bucket's label based on its granularity. */
function formatBucketLabel(start: Date, end: Date, unit: BucketUnit): string {
    switch (unit) {
        case 'hour':
            return start.toLocaleTimeString('en-US', { hour: 'numeric' });
        case 'day':
            return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        case 'week': {
            const s = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const e = new Date(end.getTime() - 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return `${s}–${e}`;
        }
        case 'month':
            return start.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    }
}

/**
 * Builds a real processed/released trend series shaped to fit whatever
 * span is currently selected in the Dashboard Period picker:
 *   - <= ~1.5 days  → 6 buckets, ~4 hours each (hourly granularity)
 *   - <= ~16 days   → 1 bucket per day
 *   - <= ~70 days   → 1 bucket per week
 *   - beyond that   → 1 bucket per month
 * Bucket count is capped at 12 so the chart never gets overcrowded.
 * When no range is active, falls back to the same 5-calendar-week window
 * the old fixed chart used, so the chart still shows something sensible
 * before the user ever touches the picker.
 */
function buildRangeTrend(rangeTransactions: Transaction[], range: PeriodRange | null | undefined): TrendPoint[] {
    const to = range?.to ?? NOW;
    const from = range?.from ?? (() => {
        const d = new Date(NOW);
        d.setDate(d.getDate() - 34); // 5 weeks back, matches buildWeeklyTrend's window
        d.setHours(0, 0, 0, 0);
        return d;
    })();

    const spanMs = Math.max(to.getTime() - from.getTime(), 1);
    const spanDays = spanMs / (1000 * 60 * 60 * 24);

    let unit: BucketUnit;
    let bucketCount: number;

    if (spanDays <= 1.5) {
        unit = 'hour';
        bucketCount = 6; // ~4-hour blocks across the day
    } else if (spanDays <= 16) {
        unit = 'day';
        bucketCount = Math.max(1, Math.ceil(spanDays));
    } else if (spanDays <= 70) {
        unit = 'week';
        bucketCount = Math.max(1, Math.ceil(spanDays / 7));
    } else {
        unit = 'month';
        bucketCount = Math.max(1, Math.ceil(spanDays / 30));
    }

    bucketCount = Math.min(bucketCount, 12);

    const bucketMs = spanMs / bucketCount;
    const buckets: { start: Date; end: Date }[] = [];
    for (let i = 0; i < bucketCount; i++) {
        buckets.push({
            start: new Date(from.getTime() + i * bucketMs),
            end: new Date(from.getTime() + (i + 1) * bucketMs),
        });
    }

    return buckets.map((b, i) => {
        const isLastBucket = i === buckets.length - 1;
        const inBucket = rangeTransactions.filter(t => {
            const d = new Date(t.dateRequested);
            // Last bucket is inclusive of `to` so nothing at the exact
            // range boundary gets dropped.
            return d >= b.start && (isLastBucket ? d <= b.end : d < b.end);
        });
        return {
            label: formatBucketLabel(b.start, b.end, unit),
            processed: inBucket.length,
            released: inBucket.filter(t => t.status === 'Released').length,
        };
    });
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useReportsAnalytics(range?: PeriodRange | null): ReportsAnalyticsData {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refetchToken, setRefetchToken] = useState(0);

    const refetch = useCallback(() => setRefetchToken(n => n + 1), []);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        fetchTransactionRegistry()
            .then(data => { if (!cancelled) setTransactions(data); })
            .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load data.'); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [refetchToken]);

    // ── Derived analytics ────────────────────────────────────────────────
    const data = useMemo((): Omit<ReportsAnalyticsData, 'loading' | 'error' | 'refetch'> => {
        const released = transactions.filter(t => t.status === 'Released');
        const voided = transactions.filter(t => t.status === 'Void');
        const archived = transactions.filter(t => t.status === 'Archived');
        const pending = transactions.filter(t =>
            t.status === 'Pending' || t.status === 'For Payment' ||
            t.status === 'Payment Verified' || t.status === 'Processing' ||
            t.status === 'Ready for Release'
        );

        // ── Period metrics (all-time, calendar-relative) ───────────────
        const releasedToday = released.filter(t => isToday(t.dateRequested)).length;
        const releasedYesterday = released.filter(t => isYesterday(t.dateRequested)).length;
        const releasedWeek = released.filter(t => isThisWeek(t.dateRequested)).length;
        const releasedLastWeek = released.filter(t => isLastWeek(t.dateRequested)).length;
        const releasedMonth = released.filter(t => isThisMonth(t.dateRequested)).length;
        const releasedLastMonth = released.filter(t => isLastMonth(t.dateRequested)).length;

        const totalToday = transactions.filter(t => isToday(t.dateRequested)).length;
        const totalYesterday = transactions.filter(t => isYesterday(t.dateRequested)).length;
        const totalWeek = transactions.filter(t => isThisWeek(t.dateRequested)).length;
        const totalLastWeek = transactions.filter(t => isLastWeek(t.dateRequested)).length;
        const totalMonth = transactions.filter(t => isThisMonth(t.dateRequested)).length;
        const totalLastMonth = transactions.filter(t => isLastMonth(t.dateRequested)).length;

        const tdToday = countByDocType(released, 'Tax Declaration', t => isToday(t.dateRequested));
        const tdWeek = countByDocType(released, 'Tax Declaration', t => isThisWeek(t.dateRequested));
        const tdMonth = countByDocType(released, 'Tax Declaration', t => isThisMonth(t.dateRequested));

        // Reprinted documents (all-time): sum all reprintCounts
        const reprintedCount = transactions.reduce((sum, t) =>
            sum + t.requestedDocuments.reduce((s, d) => s + (d.reprintCount || 0), 0), 0
        );

        // ── Fixed 5-week trend (kept for any consumer wanting the old view) ──
        const weeklyTrend = buildWeeklyTrend(released);

        // ── Document distribution (all-time, unaffected by the period picker) ──
        const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, '');
        const hasDocType = (t: Transaction, needle: string) =>
            t.requestedDocuments.some(d => normalize(d.documentType).includes(normalize(needle)));

        const tdCount = released.filter(t => hasDocType(t, 'Tax Declaration')).length;
        const nlhCount = released.filter(t => hasDocType(t, 'No Landholding')).length;
        const lhCount = released.filter(t =>
            hasDocType(t, 'Landholding') && !hasDocType(t, 'No Landholding')
        ).length;
        const totalDocs = tdCount + lhCount + nlhCount || 1; // avoid /0

        const documentDistribution: DocumentDistributionSlice[] = [
            { label: 'Tax Declaration', count: tdCount, percentage: Math.round((tdCount / totalDocs) * 100), color: 'primary' },
            { label: 'Certificate of Land Holding', count: lhCount, percentage: Math.round((lhCount / totalDocs) * 100), color: 'gold' },
            { label: 'Certificate of No Landholding', count: nlhCount, percentage: Math.round((nlhCount / totalDocs) * 100), color: 'red' },
        ];

        // ── Status bar chart (all-time) ─────────────────────────────────
        const statusChart: StatusChartBar[] = [
            { label: 'RELEASED', count: released.length, color: '#4f46e5' },
            { label: 'ARCHIVED', count: archived.length, color: '#64748b' },
            { label: 'VOIDED', count: voided.length, color: '#ef4444' },
            { label: 'REPRINTED', count: reprintedCount, color: '#06b6d4' },
        ];

        // ── Declarant rows for the Reports table (all-time) ─────────────
        const declarantRows: DeclarantRecord[] = transactions.map(t => {
            const docTypes = t.requestedDocuments.map(d => d.documentType).join(', ') || 'N/A';
            const initials = t.client.declarantName
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map(w => w[0].toUpperCase())
                .join('');

            let status: DeclarantRecord['status'] = 'Released';
            const s = t.status;
            if (s === 'Void') status = 'Voided';
            else if (s === 'Archived') status = 'Archived';
            else if (s === 'For Payment' || s === 'Pending') status = 'Pending Payment';
            else if (s === 'Payment Verified' || s === 'Processing' || s === 'Ready for Release') status = 'Pending Verification';

            return {
                reference: t.referenceNumber,
                declarantName: t.client.declarantName,
                initials,
                avatarColor: '#29237A',
                documentRequested: docTypes,
                dateReleased: s === 'Released' ? formatReleaseDate(t.dateRequested) : '—',
                staffReleased: t.assignedStaff || '—',
                encodedBy: t.assignedStaff || '—',
                status,
            };
        });

        // ── Range-filtered subset for the Dashboard Period selector ──────
        // Falls back to the full transaction list when no range is passed,
        // so every existing caller of useReportsAnalytics() (no args) sees
        // selected* === the all-time values.
        const rangeTransactions = range
            ? transactions.filter(t => {
                const d = new Date(t.dateRequested);
                return d >= range.from && d <= range.to;
            })
            : transactions;

        const rangeReleased = rangeTransactions.filter(t => t.status === 'Released');
        const rangeVoided = rangeTransactions.filter(t => t.status === 'Void');
        const rangeArchived = rangeTransactions.filter(t => t.status === 'Archived');
        const rangeCancelled = rangeTransactions.filter(t => t.status === 'Cancelled');
        const rangePending = rangeTransactions.filter(t =>
            t.status === 'Pending' || t.status === 'For Payment' ||
            t.status === 'Payment Verified' || t.status === 'Processing' ||
            t.status === 'Ready for Release'
        );

        const selTd = rangeReleased.filter(t => hasDocType(t, 'Tax Declaration')).length;
        const selNlh = rangeReleased.filter(t => hasDocType(t, 'No Landholding')).length;
        const selLh = rangeReleased.filter(t =>
            hasDocType(t, 'Landholding') && !hasDocType(t, 'No Landholding')
        ).length;
        const selTotalDocs = selTd + selLh + selNlh || 1;

        const selectedDocumentDistribution: DocumentDistributionSlice[] = [
            { label: 'Tax Declaration', count: selTd, percentage: Math.round((selTd / selTotalDocs) * 100), color: 'primary' },
            { label: 'Certificate of Land Holding', count: selLh, percentage: Math.round((selLh / selTotalDocs) * 100), color: 'gold' },
            { label: 'Certificate of No Landholding', count: selNlh, percentage: Math.round((selNlh / selTotalDocs) * 100), color: 'red' },
        ];

        const selectedReprintedCount = rangeTransactions.reduce(
            (sum, t) => sum + t.requestedDocuments.reduce((s, d) => s + (d.reprintCount || 0), 0), 0
        );

        const selectedStatusChart: StatusChartBar[] = [
            { label: 'RELEASED', count: rangeReleased.length, color: '#4f46e5' },
            { label: 'ARCHIVED', count: rangeArchived.length, color: '#64748b' },
            { label: 'VOIDED', count: rangeVoided.length, color: '#ef4444' },
            { label: 'REPRINTED', count: selectedReprintedCount, color: '#06b6d4' },
        ];

        // ── NEW: real, range-aware processed/released trend ─────────────
        const selectedTrend = buildRangeTrend(rangeTransactions, range);

        return {
            transactions,
            documentsReleased: { daily: releasedToday, weekly: releasedWeek, monthly: releasedMonth },
            documentsReleasedTrend: {
                daily: computeTrend(releasedToday, releasedYesterday, 'yesterday'),
                weekly: computeTrend(releasedWeek, releasedLastWeek, 'last week'),
                monthly: computeTrend(releasedMonth, releasedLastMonth, 'last month'),
            },
            totalRequests: { daily: totalToday, weekly: totalWeek, monthly: totalMonth },
            totalRequestsTrend: {
                daily: computeTrend(totalToday, totalYesterday, 'yesterday'),
                weekly: computeTrend(totalWeek, totalLastWeek, 'last week'),
                monthly: computeTrend(totalMonth, totalLastMonth, 'last month'),
            },
            taxDeclarationCounts: { daily: tdToday, weekly: tdWeek, monthly: tdMonth },
            pendingCount: pending.length,
            voidedCount: voided.length,
            archivedCount: archived.length,
            reprintedCount,
            weeklyTrend,
            documentDistribution,
            totalDocuments: tdCount + lhCount + nlhCount,
            statusChart,
            declarantRows,

            // ── Period-selector-aware ──
            selectedRange: range ?? null,
            selectedTransactions: rangeTransactions,
            selectedTotalRequests: rangeTransactions.length,
            selectedDocumentsReleased: rangeReleased.length,
            selectedPendingCount: rangePending.length,
            selectedVoidedCount: rangeVoided.length,
            selectedArchivedCount: rangeArchived.length,
            selectedCancelledCount: rangeCancelled.length,
            selectedReprintedCount,
            selectedDocumentDistribution,
            selectedTotalDocuments: selTd + selLh + selNlh,
            selectedStatusChart,
            selectedTrend,
        };
    }, [transactions, range]);

    return { ...data, loading, error, refetch };
}