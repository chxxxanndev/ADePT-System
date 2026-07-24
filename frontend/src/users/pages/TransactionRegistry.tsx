import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RegistrySummarySkeleton, RegistryToolbarSkeleton, RegistryTableSkeleton } from '../components/common/Skeleton';
import type { Transaction, TransactionFilters } from '../types/transaction';
import { mockTransactions, computeSummary } from '../data/mockTransactions';
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

const SOURCE_DATA: Transaction[] = mockTransactions;

function toComparableDate(mmddyyyy: string): string {
    const [m, d, y] = mmddyyyy.split('/');
    return `${y}-${m}-${d}`;
}

export function TransactionRegistry() {
    const navigate = useNavigate();

    // --- DATA & LOADING STATES ---
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState<TransactionFilters>(DEFAULT_FILTERS);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

    // --- LAZY LOADING SIMULATION ---
    useEffect(() => {
        const timer = setTimeout(() => {
            setTransactions(SOURCE_DATA);
            setIsLoading(false);
        }, 1500);
        return () => clearTimeout(timer);
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
     */
    const handlePrint = (t: Transaction) => alert(`Printing official copy: ${t.referenceNumber}`);

    const handleEdit = (t: Transaction) => {
        const ref = t.referenceNumber;
        // Logic: Redirect to appropriate encoding form
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
