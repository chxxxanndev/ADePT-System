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
 
export interface PeriodMetric {
    daily: number;
    weekly: number;
    monthly: number;
}

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

export interface StatusChartBar {
    label: string;
    count: number;
    color: string;
}

export interface ReportsAnalyticsData {
    transactions: Transaction[];
    documentsReleased: PeriodMetric;
    documentsReleasedTrend: PeriodTrend;
    totalRequests: PeriodMetric;
    totalRequestsTrend: PeriodTrend;
    totalRequestsAll: number;
    taxDeclarationCounts: PeriodMetric;
    landholdingCounts: PeriodMetric;
    noLandholdingCounts: PeriodMetric;
    pendingCount: number;
    voidedCount: number;
    archivedCount: number;
    reprintedCount: number;
    reprintedDocumentsByDeclarant: DeclarantReprint[];
    weeklyTrend: WeeklyTrendPoint[];
    documentDistribution: DocumentDistributionSlice[];
    totalDocuments: number;
    statusChart: StatusChartBar[];
    declarantRows: DeclarantRecord[];
    loading: boolean;
    isRefreshing: boolean;
    error: string | null;
    fetchedAt: Date | null;
    refetch: () => void;
}

const NOW = new Date();

function isToday(iso: string): boolean {
    const d = new Date(iso);
    return (
        d.getFullYear() === NOW.getFullYear() &&
        d.getMonth() === NOW.getMonth() &&
        d.getDate() === NOW.getDate()
    );
}

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

function isThisWeek(iso: string): boolean {
    const d = new Date(iso);
    const startOfWeek = new Date(NOW);
    const day = NOW.getDay(); // 0 = Sunday
    startOfWeek.setDate(NOW.getDate() - ((day + 6) % 7)); // Monday
    startOfWeek.setHours(0, 0, 0, 0);
    return d >= startOfWeek && d <= NOW;
}

function isLastWeek(iso: string): boolean {
    const d = new Date(iso);
    const day = NOW.getDay();
    const startOfThisWeek = new Date(NOW);
    startOfThisWeek.setDate(NOW.getDate() - ((day + 6) % 7));
    startOfThisWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);
    const endOfLastWeek = new Date(startOfThisWeek.getTime() - 1); 

    return d >= startOfLastWeek && d <= endOfLastWeek;
}

function isThisMonth(iso: string): boolean {
    const d = new Date(iso);
    return d.getFullYear() === NOW.getFullYear() && d.getMonth() === NOW.getMonth();
}

function isLastMonth(iso: string): boolean {
    const d = new Date(iso);
    const lastMonth = new Date(NOW.getFullYear(), NOW.getMonth() - 1, 1);
    return d.getFullYear() === lastMonth.getFullYear() && d.getMonth() === lastMonth.getMonth();
}

function countByDocMatcher(
    txns: Transaction[],
    match: (d: { documentType: string }) => boolean,
    pred: (t: Transaction) => boolean
): number {
    return txns.filter(t => pred(t) && t.requestedDocuments.some(match)).length;
}

const isTaxDeclarationDoc = (d: { documentType: string }) =>
    d.documentType.toLowerCase().includes('tax declaration');
const isLandholdingDoc = (d: { documentType: string }) =>
    d.documentType === 'Certificate of Landholding' ||
    d.documentType === 'Certificate of Land Holding';
const isNoLandholdingDoc = (d: { documentType: string }) =>
    d.documentType === 'Certificate of No Landholding' ||
    d.documentType === 'Certificate of No Land Holding';

function releaseDateOf(t: Transaction): string {
    return t.releasedAt ?? t.dateReleased ?? t.dateRequested;
}

