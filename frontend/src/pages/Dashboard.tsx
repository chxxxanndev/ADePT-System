import { useState } from 'react';
import '../styles/dashboard.css';

import { Sidebar } from '../components/Sidebar';
import { DashboardHeader, WelcomeBanner } from '../components/DashboardHeader';
import { SummarySection } from '../components/StatCard';
import { AnalyticsOverview } from '../components/AnalyticsOverview';
import { DocumentDistribution } from '../components/DocumentDistribution';
import { RecentTransactions } from '../components/RecentTransactions';
import { QuickActions } from '../components/QuickActions';
import { DashboardFooter } from '../components/DashboardFooter';
import { ClipboardListIcon, SettingsIcon } from '../components/icons';

import type { User } from '../types/auth';

import {
    navSections,
    operationalSummary,
    administrativeSummary,
    weeklyTrend,
    documentDistribution,
    totalDocuments,
    recentTransactions,
    quickActions,
} from '../data/dashboardMockData';

interface DashboardProps {
    user: User;
    backendHealthy: boolean | null;
    onLogout: () => void;
}

export function Dashboard({ user, onLogout }: DashboardProps) {
    const [activeView, setActiveView] = useState('dashboard');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleNavigate = (view: string) => {
        setActiveView(view);
        setMobileMenuOpen(false);
        // Wire this up to your router, e.g. navigate(`/${view}`)
    };

    const fullName = `${user.firstName} ${user.lastName}`;

    // DashboardHeader was likely built against the mock UserProfile shape
    // ({ name, email, role, lastLogin }), but real auth only gives us
    // firstName/lastName/email/username. Adapting here until either
    // DashboardHeader is updated to take `User` directly, or the backend
    // starts returning role/lastLogin.
    const headerUser = {
        name: fullName,
        email: user.email,
        role: 'Staff', // placeholder — replace once role comes from backend/auth
        lastLogin: '—', // placeholder — replace once lastLogin is tracked
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

                <WelcomeBanner />

                <div className="dashboard-content">
                    <SummarySection
                        title="Operational Summary"
                        icon={<ClipboardListIcon size={16} />}
                        stats={operationalSummary}
                    />

                    <SummarySection
                        title="Administrative Summary"
                        icon={<SettingsIcon size={16} />}
                        stats={administrativeSummary}
                    />

                    <div className="dashboard-row">
                        <AnalyticsOverview data={weeklyTrend} lastUpdated="Today • 2:45 PM" />
                        <DocumentDistribution slices={documentDistribution} totalDocuments={totalDocuments} />
                    </div>

                    <div className="dashboard-row">
                        <RecentTransactions rows={recentTransactions} onViewAll={() => handleNavigate('transaction-registry')} />
                        <QuickActions actions={quickActions} onSelect={handleNavigate} />
                    </div>
                </div>
                <DashboardFooter />
            </div>
        </div>
    );
}