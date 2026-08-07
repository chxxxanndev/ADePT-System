import { RefreshIcon } from '../../users/components/icons';
import type { AdminTransactionRow } from '../data/adminTypes';

interface AdminRecentTransactionsProps {
    rows: AdminTransactionRow[];
    onRefresh: () => void;
    isRefreshing: boolean;
    onViewAll: () => void;
}

export function AdminRecentTransactions({
    rows,
    onRefresh,
    isRefreshing,
    onViewAll
}: AdminRecentTransactionsProps) {

    return (
        <div className="admin-card">
            {/* Table Header */}
            <div className="admin-card-header">
                <div className="admin-card-title-group">
                    <span className="recent-transaction-header-pill">Recent Transaction</span>
                </div>
                <button
                    className={`admin-refresh-btn ${isRefreshing ? 'spinning' : ''}`}
                    onClick={onRefresh}
                    title="Refresh Transactions"
                    disabled={isRefreshing}
                >
                    <RefreshIcon size={16} />
                </button>
            </div>

            {/* Scrollable Table View */}
            <div className="admin-table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Control No.</th>
                            <th>Declarant</th>
                            <th>Assigned Staff</th>
                            <th>Status</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={5}>
                                    <div className="admin-empty-state">
                                        No matching transactions found.
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            rows.map((row) => (
                                <tr key={row.id}>
                                    <td>
                                        <span className="admin-control-no">{row.controlNo}</span>
                                    </td>
                                    <td>{row.declarant}</td>
                                    <td>{row.assignedStaff}</td>
                                    <td>
                                        <span className={`admin-status-badge ${row.status.toLowerCase()}`}>
                                            {row.status}
                                        </span>
                                    </td>
                                    <td>{row.date}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Bottom button */}
            <div className="admin-table-footer">
                <button
                    className="admin-view-all-btn"
                    onClick={onViewAll}
                >
                    <span>View All Transaction</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 9l6 6 6-6" />
                    </svg>
                </button>
            </div>
        </div>
    );
}