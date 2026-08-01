import { useState, useMemo, useEffect } from 'react';
import { RegistrySummarySkeleton, RegistryToolbarSkeleton, RegistryTableSkeleton } from '../components/common/Skeleton';
import type { Transaction, TransactionFilters, DeclarantGroup } from '../types/transaction';
import { computeSummary } from '../data/mockTransactions';
import { fetchTransactionRegistry, voidTransaction } from '../services/transactionService';
import { recordReprint, mergeReprintCounts } from '../services/reprintStore';
import { SummaryCards } from '../components/SummaryCards';
import { SearchBar } from '../components/SearchBar';
import { FilterBar } from '../components/FilterBar';
import { TransactionTable } from '../components/TransactionTable';
import { TransactionDetails } from './TransactionDetails';
import { VoidDocumentSelectModal } from '../components/DocumentSelectModal';
import type { User } from '../../auth-folder/types/auth';
import type { VoidAmendRecord } from './VoidAndAmend';
import '../styles/TransactionRegistry.css';

// Legend icons — same shapes/colors as the reference-number pills in
// TransactionRow.tsx, so the key at the top of the page matches what's
// actually rendered in the table below.
const RefreshIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>;
const LandholdingIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11 12 3l9 8" /><path d="M5 10v10h14V10" /></svg>;
const NoLandholdingIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><line x1="6" y1="18" x2="18" y2="6" /></svg>;
const TaxDeclarationIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2h9l3 3v17H6z" /><line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="15" y2="17" /></svg>;

const DEFAULT_FILTERS: TransactionFilters = {
    status: 'Released',
    documentType: 'All',
    dateFrom: '',
    dateTo: '',
};

function toComparableDate(mmddyyyy: string): string {
    const [m, d, y] = mmddyyyy.split('/');
    return `${y}-${m}-${d}`;
}

// The registry only ever shows Released transactions, so dateReleased should
// always be populated by the time a row lands here — but fall back to
// dateRequested for any older/incompletely-migrated backend rows rather than
// crashing on a missing date or silently sorting them as "oldest".
function getReleaseSortDate(t: Transaction): string {
    return t.dateReleased || t.dateRequested;
}

interface TransactionRegistryProps {
    user: User; // still needed to populate actionedBy
    onNavigateToVoidAmend: (newVoidedItems: VoidAmendRecord[]) => void;
    initialSearchQuery?: string;
}

