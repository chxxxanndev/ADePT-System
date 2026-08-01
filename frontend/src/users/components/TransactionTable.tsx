import { useState, useMemo } from 'react';
import type { DeclarantGroup } from '../types/transaction';
import { TransactionRow } from './TransactionRow';

interface TransactionTableProps {
    groups: DeclarantGroup[];
    onViewDetails: (group: DeclarantGroup) => void;
    onReprint: (transactionId: string, docId: string) => void;
    onVoidGroup: (group: DeclarantGroup) => void;
    /** Rendered inside the table card, above the column headers — used for
     * the search/filter toolbar so it lives in the same card as the table
     * and pagination, matching PendingPayment's pp-table-card layout. */
    toolbar?: React.ReactNode;
}

interface ColumnDef {
    label: string;
    width: string;
    align?: 'left' | 'center' | 'right';
}

const COLUMNS: ColumnDef[] = [
    { label: 'Reference Number', width: '14%' },
    { label: 'Declarant', width: '12%' },
    { label: 'Requested By', width: '11%' },
    { label: 'Date Requested', width: '10%' },
    { label: 'Assigned Staff', width: '11%' },
    { label: 'OR Number', width: '10%' },
    { label: 'OR Justification', width: '14%' },
    { label: 'Current Status', width: '10%' },
    { label: 'Actions', width: '8%', align: 'center' },
];

const ROWS_PER_PAGE_OPTIONS = [5, 10, 20, 50, 100, 150];

export function TransactionTable({ groups, onViewDetails, toolbar }: TransactionTableProps) {
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [page, setPage] = useState(1);

    const totalPages = Math.max(1, Math.ceil(groups.length / rowsPerPage));
    const currentPage = Math.min(page, totalPages);

    const pageItems = useMemo(() => {
        const start = (currentPage - 1) * rowsPerPage;
        return groups.slice(start, start + rowsPerPage);
    }, [groups, currentPage, rowsPerPage]);

    const handleRowsPerPageChange = (value: number) => {
        setRowsPerPage(value);
        setPage(1);
    };

    return (
        <div className="tr-card">
            {toolbar && <div className="tr-table-toolbar">{toolbar}</div>}

            <div className="tr-table-scroll">
                <table className="tr-table">
                    <thead>
                        <tr>
                            {COLUMNS.map((col) => (
                                <th
                                    key={col.label}
                                    style={{ width: col.width, textAlign: col.align ?? 'left' }}
                                >
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {pageItems.length === 0 ? (
                            <tr>
                                <td className="tr-table-empty" colSpan={COLUMNS.length}>
                                    <strong>No Released Transactions Found</strong>
                                    Try adjusting your search or filters.
                                </td>
                            </tr>
                        ) : (
                            pageItems.map((g) => (
                                <TransactionRow
                                    key={g.declarantName}
                                    group={g}
                                    onViewDetails={onViewDetails}
                                />
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="tr-pagination-footer">
                <div className="tr-pagination-left">
                    <span className="tr-pagination-label">Rows per page:</span>
                    <select
                        className="tr-items-per-page"
                        value={rowsPerPage}
                        onChange={(e) => handleRowsPerPageChange(Number(e.target.value))}
                    >
                        {ROWS_PER_PAGE_OPTIONS.map((n) => (
                            <option key={n} value={n}>{n}</option>
                        ))}
                    </select>
                </div>

                <div className="tr-pagination-center">
                    {groups.length === 0
                        ? '0 of 0'
                        : `${(currentPage - 1) * rowsPerPage + 1}–${Math.min(currentPage * rowsPerPage, groups.length)} of ${groups.length}`}
                </div>

                <div className="tr-pagination-right">
                    <button
                        type="button"
                        className="tr-page-btn-text"
                        disabled={currentPage <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                        Previous
                    </button>
                    <span className="tr-page-current">Page {currentPage} of {totalPages}</span>
                    <button
                        type="button"
                        className="tr-page-btn-text"
                        disabled={currentPage >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}