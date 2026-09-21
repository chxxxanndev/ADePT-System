import { useState, useMemo, useEffect } from 'react';
import { RegistrySummarySkeleton, RegistryTableSkeleton } from '../components/common/Skeleton';
import type { Transaction, TransactionFilters, DeclarantGroup } from '../types/transaction';
import { fetchTransactionRegistry, voidTransaction, createReprint } from '../services/transactionService';
import { addAdminAuditEntry } from '../../admin/services/auditLogService';
import { SummaryCards } from '../components/SummaryCards';
import { SearchBar } from '../components/SearchBar';
import { FilterBar } from '../components/FilterBar';
import { TransactionTable } from '../components/TransactionTable';
import { TransactionDetails } from './TransactionDetails';
import { VoidDocumentSelectModal } from '../components/DocumentSelectModal';
import type { User } from '../../auth-folder/types/auth';
import type { VoidAmendRecord } from './VoidAndAmend';
import '../styles/TransactionRegistry.css';
import { getDocPillMeta, getDocumentTypeFromReference, matchesDocumentType } from '../../utils/documentType';

const TaxDeclarationIcon = getDocPillMeta('Tax Declaration').Icon;
const LandholdingIcon = getDocPillMeta('Landholding').Icon;
const NoLandholdingIcon = getDocPillMeta('No Land Holding').Icon;
const RefreshIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>;

const DEFAULT_FILTERS: TransactionFilters = {
    dateFrom: '',
    dateTo: '',
    documentType: 'All',
};

function toComparableDate(dateStr: string): string {
    let d: Date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [y, m, day] = dateStr.split('-').map(Number);
        d = new Date(y, m - 1, day);
    } else {
        d = new Date(dateStr); 
    }
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getReleaseSortDate(t: Transaction): string {
    return t.dateReleased || t.dateRequested;
}

interface TransactionRegistryProps {
    user: User; 
    onNavigateToVoidAmend: (newVoidedItems: VoidAmendRecord[]) => void;
    onNavigateToReprint?: () => void;          // NEW — wire from parent/router
    onNavigateToPendingRequests?: () => void;  // NEW — wire from parent/router
    onNavigateToPendingPayment?: () => void;   // NEW — where "Reprint & Proceed" redirects
    onNavigateToArchive?: () => void;          // breadcrumb → Archive Management
    onNavigateToDashboard?: () => void;        // breadcrumb → Dashboard
    initialSearchQuery?: string;
}

