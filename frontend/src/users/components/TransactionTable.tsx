import { useState, useMemo } from 'react';
import type { Transaction } from '../types/transaction';
import { TransactionRow } from './TransactionRow';

interface TransactionTableProps {
    transactions: Transaction[];
    onViewDetails: (transaction: Transaction) => void;
    onPrint: (transaction: Transaction) => void;
    onIssueCTC: (transaction: Transaction) => void; // New
    onVoid: (transaction: Transaction) => void;
    onEdit: (transaction: Transaction) => void;   // New
    onArchive: (transaction: Transaction) => void;
    onCancel: (transaction: Transaction) => void;  // New
}

const COLUMNS = [
    'Control Number',
    'Declarant',
    'Requested By',
    'Requested Documents',
    'Date Requested',
    'Assigned Staff',
    'Current Status',
    'Actions',
];

const ROWS_PER_PAGE_OPTIONS = [5, 10, 20, 50];

export function TransactionTable({ 
    transactions, 
    onViewDetails, 
    onPrint, 
    onIssueCTC, 
    onVoid, 
    onEdit, 
    onArchive, 
    onCancel 
}: TransactionTableProps) {
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [page, setPage] = useState(1);

    const totalPages = Math.max(1, Math.ceil(transactions.length / rowsPerPage));
    const currentPage = Math.min(page, totalPages);

    const pageItems = useMemo(() => {
        const start = (currentPage - 1) * rowsPerPage;
        return transactions.slice(start, start + rowsPerPage);
    }, [transactions, currentPage, rowsPerPage]);

    const handleRowsPerPageChange = (value: number) => {
        setRowsPerPage(value);
        setPage(1);
    };

    return (
        <>
            <div className="tr-card">
                <table className="tr-table">
                    <thead>
                        <tr>
                            {COLUMNS.map((col) => (
                                <th key={col} style={col === 'Actions' ? { textAlign: 'center' } : undefined}>
                                    {col}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {pageItems.length === 0 ? (
                            <tr>
                                <td className="tr-table-empty" colSpan={COLUMNS.length}>
                                    <strong>No Transactions Found</strong>
                                    Try adjusting your search or filters.
                                </td>
                            </tr>
                        ) : (
                            pageItems.map((t) => (
                                <TransactionRow
                                    key={t.id}
                                    transaction={t}
                                    onViewDetails={onViewDetails}
                                    onPrint={onPrint}
                                    onIssueCTC={onIssueCTC}
                                    onVoid={onVoid}
                                    onEdit={onEdit}
                                    onArchive={onArchive}
                                    onCancel={onCancel}
                                />
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="tr-pagination">
                <div className="tr-pagination-rows">
                    <span>Rows per page:</span>
                    <select
                        value={rowsPerPage}
                        onChange={(e) => handleRowsPerPageChange(Number(e.target.value))}
                    >
                        {ROWS_PER_PAGE_OPTIONS.map((n) => (
                            <option key={n} value={n}>{n}</option>
                        ))}
                    </select>
                </div>

                <span className="tr-pagination-label">
                    {transactions.length === 0
                        ? '0 of 0'
                        : `${(currentPage - 1) * rowsPerPage + 1}–${Math.min(currentPage * rowsPerPage, transactions.length)} of ${transactions.length}`}
                </span>

                <div className="tr-pagination-controls">
                    <button
                        type="button"
                        className="tr-pagination-btn"
                        disabled={currentPage <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                        Previous
                    </button>
                    <span className="tr-pagination-label">Page {currentPage} of {totalPages}</span>
                    <button
                        type="button"
                        className="tr-pagination-btn"
                        disabled={currentPage >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                        Next
                    </button>
                </div>
            </div>
        </>
    );
}