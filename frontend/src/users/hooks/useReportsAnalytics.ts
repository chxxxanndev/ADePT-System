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
import type { DeclarantRecord, DeclarantReprint } from '../data/reportsMockData';
import {
    getDocumentTypeFromReference,
    matchesDocumentType,
    type DocumentTypeFilterValue,
} from '../../utils/documentType';
import { hasTimeComponent } from '../../utils/dateTime';

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
    /** Grand total of requests across ALL time — period-independent
     *  (unlike totalRequests, which is bucketed daily/weekly/monthly).
     *  Still honors the document-type filter for consistency with the
     *  other cards. */
    totalRequestsAll: number;
    /** Tax Declaration counts by period */
    taxDeclarationCounts: PeriodMetric;
    /** Released Certificate-of-Landholding counts by period (same bucketing
     *  rule as taxDeclarationCounts: by real release time) */
    landholdingCounts: PeriodMetric;
    /** Released Certificate-of-No-Landholding counts by period */
    noLandholdingCounts: PeriodMetric;
    /** Live count of requests currently in the Pending Payments queue
     *  (raw backend status PENDING_PAYMENT, falling back to the mapped
     *  'Pending' label on pre-statusRaw responses) — matches the Pending
     *  Payments page exactly. Drafts, in-progress work, and payment-verified
     *  records are not part of this queue. */
    pendingCount: number;
    /** Voided transaction count */
    voidedCount: number;
    /** Archived transaction count */
    archivedCount: number;
    /** Reprinted document count (sum of reprintCount across all docs) */
    reprintedCount: number;
    /** Per-declarant reprinted-document totals (aggregated across all of a
     *  declarant's transactions, only declarants with at least one reprint,
     *  sorted by count descending). */
    reprintedDocumentsByDeclarant: DeclarantReprint[];

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
    /** Wall-clock time the registry data currently on screen was fetched —
     *  drives the "Last updated" stamps instead of hardcoded labels. */
    fetchedAt: Date | null;
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
 * (a) satisfy `pred` and (b) have at least one requested document accepted
 * by `match`.
 */
function countByDocMatcher(
    txns: Transaction[],
    match: (d: { documentType: string }) => boolean,
    pred: (t: Transaction) => boolean
): number {
    return txns.filter(t => pred(t) && t.requestedDocuments.some(match)).length;
}

/** Document-type matchers for the per-type release counters. Tax Declaration
 *  keeps the historical fuzzy substring match; the two certificates match the
 *  exact registry names (both spellings, mirroring the distribution slices)
 *  so a "No Landholding" record can never be counted as "Landholding". */
const isTaxDeclarationDoc = (d: { documentType: string }) =>
    d.documentType.toLowerCase().includes('tax declaration');
const isLandholdingDoc = (d: { documentType: string }) =>
    d.documentType === 'Certificate of Landholding' ||
    d.documentType === 'Certificate of Land Holding';
const isNoLandholdingDoc = (d: { documentType: string }) =>
    d.documentType === 'Certificate of No Landholding' ||
    d.documentType === 'Certificate of No Land Holding';

/** True "release" timestamp for a transaction: the full released_at when
    present (accurate time + date), falling back to the date-only columns. */
function releaseDateOf(t: Transaction): string {
    return t.releasedAt ?? t.dateReleased ?? t.dateRequested;
}

/** Formats a release date as "DD Mon YYYY" — with "· HH:MM AM/PM" appended
    only when the source string actually carries a time (full timestamps like
    released_at), so a date-only fallback never shows a fake fixed clock
    (parsing "2026-08-11" as UTC midnight renders 8:00 AM in UTC+8). */