export function TransactionRegistry({ user, onNavigateToVoidAmend, initialSearchQuery }: TransactionRegistryProps) {

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState(initialSearchQuery ?? '');
    const [filters, setFilters] = useState<TransactionFilters>(DEFAULT_FILTERS);
    const [selectedGroup, setSelectedGroup] = useState<DeclarantGroup | null>(null);
    const [voidGroupTarget, setVoidGroupTarget] = useState<DeclarantGroup | null>(null);

    useEffect(() => {
        if (initialSearchQuery !== undefined) {
            setSearchQuery(initialSearchQuery);
        }
    }, [initialSearchQuery]);

    const loadTransactions = async (isManualRefresh = false) => {
        if (isManualRefresh) setIsRefreshing(true);
        else setIsLoading(true);
        setLoadError(null);
        try {
            const data = await fetchTransactionRegistry();
            // Overlay persisted reprint counts (see reprintStore.ts) since the
            // backend response always comes back with reprintCount: 0.
            setTransactions(mergeReprintCounts(data));
        } catch (err) {
            setLoadError(err instanceof Error ? err.message : 'Failed to load transactions.');
            setTransactions([]);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        loadTransactions();
    }, []);

    const releasedTransactions = useMemo(
        () => transactions.filter((t) => t.status === 'Released'),
        [transactions]
    );

    const summary = useMemo(() => computeSummary(releasedTransactions), [releasedTransactions]);

    const filteredTransactions = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return releasedTransactions.filter((t) => {
            const matchesQuery = query === '' ||
                t.referenceNumber.toLowerCase().includes(query) ||
                t.client.declarantName.toLowerCase().includes(query);

            const hasReprint = t.requestedDocuments.some((d) => d.reprintCount > 0);
            const matchesStatus = filters.status === 'Released' ? true : hasReprint;

            const matchesDocType = filters.documentType === 'All' ||
                t.requestedDocuments.some((d) => d.documentType === filters.documentType);

            const requestDate = toComparableDate(t.dateRequested);
            const matchesDateFrom = !filters.dateFrom || requestDate >= filters.dateFrom;
            const matchesDateTo = !filters.dateTo || requestDate <= filters.dateTo;

            return matchesQuery && matchesStatus && matchesDocType && matchesDateFrom && matchesDateTo;
        });
    }, [releasedTransactions, searchQuery, filters]);

    const declarantGroups = useMemo<DeclarantGroup[]>(() => {
        const map = new Map<string, Transaction[]>();
        for (const t of filteredTransactions) {
            const key = t.client.declarantName;
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(t);
        }
        return Array.from(map.entries())
            .map(([declarantName, txns]) => ({
                declarantName,
                // Latest-released first within each declarant's own group.
                transactions: [...txns].sort(
                    (a, b) => new Date(toComparableDate(getReleaseSortDate(b))).getTime() -
                              new Date(toComparableDate(getReleaseSortDate(a))).getTime()
                ),
            }))
            // And groups themselves ordered by whichever declarant had the
            // most recently released document, so the whole table reads
            // latest-release-on-top, oldest-release-on-bottom.
            .sort(
                (a, b) => new Date(toComparableDate(getReleaseSortDate(b.transactions[0]))).getTime() -
                          new Date(toComparableDate(getReleaseSortDate(a.transactions[0]))).getTime()
            );
    }, [filteredTransactions]);

    const handleReprint = (transactionId: string, docId: string) => {
        const actor = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User';
        // Persist the reprint so CertifiedTrueCopy.tsx (and this view, on
        // reload) can see it — see reprintStore.ts for why this can't just
        // live in this component's local state.
        const newCount = recordReprint(docId, actor);

        setTransactions((prev) => prev.map((t) => {
            if (t.id !== transactionId) return t;
            return {
                ...t,
                requestedDocuments: t.requestedDocuments.map((d) =>
                    d.id === docId ? { ...d, reprintCount: newCount } : d
                ),
            };
        }));
    };

    const handleVoidGroup = (group: DeclarantGroup) => setVoidGroupTarget(group);

    // ─── modified: persist to backend first, then navigate with state ──
    const confirmVoidGroup = async (transactionIds: string[], reason: string) => {
        const idSet = new Set(transactionIds);
        const voidedTransactions = transactions.filter(t => idSet.has(t.id));

        try {
            // Persist the void to the backend for every selected transaction
            // BEFORE navigating away — otherwise VoidAndAmend's refetch won't
            // find these as Void status.
            await Promise.all(transactionIds.map((id) => voidTransaction(id, reason)));
        } catch (err) {
            console.error('Failed to void transaction(s):', err);
            alert('Failed to void the selected transaction(s). Please try again.');
            // Re-throw so VoidDocumentSelectModal's isSubmitting state can
            // recover (its handleConfirm awaits this function and only
            // clears the spinner in a catch block) — without this, the
            // confirm button would be stuck showing "Voiding…" forever
            // after a failed request, since success is the only path that
            // normally closes/unmounts the modal.
            throw err;
        }

        // Update local status (UI feedback)
        setTransactions((prev) =>
            prev.map((item) =>
                idSet.has(item.id) ? { ...item, status: 'Void', voidReason: reason } : item
            )
        );

        // Build VoidAmendRecord objects
        const now = new Date().toISOString();
        const actionedBy = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User';

        const voidedRecords = voidedTransactions.map((t) => ({
            id: `void-${t.id}-${Date.now()}`,
            reference: t.referenceNumber,
            declarantName: t.client.declarantName,
            documentType: t.requestedDocuments.map(d => d.documentType).join(', ') || 'N/A',
            actionType: 'void' as const,
            detail: reason || 'Voided from registry',
            actionedBy,
            actionedAt: now,
        }));

        setVoidGroupTarget(null);

        // Navigate to Void and Amend view with the new records
        onNavigateToVoidAmend(voidedRecords);
    };

    return (
        <div className="tr-page">
            <div className="tr-header-card">
                <div className="tr-header-top">
                    <div className="tr-header-titles">
                        <h2>Transaction Registry</h2>
                        <p>Manage and monitor all released document requests.</p>
                    </div>
                    <button
                        className={`tr-refresh-btn${isRefreshing ? ' is-spinning' : ''}`}
                        onClick={() => loadTransactions(true)}
                        title="Refresh registry"
                        aria-label="Refresh registry"
                    >
                        <RefreshIcon />
                    </button>
                </div>

                {isLoading ? (
                    <RegistrySummarySkeleton />
                ) : (
                    <>
                        <SummaryCards summary={summary} />
                        <div className="tr-legend-row">
                            <div className="tr-legend-item tr-legend-item--lh"><LandholdingIcon />Land Holding</div>
                            <div className="tr-legend-item tr-legend-item--nlh"><NoLandholdingIcon />No Landholding</div>
                            <div className="tr-legend-item tr-legend-item--td"><TaxDeclarationIcon />Tax Declaration</div>
                        </div>
                    </>
                )}
            </div>

            {isLoading ? (
                <div className="tr-lazy-load">
                    <RegistryToolbarSkeleton />
                    <RegistryTableSkeleton />
                </div>
            ) : loadError ? (
                <div className="tr-card" style={{ padding: '32px', textAlign: 'center', color: '#B0281C' }}>
                    <p style={{ margin: '0 0 12px', fontWeight: 600 }}>{loadError}</p>
                    <button className="tr-filter-reset" onClick={() => loadTransactions()}>Retry</button>
                </div>
            ) : (
                <TransactionTable
                    groups={declarantGroups}
                    onViewDetails={setSelectedGroup}
                    onReprint={handleReprint}
                    onVoidGroup={handleVoidGroup}
                    toolbar={
                        <>
                            <div className="tr-search-wrapper">
                                <SearchBar value={searchQuery} onChange={setSearchQuery} />
                            </div>
                            <FilterBar
                                filters={filters}
                                onChange={setFilters}
                                onReset={() => setFilters(DEFAULT_FILTERS)}
                            />
                        </>
                    }
                />
            )}

            {selectedGroup && (
                <TransactionDetails
                    group={selectedGroup}
                    onClose={() => setSelectedGroup(null)}
                    onReprint={handleReprint}
                    onVoid={(t) => setVoidGroupTarget({ declarantName: selectedGroup.declarantName, transactions: [t] })}
                    onVoidAll={() => setVoidGroupTarget(selectedGroup)}
                />
            )}

            <VoidDocumentSelectModal
                open={!!voidGroupTarget}
                group={voidGroupTarget}
                onClose={() => setVoidGroupTarget(null)}
                onConfirm={confirmVoidGroup}
            />
        </div>
    );
}