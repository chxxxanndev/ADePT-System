import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RegistrySummarySkeleton, RegistryToolbarSkeleton, RegistryTableSkeleton } from '../components/common/Skeleton';
import type { Transaction, TransactionFilters } from '../types/transaction';
import { computeSummary } from '../data/mockTransactions';
import { fetchTransactionRegistry } from '../services/transactionService';
import { SummaryCards } from '../components/SummaryCards';
import { SearchBar } from '../components/SearchBar';
import { FilterBar } from '../components/FilterBar';
import { TransactionTable } from '../components/TransactionTable';
import { TransactionDetails } from './TransactionDetails';
import '../styles/TransactionRegistry.css';

const DEFAULT_FILTERS: TransactionFilters = {
    status: 'All',
    documentType: 'All',
    dateFrom: '',
    dateTo: '',
};

function toComparableDate(mmddyyyy: string): string {
    const [m, d, y] = mmddyyyy.split('/');
    return `${y}-${m}-${d}`;
}

export function TransactionRegistry() {
    const navigate = useNavigate();

    // --- DATA & LOADING STATES ---
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState<TransactionFilters>(DEFAULT_FILTERS);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

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

    // --- REAL DATA LOAD (replaces the old setTimeout mock-data simulation) ---
    useEffect(() => {
        loadTransactions();
    }, []);

    const summary = useMemo(() => computeSummary(transactions), [transactions]);

    const filteredTransactions = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return transactions.filter((t) => {
            const matchesQuery = query === '' ||
                t.referenceNumber.toLowerCase().includes(query) ||
                t.client.declarantName.toLowerCase().includes(query);
            const matchesStatus = filters.status === 'All' || t.status === filters.status;
            const matchesDocType = filters.documentType === 'All' || t.requestedDocuments.includes(filters.documentType);

            const requestDate = toComparableDate(t.dateRequested);
            const matchesDateFrom = !filters.dateFrom || requestDate >= filters.dateFrom;
            const matchesDateTo = !filters.dateTo || requestDate <= filters.dateTo;

            return matchesQuery && matchesStatus && matchesDocType && matchesDateFrom && matchesDateTo;
        });
    }, [transactions, searchQuery, filters]);

    /** 
     * ACTION HANDLERS (Status-Aware Logic)
     * NOTE: Void/Archive/Cancel below still only update local state — none
     * of these call the backend yet. RequestService currently has no
     * update path for these specific status transitions (releaseRequest()
     * only handles the payment/release step). Wiring these for real is
     * part of the "Void & Amend" workflow in the new feature spec, not
     * this pass.
     */
    const handlePrint = (t: Transaction) => alert(`Printing official copy: ${t.referenceNumber}`);

    const handleEdit = (t: Transaction) => {
        const ref = t.referenceNumber;
        if (t.requestedDocuments.includes('Tax Declaration')) navigate(`/encode/tax-declaration/${ref}`);
        else navigate(`/encode/certification/${ref}`);
    };

    const handleIssueCTC = (t: Transaction) => alert(`Issuing Certified True Copy for ${t.referenceNumber}`);

    const handleVoid = (t: Transaction) => {
        const reason = prompt(`Reason for voiding ${t.referenceNumber}:`);
        if (reason) {
            setTransactions(prev => prev.map(item => item.id === t.id ? { ...item, status: 'Void', voidReason: reason } : item));
        }
    };

    const handleArchive = (t: Transaction) => {
        if (confirm("Move this transaction to Archive?")) {
            setTransactions(prev => prev.map(item => item.id === t.id ? { ...item, status: 'Archived' } : item));
        }
    };

    const handleCancel = (t: Transaction) => {
        if (confirm("Cancel this request?")) {
            setTransactions(prev => prev.map(item => item.id === t.id ? { ...item, status: 'Cancelled' } : item));
        }
    };

    return (
        <div className="tr-page">
            <div className="tr-header">
                <div>
                    <h2>Transaction Registry</h2>
                    <p>Manage and monitor all document requests.</p>
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
                        transactions={filteredTransactions}
                        onViewDetails={setSelectedTransaction}
                        onPrint={handlePrint}
                        onIssueCTC={handleIssueCTC}
                        onVoid={handleVoid}
                        onEdit={handleEdit}
                        onArchive={handleArchive}
                        onCancel={handleCancel}
                    />
                </>
            )}

            {selectedTransaction && (
                <TransactionDetails
                    transaction={selectedTransaction}
                    onClose={() => setSelectedTransaction(null)}
                    onViewClientHistory={(name) => {
                        setSearchQuery(name);
                        setSelectedTransaction(null);
                    }}
                />
            )}
        </div>
    );
}