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
import { AdminReports } from '../pages/AdminReports';
import { AdminAuditLog } from '../pages/AdminAuditLog';
import { useOnlinePresence } from '../services/useOnlinePresence';
import { AdminAccountSettings } from '../pages/AdminAccountSettings';
import { AboutADePT } from '../../users/pages/AboutADePT';

function ShieldUserIcon({ size = 18 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <circle cx="12" cy="10" r="3" />
            <path d="M7 16c0-2.2 2.2-4 5-4s5 1.8 5 4" />
        </svg>
    );
}

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
    useOnlinePresence(user);

    const {
        activeView,
        setActiveView,
        sidebarCollapsed,
        setSidebarCollapsed,
        mobileMenuOpen,
        setMobileMenuOpen,
        dateFilter,
        applyDateFilter,

        accessRequests,
        pendingRequestCount,
        requestQueue,
        transactions,
        distribution,
        staffPerformance,
        allTimeStaffPerformance,
        activities,

        refreshingTransactions,
        refreshingPerformance,
        refreshingDistribution,
        refreshingAccessRequests,
        refreshingQueue,

        refreshTransactions,
        refreshPerformance,
        refreshDistribution,
        refreshAccessRequests,
        refreshQueue
    } = useAdminDashboard();

    return (
        <div className="admin-dashboard-page">
            <div
                className={`mobile-sidebar-backdrop ${mobileMenuOpen ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
            />

            <AdminSidebar
                activeView={activeView}
                onNavigate={setActiveView}
                onLogout={onLogout}
                collapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                mobileOpen={mobileMenuOpen}
                setMobileOpen={setMobileMenuOpen}
                accountRequestCount={pendingRequestCount}
            />

            <main className="admin-dashboard-main">
                {activeView !== 'account-request' && activeView !== 'staff-accounts' && activeView !== 'request-queue' && activeView !== 'reports-analytics' && activeView !== 'audit-log' && activeView !== 'settings' && activeView !== 'about-adept' && (
                    <AdminHeader
                        user={user}
                        dateFilter={dateFilter}
                        onDateFilterChange={applyDateFilter}
                        onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
                        onProfileClick={() => setActiveView('settings')}
                    />
                )}

                <div className="admin-dashboard-content">
                    {activeView === 'overview' ? (
                        <div className="admin-overview-content">
                            <AdminStatsSection
                                title="Account Access Requests"
                                items={accessRequests}
                                sectionIcon={<ShieldUserIcon />}
                                onRefresh={refreshAccessRequests}
                                isRefreshing={refreshingAccessRequests}
                            />

                            <AdminStatsSection
                                title="Document Request Queue"
                                items={requestQueue}
                                sectionIcon={<ChainLinkIcon />}
                                onRefresh={refreshQueue}
                                isRefreshing={refreshingQueue}
                            />

                            <div className="admin-grid-columns">
                                <div className="admin-column-stack">
                                    <AdminRecentTransactions
                                        rows={transactions}
                                        onRefresh={refreshTransactions}
                                        isRefreshing={refreshingTransactions}
                                        onViewAll={() => setActiveView('request-queue')}
                                    />
                                    <AdminStaffPerformance
                                        items={staffPerformance}
                                        allTimeItems={allTimeStaffPerformance}
                                        onRefresh={refreshPerformance}
                                        isRefreshing={refreshingPerformance}
                                        onViewFull={() => setActiveView('audit-log')}
                                    />
                                </div>

                                <div className="admin-column-stack">
                                    <AdminDocumentDistribution
                                        slices={distribution}
                                        onRefresh={refreshDistribution}
                                        isRefreshing={refreshingDistribution}
                                    />
                                    <AdminRecentActivity
                                        activities={activities}
                                        onViewFullLog={() => setActiveView('audit-log')}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : activeView === 'account-request' ? (
                        <AccountRequest user={user} />
                    ) : activeView === 'staff-accounts' ? (
                        <StaffAccounts
                            user={user}
                            onAddStaff={() => console.log('TODO: open add-staff flow')}
                            onManageStaff={(staffId) => console.log('TODO: manage staff', staffId)}
                        />
                    ) : activeView === 'request-queue' ? (
                        <RequestQueue user={user} />
                    ) : activeView === 'reports-analytics' ? (
                        <AdminReports user={user} />
                    ) : activeView === 'audit-log' ? (
                        <AdminAuditLog
                            currentUser={{
                                name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                                role: user.role || 'Staff',
                                initials: `${(user.firstName || '')[0] || ''}${(user.lastName || '')[0] || ''}`.toUpperCase(),
                                avatarUrl: user.avatarUrl,
                            }}
                        />
                    ) : activeView === 'settings' ? (
                        <AdminAccountSettings />
                    ) : activeView === 'about-adept' ? (
                        <AboutADePT onNavigateToDashboard={() => setActiveView('overview')} />
                    ) : (
                        <div className="admin-placeholder-view">
                            <h2>{activeView.replace(/-/g, ' ').toUpperCase()}</h2>
                            <p>This administrative component is fully prepped and styled. Integrating live API hooks is ongoing.</p>
                            <button className="admin-placeholder-view-btn" onClick={() => setActiveView('overview')}>
                                Back to Overview
                            </button>
                        </div>
                    )}
                </div>

                <DashboardFooter />
            </main>
        </div>
    );
}