export function TransactionRegistry({
    user,
    onNavigateToVoidAmend,
    onNavigateToReprint,
    onNavigateToPendingRequests,
    onNavigateToPendingPayment,
    onNavigateToArchive,
    onNavigateToDashboard,
    initialSearchQuery,
}: TransactionRegistryProps) {

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
            setTransactions(data);  
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
        () => transactions.filter((t) => t.status === 'Released' && !/-R\d+$/.test(t.referenceNumber)),
        [transactions]
    );

    const summaryChips = useMemo(() => {
        const today = new Date();
        const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        let releasedToday = 0;
        let taxDeclarations = 0;
        let landholdings = 0;
        let noLandholdings = 0;

        for (const t of releasedTransactions) {
            if (toComparableDate(getReleaseSortDate(t)) === todayKey) releasedToday++;

            const meta = getDocPillMeta(
                getDocumentTypeFromReference(t.referenceNumber) ??
                t.requestedDocuments[0]?.documentType ??
                ''
            );
            if (meta.className === 'tr-doc-pill--td') taxDeclarations++;
            else if (meta.className === 'tr-doc-pill--lh') landholdings++;
            else if (meta.className === 'tr-doc-pill--nlh') noLandholdings++;
        }

        return { total: releasedTransactions.length, releasedToday, taxDeclarations, landholdings, noLandholdings };
    }, [releasedTransactions]);

    const transactionsByRef = useMemo(() => {
        const map = new Map<string, Transaction>();
        for (const t of transactions) map.set(t.referenceNumber, t);
        return map;
    }, [transactions]);

    const filteredTransactions = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return releasedTransactions.filter((t) => {
            const matchesQuery = query === '' ||
                t.referenceNumber.toLowerCase().includes(query) ||
                t.client.declarantName.toLowerCase().includes(query) ||
                t.client.requestedBy.toLowerCase().includes(query) ||
                (t.assignedStaff ?? '').toLowerCase().includes(query) ||
                (t.releasedBy ?? '').toLowerCase().includes(query) ||
                (t.payment?.orNumber ?? '').toLowerCase().includes(query) ||
                (t.payment?.orJustification ?? '').toLowerCase().includes(query);

            const requestDate = toComparableDate(getReleaseSortDate(t));
            const matchesDateFrom = !filters.dateFrom || requestDate >= filters.dateFrom;
            const matchesDateTo = !filters.dateTo || requestDate <= filters.dateTo;
            const matchesDocType = matchesDocumentType(t.referenceNumber, filters.documentType ?? 'All');

            return matchesQuery && matchesDateFrom && matchesDateTo && matchesDocType;
        });
    }, [releasedTransactions, searchQuery, filters]);

    const declarantGroups = useMemo<DeclarantGroup[]>(() => {
        const map = new Map<string, Transaction[]>();
        for (const t of filteredTransactions) {
            const key = `${t.client.requestedBy || 'Unknown'}||${getReleaseSortDate(t)}`;
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(t);
        }
        return Array.from(map.entries())
            .map(([, txns]) => ({
                declarantName: txns[0].client.requestedBy,
                transactions: [...txns].sort(
                    (a, b) => new Date(toComparableDate(getReleaseSortDate(b))).getTime() -
                        new Date(toComparableDate(getReleaseSortDate(a))).getTime()
                ),
            }))
            .sort(
                (a, b) => new Date(toComparableDate(getReleaseSortDate(b.transactions[0]))).getTime() -
                    new Date(toComparableDate(getReleaseSortDate(a.transactions[0]))).getTime()
            );
    }, [filteredTransactions]);


    const handleReprint = async (transactionId: string, docId: string) => {
        const reprint = await createReprint(transactionId, docId);
        addAdminAuditEntry({
            type: 'document_reprinted',
            description: `Reprinted document — Ref# ${reprint?.reference_number || reprint?.referenceNumber || 'N/A'}`,
            details: {
                Declarant: reprint?.declarant_name || reprint?.declarantName || 'N/A',
            },
        }).catch(() => { });
        onNavigateToPendingPayment?.();
    };

    const handleVoidGroup = (group: DeclarantGroup) => setVoidGroupTarget(group);

    const confirmVoidGroup = async (transactionIds: string[], reason: string) => {
        const idSet = new Set(transactionIds);
        const voidedTransactions = transactions.filter(t => idSet.has(t.id));

        try {

            await Promise.all(transactionIds.map((id) => voidTransaction(id, reason)));
        } catch (err) {
            console.error('Failed to void transaction(s):', err);
            alert('Failed to void the selected transaction(s). Please try again.');
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
            <div className="tr-header">
    
                <nav className="tr-breadcrumb" aria-label="Breadcrumb">
                    <button
                        type="button"
                        className="tr-breadcrumb-item--link"
                        onClick={onNavigateToDashboard}
                    >
                        Dashboard
                    </button>
                    <span className="tr-breadcrumb-sep">&gt;</span>
                    <button
                        type="button"
                        className="tr-breadcrumb-item--link"
                        onClick={onNavigateToPendingRequests}
                    >
                        Document Request
                    </button>
                    <span className="tr-breadcrumb-sep">&gt;</span>
                    <button
                        type="button"
                        className="tr-breadcrumb-item--link"
                        onClick={onNavigateToPendingPayment}
                    >
                        Pending Requests
                    </button>
                    <span className="tr-breadcrumb-sep">&gt;</span>
                    <span className="tr-breadcrumb-item--current">
                        Transaction Registry
                    </span>
                    <span className="tr-breadcrumb-sep">&gt;</span>
                    <button
                        type="button"
                        className="tr-breadcrumb-item--link"
                        onClick={onNavigateToArchive ?? (() => {})}
                    >
                        Archive Management
                    </button>
                </nav>

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
                        <span className="refresh-btn-label">Refresh</span>
                    </button>
                </div>

                <div className="tr-tabs" role="tablist" aria-label="Transaction sections">
                    <button
                        type="button"
                        className="tr-tab tr-tab--active"
                        aria-current="page"
                    >
                        Transaction Registry
                    </button>
                    <button
                        type="button"
                        className="tr-tab"
                        onClick={onNavigateToReprint ?? (() => { })}
                    >
                        Reprint/CTC
                    </button>
                    <button
                        type="button"
                        className="tr-tab"
                        onClick={() => onNavigateToVoidAmend([])}
                    >
                        Void &amp; Amend
                    </button>
                </div>

                {isLoading ? (
                    <RegistrySummarySkeleton />
                ) : (
                    <>
                    <SummaryCards
                        total={summaryChips.total}
                        releasedToday={summaryChips.releasedToday}
                        taxDeclarations={summaryChips.taxDeclarations}
                        landholdings={summaryChips.landholdings}
                        noLandholdings={summaryChips.noLandholdings}
                    />
                        <div className="tr-legend-row">
                            <div className="tr-legend-item tr-legend-item--td"><TaxDeclarationIcon />Tax Declaration</div>
                            <div className="tr-legend-item tr-legend-item--lh"><LandholdingIcon />Landholding</div>
                            <div className="tr-legend-item tr-legend-item--nlh"><NoLandholdingIcon />No Landholding</div>
                        </div>
                    </>
                )}
            </div>

            {isLoading ? (
                <RegistryTableSkeleton />
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
                    transactionsByRef={transactionsByRef}
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