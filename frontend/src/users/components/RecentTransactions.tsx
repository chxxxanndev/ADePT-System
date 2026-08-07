import { useMemo, useState } from 'react';
import type { BadgeStatus, TransactionRow } from '../types/dashboard';
import { SearchIcon } from './icons';
import { ExpandableText } from './common/ExpandableText';

// Maps every status the registry emits to its badge bg/text pairing.
const STATUS_STYLE: Record<BadgeStatus, string> = {
    'Pending': 'status-gold',
    'For Payment': 'status-gold',
    'Payment Verified': 'status-green',
    'Processing': 'status-blue',
    'Ready for Release': 'status-green',
    'Released': 'status-green',
    'Void': 'status-red',
    'Cancelled': 'status-red',
    'Archived': 'status-gray',
};

interface RecentTransactionsProps {
    // The 5 most-recent rows shown by default when there's no search query.
    rows: TransactionRow[];
    // The FULL transaction dataset (not just the recent 5) — searched
    // against whenever the user types something, so this card behaves
    // like a real connection into the registry rather than a local-only
    // filter over a handful of rows.
    allRows: TransactionRow[];
    onViewAll?: () => void;
    // Deep-link into the Transaction Registry: clicking a row opens the
    // registry pre-filtered to that control number.
    onRowClick?: (controlNumber: string) => void;
    // Pressing Enter in the search box (or clicking the hint line) opens
    // the registry with the current query applied.
    onSearchSubmit?: (query: string) => void;
}

const SEARCH_RESULTS_LIMIT = 8;

export function RecentTransactions({ rows, allRows, onViewAll, onRowClick, onSearchSubmit }: RecentTransactionsProps) {
    const [search, setSearch] = useState('');

    const query = search.trim().toLowerCase();
    const isSearching = query !== '';

    const filteredRows = useMemo(() => {
        if (!isSearching) return rows;

        return allRows
            .filter((row) =>
                row.controlNumber.toLowerCase().includes(query) ||
                row.declarant.toLowerCase().includes(query) ||
                row.document.toLowerCase().includes(query) ||
                row.status.toLowerCase().includes(query) ||
                row.dateTime.toLowerCase().includes(query)
            )
            .slice(0, SEARCH_RESULTS_LIMIT);
    }, [allRows, rows, query, isSearching]);

    const totalMatches = useMemo(() => {
        if (!isSearching) return rows.length;
        return allRows.filter((row) =>
            row.controlNumber.toLowerCase().includes(query) ||
            row.declarant.toLowerCase().includes(query) ||
            row.document.toLowerCase().includes(query) ||
            row.status.toLowerCase().includes(query) ||
            row.dateTime.toLowerCase().includes(query)
        ).length;
    }, [allRows, rows, query, isSearching]);

    return (
        <div className="dashboard-card">
            <div className="dashboard-card-header">
                <div className="dashboard-card-title">
                    {isSearching ? `Search Results (${totalMatches})` : 'Recent Transaction'}
                </div>
                <div className="table-search">
                    <SearchIcon size={13} />
                    <input
                        type="text"
                        placeholder="Search all transactions..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && isSearching) onSearchSubmit?.(search);
                        }}
                    />
                </div>
            </div>

            <div className="transactions-table-wrap">
                <table className="transactions-table">
                    <thead>
                        <tr>
                            <th>Control Number</th>
                            <th>Declarant</th>
                            <th>Status</th>
                            <th>Date &amp; Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRows.map((row) => (
                            <tr
                                key={row.id}
                                onClick={() => onRowClick?.(row.controlNumber)}
                                title="Open in Transaction Registry"
                                className={onRowClick ? 'transactions-table-row--clickable' : undefined}
                            >
                                <td>{row.controlNumber}</td>
                                <td>
                                    <ExpandableText text={row.declarant} />
                                </td>
                                <td>
                                    <span className={`status-badge ${STATUS_STYLE[row.status]}`}>{row.status}</span>
                                </td>
                                <td>{row.dateTime}</td>
                            </tr>
                        ))}
                        {filteredRows.length === 0 && (
                            <tr>
                                <td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: 'var(--db-text-muted)' }}>
                                    No transactions match your search.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isSearching && totalMatches > SEARCH_RESULTS_LIMIT && (
                <p style={{ fontSize: '11px', color: 'var(--db-text-muted)', margin: '8px 0 0', textAlign: 'center' }}>
                    Showing {SEARCH_RESULTS_LIMIT} of {totalMatches} matches —{' '}
                    {onSearchSubmit ? (
                        <a
                            onClick={() => onSearchSubmit(search)}
                            style={{ color: 'var(--db-secondary)', cursor: 'pointer', fontWeight: 700 }}
                        >
                            open the full registry
                        </a>
                    ) : (
                        <span>open the full registry to see all results.</span>
                    )}
                </p>
            )}

            <div className="view-all-link">
                <button type="button" onClick={onViewAll}>View All Transactions →</button>
            </div>
        </div>
    );
}