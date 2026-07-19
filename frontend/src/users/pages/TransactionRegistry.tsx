import { useState, useMemo } from 'react';
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

// Swap this for a live fetch (e.g. requestService.getTransactions()) later —
// the rest of the page only depends on the Transaction[] shape.
const SOURCE_DATA: Transaction[] = mockTransactions;

function toComparableDate(mmddyyyy: string): string {
    // "07/17/2026" -> "2026-07-17" so it can be compared against <input type="date">
    const [m, d, y] = mmddyyyy.split('/');
    return `${y}-${m}-${d}`;
}

export function TransactionRegistry() {
    const [transactions, setTransactions] = useState<Transaction[]>(SOURCE_DATA);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState<TransactionFilters>(DEFAULT_FILTERS);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

    const summary = useMemo(() => computeSummary(transactions), [transactions]);

    const filteredTransactions = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        return transactions.filter((t) => {
            const matchesQuery =
                query === '' ||
                t.referenceNumber.toLowerCase().includes(query) ||
                t.client.declarantName.toLowerCase().includes(query) ||
                t.client.requestedBy.toLowerCase().includes(query) ||
                t.property.taxDeclarationNo.toLowerCase().includes(query);

            const matchesStatus = filters.status === 'All' || t.status === filters.status;

            const matchesDocType =
                filters.documentType === 'All' || t.requestedDocuments.includes(filters.documentType);

            const requestDate = toComparableDate(t.dateRequested);
            const matchesDateFrom = !filters.dateFrom || requestDate >= filters.dateFrom;
            const matchesDateTo = !filters.dateTo || requestDate <= filters.dateTo;

            return matchesQuery && matchesStatus && matchesDocType && matchesDateFrom && matchesDateTo;
        });
    }, [transactions, searchQuery, filters]);

    const handleResetFilters = () => setFilters(DEFAULT_FILTERS);

    const handleViewClientHistory = (declarantName: string) => {
        setSearchQuery(declarantName);
        setFilters(DEFAULT_FILTERS);
        setSelectedTransaction(null);
    };

    const handlePrint = (transaction: Transaction) => {
        // Placeholder — later this triggers the print template/service.
        alert(`Printing ${transaction.referenceNumber}...`);
    };

    const handleGeneratePdf = (transaction: Transaction) => {
        // Placeholder — later this calls the document generation service.
        alert(`Generating PDF for ${transaction.referenceNumber}...`);
    };

    const handleVoid = (transaction: Transaction) => {
        if (confirm(`Void transaction ${transaction.referenceNumber}? This cannot be undone.`)) {
            setTransactions((prev) =>
                prev.map((t) => (t.id === transaction.id ? { ...t, status: 'Void', isVoid: true } : t))
            );
        }
    };

    const handleArchive = (transaction: Transaction) => {
        if (confirm(`Move ${transaction.referenceNumber} to Archive?`)) {
            setTransactions((prev) =>
                prev.map((t) => (t.id === transaction.id ? { ...t, status: 'Archived' } : t))
            );
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

            <SummaryCards summary={summary} />

            <div className="tr-toolbar">
                <SearchBar value={searchQuery} onChange={setSearchQuery} />
                <FilterBar filters={filters} onChange={setFilters} onReset={handleResetFilters} />
            </div>

            <TransactionTable
                transactions={filteredTransactions}
                onViewDetails={setSelectedTransaction}
                onPrint={handlePrint}
                onGeneratePdf={handleGeneratePdf}
                onVoid={handleVoid}
                onArchive={handleArchive}
            />

            {selectedTransaction && (
                <TransactionDetails
                    transaction={selectedTransaction}
                    onClose={() => setSelectedTransaction(null)}
                    onViewClientHistory={handleViewClientHistory}
                />
            )}
        </div>
    );
}
