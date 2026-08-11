import { useState, useMemo } from 'react';
import type { DeclarantGroup } from '../types/transaction';
import { TransactionRow } from './TransactionRow';
import { ADePTSelect } from './ADePTSelect';
import '../styles/select.css';

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

export interface ColumnDef {
    label: string;
    /** Fixed minimum width in px. The registry table keeps these readable
     *  widths and scrolls horizontally when the card can't fit them, instead
     *  of squishing every column into unreadable slivers. */
    width: number;
    align?: 'left' | 'center' | 'right';
}

/* Column layout — fixed px minimums per column so each cell stays
   readable: Reference keeps room for the icon badge, Declarant /
   Requested By / OR Justification host ExpandableText (See more /
   See less) cells, dates stay narrow-but-legible, staff names may wrap,
   OR Number never wraps, Current Status keeps its badge intact, and
   Actions keeps a stable width for the View button. */
export const REGISTRY_COLUMNS: ColumnDef[] = [
    { label: 'Reference Number', width: 175 },
    { label: 'Declarant', width: 200 },
    { label: 'Requested By', width: 150 },
    { label: 'Date & Time Requested', width: 185 },
    { label: 'Date & Time Released', width: 175 },
    { label: 'Assigned Staff', width: 155 },
    { label: 'Releasing Staff', width: 160 },
    { label: 'OR Number', width: 120 },
    { label: 'OR Justification', width: 165 },
    { label: 'Current Status', width: 160, align: 'center' },
    { label: 'Actions', width: 120, align: 'center' },
];

/** Total minimum table width (px) — below this the .tr-table-scroll
 *  container scrolls horizontally. Shared with the loading skeleton so
 *  the ghost table always matches the real one. */
export const REGISTRY_TABLE_MIN_WIDTH = REGISTRY_COLUMNS.reduce(
    (sum, col) => sum + col.width,
    0
);

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
                <table
                    className="tr-table tr-table--registry"
                    style={{ minWidth: REGISTRY_TABLE_MIN_WIDTH }}
                >
                    <thead>
                        <tr>
                            {REGISTRY_COLUMNS.map((col) => (
                                <th
                                    key={col.label}
                                    style={{ width: `${col.width}px`, textAlign: col.align ?? 'left' }}
                                >
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {pageItems.length === 0 ? (
                            <tr>
                                <td className="tr-table-empty" colSpan={REGISTRY_COLUMNS.length}>
                                    <strong>No Released Transactions Found</strong>
                                    Try adjusting your search or filters.
                                </td>
                            </tr>
                        ) : (
                            pageItems.map((g) => (
                                <TransactionRow
                                    key={g.transactions[0].id}
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
                    <ADePTSelect
                        variant="sm"
                        ariaLabel="Rows per page"
                        value={String(rowsPerPage)}
                        onChange={(v) => handleRowsPerPageChange(Number(v))}
                        options={ROWS_PER_PAGE_OPTIONS.map((n) => ({ value: String(n), label: String(n) }))}
                    />
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