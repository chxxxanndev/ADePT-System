import '../styles/AdminDashboard.css';
import { useAdminDashboard } from '../hooks/useAdminDashboard';
import { AdminSidebar } from '../components/AdminSidebar';
import { AdminHeader } from '../components/AdminHeader';
import { AdminStatsSection } from '../components/AdminStatCard';
import { AdminRecentTransactions } from '../components/AdminRecentTransactions';
import { AdminStaffPerformance } from '../components/AdminStaffPerformance';
import { AdminDocumentDistribution } from '../components/AdminDocumentDistribution';
import { AdminRecentActivity } from '../components/AdminRecentActivity';
import { DashboardFooter } from '../components/AdminDashboardFooter';
import type { User } from '../../auth-folder/types/auth';
import AccountRequest from '../pages/AccountRequest';
import { StaffAccounts } from '../pages/StaffAccounts';
import { RequestQueue } from '../pages/RequestQueue';

// User Icon for Access Requests Header
function ShieldUserIcon({ size = 18 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <circle cx="12" cy="10" r="3" />
            <path d="M7 16c0-2.2 2.2-4 5-4s5 1.8 5 4" />
        </svg>
    );
}

// Link/Chain Icon for Queue Header
function ChainLinkIcon({ size = 18 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
    );
}

interface AdminDashboardProps {
    user: User;
    onLogout: () => void;
}

export function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
    const {
        activeView,
        setActiveView,
        sidebarCollapsed,
        setSidebarCollapsed,
        mobileMenuOpen,
        setMobileMenuOpen,
        searchQuery,
        setSearchQuery,
        dateFilter,

        // Data states
        accessRequests,
        requestQueue,
        transactions,
        staffPerformance,
        activities,

        // Refresh indicators
        refreshingTransactions,
        refreshingPerformance,
        refreshingDistribution,
        refreshingAccessRequests,
        refreshingQueue,

        // Handlers
        refreshTransactions,
        refreshPerformance,
        refreshDistribution,
        refreshAccessRequests,
        refreshQueue
    } = useAdminDashboard();

    return (
        <div className="admin-dashboard-page">
            {/* Mobile backdrop for dismissing the slide-in menu */}
            <div
                className={`mobile-sidebar-backdrop ${mobileMenuOpen ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
            />

            {/* Sidebar */}
            <AdminSidebar
                activeView={activeView}
                onNavigate={setActiveView}
                onLogout={onLogout}
                collapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                mobileOpen={mobileMenuOpen}
                setMobileOpen={setMobileMenuOpen}
            />

           {/* Main Panel */}
            <main className="admin-dashboard-main">
                {/* Header — hidden on Staff Accounts, which has its own search bar */}
                {activeView !== 'staff-accounts' && activeView !== 'request-queue' && (
                    <AdminHeader
                        user={user}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        dateFilter={dateFilter}
                        onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
                    />
                )}

                {/* Content container — everything except the footer lives here */}
                <div className="admin-dashboard-content">
                    {activeView === 'overview' ? (
                        <div className="admin-overview-content">
                            {/* Both stat sections share one box */}
                            <div className="admin-stats-panel">
                                {/* Access Requests cards */}
                                <AdminStatsSection
                                    title="Account Access Requests"
                                    items={accessRequests}
                                    sectionIcon={<ShieldUserIcon />}
                                    onRefresh={refreshAccessRequests}
                                    isRefreshing={refreshingAccessRequests}
                                />

                                {/* Request Queue cards */}
                                <AdminStatsSection
                                    title="Document Request Queue"
                                    items={requestQueue}
                                    sectionIcon={<ChainLinkIcon />}
                                    onRefresh={refreshQueue}
                                    isRefreshing={refreshingQueue}
                                />
                            </div>

                            {/* Split column grids */}
                            <div className="admin-grid-columns">
                                {/* Column 1 (Left): Recent Transactions & Staff Performance */}
                                <div className="admin-column-stack">
                                    <AdminRecentTransactions
                                        rows={transactions}
                                        onRefresh={refreshTransactions}
                                        isRefreshing={refreshingTransactions}
                                    />
                                    <AdminStaffPerformance
                                        items={staffPerformance}
                                        onRefresh={refreshPerformance}
                                        isRefreshing={refreshingPerformance}
                                    />
                                </div>

                                {/* Column 2 (Right): Document Distribution & Recent Activity */}
                                <div className="admin-column-stack">
                                    <AdminDocumentDistribution
                                        onRefresh={refreshDistribution}
                                        isRefreshing={refreshingDistribution}
                                    />
                                    <AdminRecentActivity
                                        activities={activities}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : activeView === 'account-request' ? (
                        <AccountRequest />
                   ) : activeView === 'staff-accounts' ? (
                        <StaffAccounts
                            user={user}
                            onAddStaff={() => console.log('TODO: open add-staff flow')}
                            onManageStaff={(staffId) => console.log('TODO: manage staff', staffId)}
                        />
                    ) : activeView === 'request-queue' ? (
                        <RequestQueue user={user} />
                    ) : (
                        /* Placeholder views for submenu clicks */
                        <div className="admin-placeholder-view">
                            <h2>{activeView.replace(/-/g, ' ').toUpperCase()}</h2>
                            <p>This administrative component is fully prepped and styled. Integrating live API hooks is ongoing.</p>
                            <button className="admin-placeholder-view-btn" onClick={() => setActiveView('overview')}>
                                Back to Overview
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer Section — sibling of content, not nested inside it */}
                <DashboardFooter />
            </main>
        </div>
    );
}