function formatReleaseDate(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const datePart = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    if (!hasTimeComponent(iso)) return datePart;
    return datePart + ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
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
 * Bucket transactions into 5 rolling weekly groups (ending today) for the
 * Analytics Overview bar chart. Two honest series per week:
 *  - processed: requests whose REQUEST date falls in the bucket (workload)
 *  - released:  documents whose actual release time falls in the bucket
 * The labels anchor the most recent weeks ("This Week" / "Last Week") and
 * fall back to the week-start date for older buckets, with the full date
 * span available on rangeLabel for the chart tooltip.
 */
function buildWeeklyTrend(all: Transaction[], released: Transaction[]): WeeklyTrendPoint[] {
    // Build 5 weekly buckets ending today
    const buckets: { label: string; rangeLabel: string; start: Date; end: Date }[] = [];
    for (let i = 4; i >= 0; i--) {
        const end = new Date(NOW);
        end.setDate(NOW.getDate() - i * 7);
        end.setHours(23, 59, 59, 999);
        const start = new Date(end);
        start.setDate(end.getDate() - 6);
        start.setHours(0, 0, 0, 0);

        const startLabel = start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        const endLabel = end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        const anchor =
            i === 0 ? 'This Week' :
            i === 1 ? 'Last Week' :
            startLabel;

        buckets.push({ label: anchor, rangeLabel: `${startLabel} – ${endLabel}`, start, end });
    }

    return buckets.map(b => ({
        label: b.label,
        rangeLabel: b.rangeLabel,
        // Processed buckets by request date (any status); released buckets
        // by the actual release time so a doc released this week counts
        // this week even if its request was older.
        processed: all.filter(t => {
            const d = new Date(t.dateRequested);
            return d >= b.start && d <= b.end;
        }).length,
        released: released.filter(t => {
            const d = new Date(releaseDateOf(t));
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
    const [fetchedAt, setFetchedAt] = useState<Date | null>(null);
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
                setFetchedAt(new Date());
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
    const data = useMemo((): Omit<ReportsAnalyticsData, 'loading' | 'isRefreshing' | 'error' | 'refetch' | 'fetchedAt'> => {
        const filtered = transactions.filter(t => matchesDocumentType(t.referenceNumber, documentType));
        const released = filtered.filter(t => t.status === 'Released');
        const voided = filtered.filter(t => t.status === 'Void');
        const archived = filtered.filter(t => t.status === 'Archived');
        // Exactly the Pending Payments queue — raw PENDING_PAYMENT status
        // (mapped 'Pending' only as a fallback for pre-statusRaw responses),
        // so "Total Pending" always matches the Pending Payments page.
        const pending = filtered.filter(t =>
            t.statusRaw === 'PENDING_PAYMENT' ||
            (!t.statusRaw && t.status === 'Pending')
        );

        // ── Period metrics ────────────────────────────────────────────
        // "Released" counts bucket by the real release time (releasedAt /
        // dateReleased), NOT the request date, so e.g. "Released Today" is
        // genuinely documents released today even when they were requested
        // earlier. Pending/total-request figures keep request-date bucketing.
        const releasedToday = released.filter(t => isToday(releaseDateOf(t))).length;
        const releasedYesterday = released.filter(t => isYesterday(releaseDateOf(t))).length;
        const releasedWeek = released.filter(t => isThisWeek(releaseDateOf(t))).length;
        const releasedLastWeek = released.filter(t => isLastWeek(releaseDateOf(t))).length;
        const releasedMonth = released.filter(t => isThisMonth(releaseDateOf(t))).length;
        const releasedLastMonth = released.filter(t => isLastMonth(releaseDateOf(t))).length;

        const totalToday = filtered.filter(t => isToday(t.dateRequested)).length;
        const totalYesterday = filtered.filter(t => isYesterday(t.dateRequested)).length;
        const totalWeek = filtered.filter(t => isThisWeek(t.dateRequested)).length;
        const totalLastWeek = filtered.filter(t => isLastWeek(t.dateRequested)).length;
        const totalMonth = filtered.filter(t => isThisMonth(t.dateRequested)).length;
        const totalLastMonth = filtered.filter(t => isLastMonth(t.dateRequested)).length;

        // Per-document-type release counts share one bucketing rule: a
        // released transaction counts toward every document type it
        // contains, bucketed by its real release time (same rule as
        // documentsReleased — NOT the request date).
        const tdToday = countByDocMatcher(released, isTaxDeclarationDoc, t => isToday(releaseDateOf(t)));
        const tdWeek = countByDocMatcher(released, isTaxDeclarationDoc, t => isThisWeek(releaseDateOf(t)));
        const tdMonth = countByDocMatcher(released, isTaxDeclarationDoc, t => isThisMonth(releaseDateOf(t)));
        const lhToday = countByDocMatcher(released, isLandholdingDoc, t => isToday(releaseDateOf(t)));
        const lhWeek = countByDocMatcher(released, isLandholdingDoc, t => isThisWeek(releaseDateOf(t)));
        const lhMonth = countByDocMatcher(released, isLandholdingDoc, t => isThisMonth(releaseDateOf(t)));
        const nlhToday = countByDocMatcher(released, isNoLandholdingDoc, t => isToday(releaseDateOf(t)));
        const nlhWeek = countByDocMatcher(released, isNoLandholdingDoc, t => isThisWeek(releaseDateOf(t)));
        const nlhMonth = countByDocMatcher(released, isNoLandholdingDoc, t => isThisMonth(releaseDateOf(t)));

        // Reprinted documents: sum all reprintCounts
        const reprintedCount = filtered.reduce((sum, t) =>
            sum + t.requestedDocuments.reduce((s, d) => s + (d.reprintCount || 0), 0), 0
        );

        // Per-declarant reprint totals — keyed by declarant name so the
        // head can track total issuance (a declarant may hold multiple
        // transactions; reprints from all of them are combined here). Each
        // declarant's total is also broken down by document type so the
        // Reports card can show exactly which documents were reprinted.
        const reprintsByDeclarant = new Map<string, { count: number; byDoc: Map<string, number> }>();
        for (const t of filtered) {
            for (const d of t.requestedDocuments) {
                const reprints = d.reprintCount || 0;
                if (reprints <= 0) continue;
                const entry =
                    reprintsByDeclarant.get(t.client.declarantName) ??
                    { count: 0, byDoc: new Map<string, number>() };
                entry.count += reprints;
                entry.byDoc.set(d.documentType, (entry.byDoc.get(d.documentType) ?? 0) + reprints);
                reprintsByDeclarant.set(t.client.declarantName, entry);
            }
        }
        const reprintedDocumentsByDeclarant: DeclarantReprint[] =
            [...reprintsByDeclarant.entries()]
                .map(([declarantName, { count, byDoc }]) => ({
                    declarantName,
                    count,
                    documents: [...byDoc.entries()]
                        .map(([documentType, c]) => ({ documentType, count: c }))
                        .sort((a, b) => b.count - a.count),
                }))
                .sort((a, b) => b.count - a.count);

        // ── Weekly trend ──────────────────────────────────────────────
        const weeklyTrend = buildWeeklyTrend(filtered, released);

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

            // Status is passed through VERBATIM from TransactionStatus so
            // the Reports table always reflects the actual system status.
            return {
                reference: t.referenceNumber,
                declarantName: t.client.declarantName,
                initials,
                avatarColor: '#29237A',
                documentRequested: docTypes,
                dateReleased: t.status === 'Released' ? formatReleaseDate(releaseDateOf(t)) : '—',
                releasedAtISO: t.status === 'Released' ? releaseDateOf(t) : null,
                staffReleased: t.assignedStaff || '—',
                encodedBy: t.assignedStaff || '—',
                status: t.status,
                reprintedDocuments: t.requestedDocuments.reduce(
                    (s, d) => s + (d.reprintCount || 0), 0
                ),
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
            totalRequestsAll: filtered.length,
            totalRequestsTrend: {
                daily: computeTrend(totalToday, totalYesterday, 'yesterday'),
                weekly: computeTrend(totalWeek, totalLastWeek, 'last week'),
                monthly: computeTrend(totalMonth, totalLastMonth, 'last month'),
            },
            taxDeclarationCounts: { daily: tdToday, weekly: tdWeek, monthly: tdMonth },
            landholdingCounts: { daily: lhToday, weekly: lhWeek, monthly: lhMonth },
            noLandholdingCounts: { daily: nlhToday, weekly: nlhWeek, monthly: nlhMonth },
            pendingCount: pending.length,
            voidedCount: voided.length,
            archivedCount: archived.length,
            reprintedCount,
            reprintedDocumentsByDeclarant,
            weeklyTrend,
            documentDistribution,
            totalDocuments: tdCount + lhCount + nlhCount,
            statusChart,
            declarantRows,
        };
    }, [transactions, documentType]);

    return { ...data, loading, isRefreshing, error, refetch, fetchedAt };
}