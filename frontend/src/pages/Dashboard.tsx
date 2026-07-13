import { useState } from 'react';
import '../styles/dashboard.css';
import { Sidebar } from '../components/Sidebar';
import { DashboardHeader, WelcomeBanner } from '../components/DashboardHeader';
import { DashboardFooter } from '../components/DashboardFooter';
import { RequestFormEntry } from './RequestFormEntry'; 
import { DashboardSummary } from '../components/StatCard';
import { AnalyticsOverview } from '../components/AnalyticsOverview';
import { DocumentDistribution } from '../components/DocumentDistribution';
import { RecentTransactions } from '../components/RecentTransactions';
import { QuickActions } from '../components/QuickActions';

import { 
    navSections, 
    operationalSummary, 
    administrativeSummary, 
    weeklyTrend, 
    documentDistribution, 
    totalDocuments, 
    recentTransactions, 
    quickActions 
} from '../data/dashboardMockData';

import type { User } from '../types/auth';

interface DashboardProps {
    user: User;
    onLogout: () => void;
}

export function Dashboard({ user, onLogout }: DashboardProps) {
    const [activeView, setActiveView] = useState('dashboard');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Defensive check: If user is missing, show nothing or a loader
    if (!user) return <div className="white-screen-fix">Loading Session...</div>;

    const handleNavigate = (view: string) => {
        setActiveView(view);
        setMobileMenuOpen(false);
    };

    const fullName = `${user.firstName || ''} ${user.lastName || ''}`;
    const headerUser = {
        name: fullName,
        email: user.email || '',
        role: user.role || 'Staff',
        lastLogin: 'Today • 8:12 AM',
    };

    return (
        <div className="dashboard-page">
            <Sidebar
                sections={navSections}
                activeView={activeView}
                onNavigate={handleNavigate}
                onLogout={onLogout}
                mobileOpen={mobileMenuOpen}
            />

            <div className="dashboard-main">
                <DashboardHeader
                    user={headerUser}
                    userName={fullName}
                    onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
                />

                <div className="dashboard-content">
                    {activeView === 'dashboard' ? (
                        <>
                            <WelcomeBanner />
                            <DashboardSummary title="Operational Summary" items={operationalSummary} iconType="operational" />
                            <DashboardSummary title="Administrative Summary" items={administrativeSummary} iconType="admin" />
                            <div className="dashboard-row">
                                <AnalyticsOverview data={weeklyTrend} lastUpdated="Today • 2:45 PM" />
                                <DocumentDistribution slices={documentDistribution} totalDocuments={totalDocuments} />
                            </div>
                            <div className="dashboard-row">
                                <RecentTransactions rows={recentTransactions} onViewAll={() => setActiveView('transaction-registry')} />
                                <QuickActions actions={quickActions} onSelect={setActiveView} />
                            </div>
                        </>
                    ) : activeView === 'new-request' || activeView === 'request-form' ? (
                        <RequestFormEntry user={user} onCancel={() => setActiveView('dashboard')} />
                    ) : (
                        <div className="placeholder-view" style={{ padding: '40px', textAlign: 'center' }}>
                            <h2>{activeView.toUpperCase()}</h2>
                            <p>Module under development.</p>
                            <button onClick={() => setActiveView('dashboard')}>Return</button>
                        </div>
                    )}
                </div>
                <DashboardFooter />
            </div>
        </div>

    
    );
}