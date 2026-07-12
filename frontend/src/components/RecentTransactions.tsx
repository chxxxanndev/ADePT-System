import type { BadgeStatus, TransactionRow } from '../types/dashboard';
import { SearchIcon } from './icons';

// Maps every status defined in the official design system's badge table
// to its exact bg/text color pairing.
const STATUS_STYLE: Record<BadgeStatus, string> = {
    'Released': 'status-green',
    'Paid': 'status-green',
    'Verified': 'status-green',
    'Pending Payment': 'status-gold',
    'Pending Verification': 'status-gold',
    'Cancelled': 'status-red',
    'Voided': 'status-red',
    'Archived': 'status-gray',
    'Certified True Copy': 'status-blue',
};

interface RecentTransactionsProps {
    rows: TransactionRow[];
    onViewAll?: () => void;
}

export function RecentTransactions({ rows, onViewAll }: RecentTransactionsProps) {
    return (
        <div className="dashboard-card">
            <div className="dashboard-card-header">
                <div className="dashboard-card-title">Recent Transaction</div>
                <div className="table-search">
                    <SearchIcon size={13} />
                    <input type="text" placeholder="Search..." />
                </div>
            </div>

            <div className="transactions-table-wrap">
                <table className="transactions-table">
                    <thead>
                        <tr>
                            <th>Control Number</th>
                            <th>Declarant</th>
                            <th>Document</th>
                            <th>Status</th>
                            <th>Date &amp; Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.id}>
                                <td>{row.controlNumber}</td>
                                <td>{row.declarant}</td>
                                <td>{row.document}</td>
                                <td>
                                    <span className={`status-badge ${STATUS_STYLE[row.status]}`}>{row.status}</span>
                                </td>
                                <td>{row.dateTime}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="view-all-link">
                <a onClick={onViewAll}>View All Transactions →</a>
            </div>
        </div>
    );
}
