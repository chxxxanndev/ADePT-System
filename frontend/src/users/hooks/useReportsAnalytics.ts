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
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { fetchTransactionRegistry } from '../services/transactionService';
import type { Transaction } from '../types/transaction';
import type { WeeklyTrendPoint, DocumentDistributionSlice } from '../types/dashboard';
import type { DeclarantRecord } from '../data/reportsMockData';
import {
    getDocumentTypeFromReference,
    matchesDocumentType,
    type DocumentTypeFilterValue,
} from '../../utils/documentType';

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

    /** Weekly bucketed release counts for the Analytics Overview bar chart */
    weeklyTrend: WeeklyTrendPoint[];

    /** Document-type breakdown for the donut chart */
    documentDistribution: DocumentDistributionSlice[];
    /** Sum of all distribution counts */
    totalDocuments: number;

    /** Status distribution bars for the Reports bar chart */
    statusChart: StatusChartBar[];

    /** Per-transaction rows for the Reports declarant table */
    declarantRows: DeclarantRecord[];

    loading: boolean;
    /** True while a refresh re-fetches data that is already on screen —
     *  consumers keep showing the loaded data instead of skeletons,
     *  mirroring TransactionRegistry's isRefreshing behavior. */
    isRefreshing: boolean;
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
 * for the Analytics Overview bar chart.
 */
