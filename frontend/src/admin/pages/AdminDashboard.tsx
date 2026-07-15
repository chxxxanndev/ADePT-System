import '../styles/AdminDashboard.css';
import { useAdminDashboard } from '../hooks/useAdminDashboard';
import { AdminSidebar } from '../components/AdminSidebar';
import { AdminHeader } from '../components/AdminHeader';
import { AdminStatsSection } from '../components/AdminStatCard';
import { AdminRecentTransactions } from '../components/AdminRecentTransactions';
import { AdminStaffPerformance } from '../components/AdminStaffPerformance';
import { AdminDocumentDistribution } from '../components/AdminDocumentDistribution';
import { AdminRecentActivity } from '../components/AdminRecentActivity';
import logoImg from '../../auth-folder/assets/logo.png';
import type { User } from '../../auth-folder/types/auth';

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

// MapPin Icon for Footer
function MapPinIcon({ size = 14 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
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

            {/* Main Panel Content */}
            <main className="admin-dashboard-main">
                {/* Header */}
                <AdminHeader
                    user={user}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    dateFilter={dateFilter}
                    onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
                />

                {/* Sub-Views Router */}
                {activeView === 'overview' ? (
                    <>
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
                    </>
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

                {/* Footer Section */}
                <footer className="admin-footer">
                    <div className="admin-footer-main">
                        <div className="admin-footer-left">
                            <div className="admin-footer-logo-title">
                                <img src={logoImg} alt="ADePT logo" className="admin-footer-logo" />
                                <span className="admin-footer-title">ADePT</span>
                                <span className="admin-footer-v">v1.0.0</span>
                            </div>
                            <div style={{ paddingLeft: '2px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div>Assessor Document Processing and Tracking System</div>
                                <div className="admin-footer-item">
                                    <span className="admin-footer-icon">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                            <polyline points="22,6 12,13 2,6" />
                                        </svg>
                                    </span>
                                    <span>assessor@zamboangadelnorte.gov.ph</span>
                                </div>
                            </div>
                        </div>

                        <div className="admin-footer-right">
                            <div className="admin-footer-item">
                                <span className="admin-footer-icon">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                                        <line x1="9" y1="22" x2="9" y2="16" />
                                        <line x1="15" y1="22" x2="15" y2="16" />
                                        <line x1="9" y1="16" x2="15" y2="16" />
                                        <path d="M8 6h2v2H8V6z" />
                                        <path d="M14 6h2v2h-2V6z" />
                                        <path d="M8 10h2v2H8v-2z" />
                                        <path d="M14 10h2v2h-2v-2z" />
                                    </svg>
                                </span>
                                <span>Provincial Assessor's Office</span>
                            </div>
                            <div className="admin-footer-item">
                                <span className="admin-footer-icon">
                                    <MapPinIcon size={14} />
                                </span>
                                <span>Province of Zamboanga del Norte</span>
                            </div>
                        </div>
                    </div>
                    <div className="admin-footer-copyright">
                        © 2026 Provincial Government of Zamboanga del Norte, All Rights Reserved.
                    </div>
                </footer>
            </main>
        </div>
    );
}