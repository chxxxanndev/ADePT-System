// Refresh icon (matches the spin animation already defined in AdminDashboard.css)
function RefreshIcon({ size = 16 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <polyline points="21 3 21 9 15 9" />
        </svg>
    );
}

// Chain icon reused as the card's section icon (swap for whatever fits)
function ChainLinkIcon({ size = 18 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
    );
}

interface StaffMember {
    initials: string;
    name: string;
    requests: number;
    avatarBg: string;
    avatarText: string;
}

interface AdminStaffPerformanceProps {
    onRefresh?: () => void;
    isRefreshing?: boolean;
}

// --- Placeholder data — wire this up to real API data later ---
const PLACEHOLDER_STAFF: StaffMember[] = [
    { initials: 'ML', name: 'Maria Lopez', requests: 148, avatarBg: '#CFEFEA', avatarText: '#0F7A6E' },
    { initials: 'JC', name: 'John Cruz', requests: 100, avatarBg: '#FDEEB0', avatarText: '#A6790A' },
    { initials: 'AR', name: 'Anne Reyes', requests: 88, avatarBg: '#F9D6CE', avatarText: '#C24A2E' },
    { initials: 'CG', name: 'Carlo Gomez', requests: 54, avatarBg: '#E3D9F7', avatarText: '#6A3FB5' },
];

export function AdminStaffPerformance({ onRefresh, isRefreshing }: AdminStaffPerformanceProps) {
    return (
        <div className="admin-card">
            <div className="admin-card-header">
                <div className="admin-card-title-group">
                    <span className="admin-section-title-icon"><ChainLinkIcon /></span>
                    <span className="admin-card-title">Staff Performance</span>
                </div>
                <div className="admin-card-actions">
                    <button
                        className={`admin-refresh-btn ${isRefreshing ? 'spinning' : ''}`}
                        onClick={onRefresh}
                        aria-label="Refresh staff performance"
                    >
                        <RefreshIcon />
                    </button>
                </div>
            </div>

            <span className="staff-performance-pill">Top Performing Staff</span>

            <div className="staff-list-container">
                {PLACEHOLDER_STAFF.map((staff) => (
                    <div className="staff-performance-item" key={staff.initials}>
                        <div className="staff-perf-left">
                            <div
                                className="staff-perf-avatar"
                                style={{ backgroundColor: staff.avatarBg, color: staff.avatarText }}
                            >
                                {staff.initials}
                            </div>
                            <span className="staff-perf-name">{staff.name}</span>
                        </div>
                        <span className="staff-perf-req-pill">{staff.requests} Request</span>
                    </div>
                ))}
            </div>
        </div>
    );
}