function buildWeeklyTrend(released: Transaction[]): WeeklyTrendPoint[] {
    // Build 5 weekly buckets ending today
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

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useReportsAnalytics(documentType: DocumentTypeFilterValue = 'All'): ReportsAnalyticsData {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [refetchToken, setRefetchToken] = useState(0);
    // Mirrors TransactionRegistry: the first fetch shows skeletons; a
    // re-fetch while data is already on screen keeps the data visible.
    const hasLoadedRef = useRef(false);

    const refetch = useCallback(() => setRefetchToken(n => n + 1), []);

    useEffect(() => {
        let cancelled = false;
        setError(null);
        if (hasLoadedRef.current) setIsRefreshing(true);
        else setLoading(true);
        fetchTransactionRegistry()
            .then(data => {
                if (cancelled) return;
                setTransactions(data);
                hasLoadedRef.current = true;
            })
            .catch(err => {
                if (cancelled) return;
                setError(err instanceof Error ? err.message : 'Failed to load data.');
                setTransactions([]);
            })
            .finally(() => {
                if (cancelled) return;
                setLoading(false);
                setIsRefreshing(false);
            });
        return () => { cancelled = true; };
    }, [refetchToken]);

    // ── Derived analytics ────────────────────────────────────────────────
    // The Document Type filter is applied here, at the source, so every
    // aggregate below (stat cards, trends, status chart, distribution,
    // declarant rows) reflects the selected type. Detection is purely
    // reference-prefix based (getDocumentTypeFromReference); 'All' matches
    // every record, so the default behavior is unchanged.
    const data = useMemo((): Omit<ReportsAnalyticsData, 'loading' | 'isRefreshing' | 'error' | 'refetch'> => {
        const filtered = transactions.filter(t => matchesDocumentType(t.referenceNumber, documentType));
        const released = filtered.filter(t => t.status === 'Released');
        const voided = filtered.filter(t => t.status === 'Void');
        const archived = filtered.filter(t => t.status === 'Archived');
        const pending = filtered.filter(t =>
            t.status === 'Pending' || t.status === 'For Payment' ||
            t.status === 'Payment Verified' || t.status === 'Processing' ||
            t.status === 'Ready for Release'
        );

        // ── Period metrics ────────────────────────────────────────────
        const releasedToday = released.filter(t => isToday(t.dateRequested)).length;
        const releasedYesterday = released.filter(t => isYesterday(t.dateRequested)).length;
        const releasedWeek = released.filter(t => isThisWeek(t.dateRequested)).length;
        const releasedLastWeek = released.filter(t => isLastWeek(t.dateRequested)).length;
        const releasedMonth = released.filter(t => isThisMonth(t.dateRequested)).length;
        const releasedLastMonth = released.filter(t => isLastMonth(t.dateRequested)).length;

        const totalToday = filtered.filter(t => isToday(t.dateRequested)).length;
        const totalYesterday = filtered.filter(t => isYesterday(t.dateRequested)).length;
        const totalWeek = filtered.filter(t => isThisWeek(t.dateRequested)).length;
        const totalLastWeek = filtered.filter(t => isLastWeek(t.dateRequested)).length;
        const totalMonth = filtered.filter(t => isThisMonth(t.dateRequested)).length;
        const totalLastMonth = filtered.filter(t => isLastMonth(t.dateRequested)).length;

        const tdToday = countByDocType(released, 'Tax Declaration', t => isToday(t.dateRequested));
        const tdWeek = countByDocType(released, 'Tax Declaration', t => isThisWeek(t.dateRequested));
        const tdMonth = countByDocType(released, 'Tax Declaration', t => isThisMonth(t.dateRequested));

        // Reprinted documents: sum all reprintCounts
        const reprintedCount = filtered.reduce((sum, t) =>
            sum + t.requestedDocuments.reduce((s, d) => s + (d.reprintCount || 0), 0), 0
        );

        // ── Weekly trend ──────────────────────────────────────────────
        const weeklyTrend = buildWeeklyTrend(released);

        // ── Document distribution ──────────────────────────────────────
        // The registry passes document_types.name through verbatim, so the
        // "Certificate of Landholding" spelling (no space) is the live value;
        // accept the spaced variant too so a future rename can't silently
        // zero out the distribution slices.
        const isDocType = (d: { documentType: string }, name: string) => d.documentType === name;
        const tdCount = released.filter(t => t.requestedDocuments.some(d => isDocType(d, 'Tax Declaration'))).length;
        const lhCount = released.filter(t => t.requestedDocuments.some(d =>
            isDocType(d, 'Certificate of Landholding') || isDocType(d, 'Certificate of Land Holding')
        )).length;
        const nlhCount = released.filter(t => t.requestedDocuments.some(d =>
            isDocType(d, 'Certificate of No Landholding') || isDocType(d, 'Certificate of No Land Holding')
        )).length;
        const totalDocs = tdCount + lhCount + nlhCount || 1; // avoid /0

        const documentDistribution: DocumentDistributionSlice[] = [
            { label: 'Tax Declaration', count: tdCount, percentage: Math.round((tdCount / totalDocs) * 100), color: 'primary' },
            { label: 'Certificate of Land Holding', count: lhCount, percentage: Math.round((lhCount / totalDocs) * 100), color: 'gold' },
            { label: 'Certificate of No Landholding', count: nlhCount, percentage: Math.round((nlhCount / totalDocs) * 100), color: 'red' },
        ];

        // ── Status bar chart ──────────────────────────────────────────
        const statusChart: StatusChartBar[] = [
            { label: 'RELEASED', count: released.length, color: '#4f46e5' },
            { label: 'ARCHIVED', count: archived.length, color: '#64748b' },
            { label: 'VOIDED', count: voided.length, color: '#ef4444' },
            { label: 'REPRINTED', count: reprintedCount, color: '#06b6d4' },
        ];

        // ── Declarant rows for the Reports table ───────────────────────
        const declarantRows: DeclarantRecord[] = filtered.map(t => {
            const docTypes =
                t.requestedDocuments.map(d => d.documentType).join(', ') ||
                getDocumentTypeFromReference(t.referenceNumber) ||
                'N/A';
            const initials = t.client.declarantName
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map(w => w[0].toUpperCase())
                .join('');

            // Map TransactionStatus → DeclarantStatus
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

        return {
            transactions: filtered,
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
        };
    }, [transactions, documentType]);

    return { ...data, loading, isRefreshing, error, refetch };
}