function formatReleaseDate(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const datePart = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    if (!hasTimeComponent(iso)) return datePart;
    return datePart + ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function computeTrend(current: number, previous: number, comparedTo: string): TrendInfo {
    if (previous === 0) {
        return { direction: current > 0 ? 'up' : 'down', percentage: current > 0 ? 100 : 0, comparedTo };
    }
    const pct = Math.round(((current - previous) / previous) * 100);
    return { direction: pct >= 0 ? 'up' : 'down', percentage: Math.abs(pct), comparedTo };
}

function buildWeeklyTrend(all: Transaction[], released: Transaction[]): WeeklyTrendPoint[] {
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


export function useReportsAnalytics(documentType: DocumentTypeFilterValue = 'All'): ReportsAnalyticsData {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fetchedAt, setFetchedAt] = useState<Date | null>(null);
    const [refetchToken, setRefetchToken] = useState(0);
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

    const data = useMemo((): Omit<ReportsAnalyticsData, 'loading' | 'isRefreshing' | 'error' | 'refetch' | 'fetchedAt'> => {
        const filtered = transactions.filter(t => matchesDocumentType(t.referenceNumber, documentType));
        const released = filtered.filter(t => t.status === 'Released');
        const voided = filtered.filter(t => t.status === 'Void');
        const archived = filtered.filter(t => t.status === 'Archived');
        const pending = filtered.filter(t =>
            t.statusRaw === 'PENDING_PAYMENT' ||
            (!t.statusRaw && t.status === 'Pending')
        );
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
        const tdToday = countByDocMatcher(released, isTaxDeclarationDoc, t => isToday(releaseDateOf(t)));
        const tdWeek = countByDocMatcher(released, isTaxDeclarationDoc, t => isThisWeek(releaseDateOf(t)));
        const tdMonth = countByDocMatcher(released, isTaxDeclarationDoc, t => isThisMonth(releaseDateOf(t)));
        const lhToday = countByDocMatcher(released, isLandholdingDoc, t => isToday(releaseDateOf(t)));
        const lhWeek = countByDocMatcher(released, isLandholdingDoc, t => isThisWeek(releaseDateOf(t)));
        const lhMonth = countByDocMatcher(released, isLandholdingDoc, t => isThisMonth(releaseDateOf(t)));
        const nlhToday = countByDocMatcher(released, isNoLandholdingDoc, t => isToday(releaseDateOf(t)));
        const nlhWeek = countByDocMatcher(released, isNoLandholdingDoc, t => isThisWeek(releaseDateOf(t)));
        const nlhMonth = countByDocMatcher(released, isNoLandholdingDoc, t => isThisMonth(releaseDateOf(t)));
        const reprintedCount = filtered.reduce((sum, t) =>
            sum + t.requestedDocuments.reduce((s, d) => s + (d.reprintCount || 0), 0), 0
        );
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

        const weeklyTrend = buildWeeklyTrend(filtered, released);

        const isDocType = (d: { documentType: string }, name: string) => d.documentType === name;
        const tdCount = released.filter(t => t.requestedDocuments.some(d => isDocType(d, 'Tax Declaration'))).length;
        const lhCount = released.filter(t => t.requestedDocuments.some(d =>
            isDocType(d, 'Certificate of Landholding') || isDocType(d, 'Certificate of Land Holding')
        )).length;
        const nlhCount = released.filter(t => t.requestedDocuments.some(d =>
            isDocType(d, 'Certificate of No Landholding') || isDocType(d, 'Certificate of No Land Holding')
        )).length;
        const totalDocs = tdCount + lhCount + nlhCount || 1; 

        const documentDistribution: DocumentDistributionSlice[] = [
            { label: 'Tax Declaration', count: tdCount, percentage: Math.round((tdCount / totalDocs) * 100), color: 'primary' },
            { label: 'Certificate of Land Holding', count: lhCount, percentage: Math.round((lhCount / totalDocs) * 100), color: 'gold' },
            { label: 'Certificate of No Landholding', count: nlhCount, percentage: Math.round((nlhCount / totalDocs) * 100), color: 'red' },
        ];

        const statusChart: StatusChartBar[] = [
            { label: 'RELEASED', count: released.length, color: '#4f46e5' },
            { label: 'ARCHIVED', count: archived.length, color: '#64748b' },
            { label: 'VOIDED', count: voided.length, color: '#ef4444' },
            { label: 'REPRINTED', count: reprintedCount, color: '#06b6d4' },
        ];

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