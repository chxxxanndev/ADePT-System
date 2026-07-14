import { RefreshIcon } from '../../users/components/icons';
import type { AdminTransactionRow } from '../data/dashboardMockData';

interface AdminRecentTransactionsProps {
    rows: AdminTransactionRow[];
    onRefresh: () => void;
    isRefreshing: boolean;
}

export function AdminRecentTransactions({
    rows,
    onRefresh,
    isRefreshing
}: AdminRecentTransactionsProps) {
    
    // Maps document titles to custom styled classes
    const getDocClass = (doc: string) => {
        const d = doc.toLowerCase();
        if (d.includes('tax')) return 'tax-dec';
        if (d.includes('no land')) return 'no-landholding';
        return 'landholding';
    };

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
                            <th>Document</th>
                            <th>Assigned Staff</th>
                            <th>Status</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', color: '#64748B', padding: '24px 0' }}>
                                    No matching transactions found.
                                </td>
                            </tr>
                        ) : (
                            rows.map((row) => (
                                <tr key={row.id}>
                                    <td>
                                        <span className="admin-control-no">{row.controlNo}</span>
                                    </td>
                                    <td>{row.declarant}</td>
                                    <td>
                                        <span className={`admin-doc-badge ${getDocClass(row.document)}`}>
                                            {row.document}
                                        </span>
                                    </td>
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
                    onClick={() => console.log('Expand/view all transactions registry')}
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
