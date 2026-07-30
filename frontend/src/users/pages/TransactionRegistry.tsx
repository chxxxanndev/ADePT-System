import { useState, useMemo, useEffect } from 'react';
import { RegistrySummarySkeleton, RegistryToolbarSkeleton, RegistryTableSkeleton } from '../components/common/Skeleton';
import type { Transaction, TransactionFilters, DeclarantGroup } from '../types/transaction';
import { computeSummary } from '../data/mockTransactions';
import { fetchTransactionRegistry } from '../services/transactionService';
import { SummaryCards } from '../components/SummaryCards';
import { SearchBar } from '../components/SearchBar';
import { FilterBar } from '../components/FilterBar';
import { TransactionTable } from '../components/TransactionTable';
import { TransactionDetails } from './TransactionDetails';
import { VoidDocumentSelectModal } from '../components/DocumentSelectModal';
import type { User } from '../../auth-folder/types/auth';
import type { VoidAmendRecord } from './VoidAndAmend';
import '../styles/TransactionRegistry.css';

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

interface TransactionRegistryProps {
    user: User; // still needed to populate actionedBy
    onNavigateToVoidAmend: (newVoidedItems: VoidAmendRecord[]) => void;
}

export function TransactionRegistry({ user, onNavigateToVoidAmend }: TransactionRegistryProps) {

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState<TransactionFilters>(DEFAULT_FILTERS);
    const [selectedGroup, setSelectedGroup] = useState<DeclarantGroup | null>(null);
    const [voidGroupTarget, setVoidGroupTarget] = useState<DeclarantGroup | null>(null);

    const loadTransactions = async () => {
        setIsLoading(true);
        setLoadError(null);
        try {
            const data = await fetchTransactionRegistry();
            setTransactions(data);
        } catch (err) {
            setLoadError(err instanceof Error ? err.message : 'Failed to load transactions.');
            setTransactions([]);
        } finally {
            setIsLoading(false);
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
                transactions: [...txns].sort(
                    (a, b) => new Date(toComparableDate(b.dateRequested)).getTime() -
                              new Date(toComparableDate(a.dateRequested)).getTime()
                ),
            }))
            .sort(
                (a, b) => new Date(toComparableDate(b.transactions[0].dateRequested)).getTime() -
                          new Date(toComparableDate(a.transactions[0].dateRequested)).getTime()
            );
    }, [filteredTransactions]);

    const handleReprint = (transactionId: string, docId: string) => {
        setTransactions((prev) => prev.map((t) => {
            if (t.id !== transactionId) return t;
            return {
                ...t,
                requestedDocuments: t.requestedDocuments.map((d) =>
                    d.id === docId ? { ...d, reprintCount: d.reprintCount + 1 } : d
                ),
            };
        }));
    };

    const handleVoidGroup = (group: DeclarantGroup) => setVoidGroupTarget(group);

    // ─── modified: navigate with state instead of callback ──
    const confirmVoidGroup = (transactionIds: string[], reason: string) => {
        const idSet = new Set(transactionIds);
        const voidedTransactions = transactions.filter(t => idSet.has(t.id));

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
            <div className="tr-header">
                <div>
                    <h2>Transaction Registry</h2>
                    <p>Manage and monitor all released document requests.</p>
                </div>
            </div>

            {isLoading ? (
                <div className="tr-lazy-load">
                    <RegistrySummarySkeleton />
                    <RegistryToolbarSkeleton />
                    <RegistryTableSkeleton />
                </div>
            ) : loadError ? (
                <div className="tr-card" style={{ padding: '32px', textAlign: 'center', color: '#B0281C' }}>
                    <p style={{ margin: '0 0 12px', fontWeight: 600 }}>{loadError}</p>
                    <button className="tr-filter-reset" onClick={loadTransactions}>Retry</button>
                </div>
            ) : (
                <>
                    <SummaryCards summary={summary} />

                    <div className="tr-toolbar">
                        <div className="tr-search-wrapper">
                            <SearchBar value={searchQuery} onChange={setSearchQuery} />
                        </div>
                        <FilterBar
                            filters={filters}
                            onChange={setFilters}
                            onReset={() => setFilters(DEFAULT_FILTERS)}
                        />
                    </div>

                    <TransactionTable
                        groups={declarantGroups}
                        onViewDetails={setSelectedGroup}
                        onReprint={handleReprint}
                        onVoidGroup={handleVoidGroup}
                    />
                </>
            )}

            {selectedGroup && (
                <TransactionDetails
                    group={selectedGroup}
                    onClose={() => setSelectedGroup(null)}
                    onReprint={handleReprint}
                    onVoid={(t) => setVoidGroupTarget({ declarantName: selectedGroup.declarantName, transactions: [t] })}
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