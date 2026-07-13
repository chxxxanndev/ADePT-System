import { useState } from 'react';
import '../styles/dashboard.css';
import '../styles/accountSettings.css'
import { Sidebar } from '../components/Sidebar';
import { DashboardHeader, WelcomeBanner } from '../components/DashboardHeader';
import { DashboardFooter } from '../components/DashboardFooter';
import { RequestFormEntry } from './RequestFormEntry';
import { AccountSettings } from './accountSettings';
import { TaxDeclarationForm } from './request-processing/TaxDeclaration/TaxDeclarationForm';
import { DashboardSummary } from '../components/StatCard';
import { AnalyticsOverview } from '../components/AnalyticsOverview';
import { DocumentDistribution } from '../components/DocumentDistribution';
import { RecentTransactions } from '../components/RecentTransactions';
import { QuickActions } from '../components/QuickActions';
import type { User } from '../types/auth';
import type { CompletedEntryData } from '../types/taxDeclaration';
import type { AccountUser, AccountSettingsFormData } from '../types/accountSettings';

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

// Views that live under "Request Processing" and require a completed entry formx`
const REQUEST_PROCESSING_VIEWS = new Set([
    'tax-declaration',
    'certificate-land-holding',
    'certificate-no-landholding',
]);

// Map view → human-readable label for the guard message
const VIEW_LABELS: Record<string, string> = {
    'tax-declaration':             'Tax Declaration',
    'certificate-land-holding':    'Certificate of Land Holding',
    'certificate-no-landholding':  'Certificate of No Landholding',
};

interface DashboardProps {
    user: User;
    onLogout: () => void;
    backendHealthy?: boolean | null;
}

export function Dashboard({ user, onLogout }: DashboardProps) {
    const [activeView, setActiveView] = useState('dashboard');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    /**
     * Holds the completed Request Form Entry data.
     * null  → entry not yet submitted (Request Processing views are gated).
     * object → entry saved; Request Processing views are unlocked.
     */
    const [completedEntryData, setCompletedEntryData] = useState<CompletedEntryData | null>(null);

    /**
     * Called when RequestFormEntry successfully saves.
     * Stores the entry data — this unlocks Request Processing views.
     */
    const handleEntryComplete = (data: CompletedEntryData) => {
        setCompletedEntryData(data);
    };

    /**
     * Called when user clicks "Proceed to Processing →" in the entry form.
     * Navigates directly to the chosen processing view.
     */
    const handleNavigateToProcessing = (view: string) => {
        setActiveView(view);
    };

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

    // The Request Form Entry view has its own in-card header (icon, title,
    // REF badge), so the generic "DASHBOARD / Welcome back" banner is skipped
    // for that view to avoid showing two headers stacked on top of each other.
    const isRequestFormView = activeView === 'new-request' || activeView === 'request-form';

    // ── Adapter: map the app-wide `User` shape to what AccountSettings expects ──
    const accountUser: AccountUser = {
        id: user.id,
        fullName: fullName.trim(),
        username: user.username || user.email?.split('@')[0] || '',
        email: user.email || '',
        role: user.role || 'Staff',
        avatarUrl: (user as any).avatarUrl,
        lastPasswordChange: (user as any).lastPasswordChange,
    };

    // ── AccountSettings handlers ──
    // TODO: replace these with real calls to your auth/user service
    // (mirrors the taxDeclarationService.save(...) pattern already in the app).
    const handleAccountSave = async (data: AccountSettingsFormData) => {
        console.log('TODO: wire up account save', data);
        // await userService.updateProfile(user.id, data);
    };

    const handleUpdateEmail = () => {
        console.log('TODO: open update-email flow');
    };

    const handleChangePassword = () => {
        console.log('TODO: open change-password flow');
    };

    const handleChangePhoto = () => {
        console.log('TODO: open photo upload flow');
    };

    const handleDisableAccount = async (disabled: boolean) => {
        console.log('TODO: wire up disable-account toggle', disabled);
        // await userService.setDisabled(user.id, disabled);
    };

    return (
        <div className="dashboard-page">
            <Sidebar
                sections={navSections}
                activeView={activeView}
                onNavigate={handleNavigate}
                onLogout={onLogout}
                mobileOpen={mobileMenuOpen}
                collapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
            />

            <div className="dashboard-main">
                {!isRequestFormView && (
                    <DashboardHeader
                        user={headerUser}
                        userName={fullName}
                        onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
                    />
                )}

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
                    ) : isRequestFormView ? (
                        <RequestFormEntry
                            user={user}
                            onCancel={() => setActiveView('dashboard')}
                            onEntryComplete={handleEntryComplete}
                            onNavigateToProcessing={handleNavigateToProcessing}
                        />
                    ) : activeView === 'tax-declaration' ? (
                        <TaxDeclarationForm
                            user={user}
                            entryData={completedEntryData ?? {
                                requestId: 'preview-mode',
                                referenceNumber: 'REF-PREVIEW',
                                declarantName: '',
                                requestedByName: '',
                                requestDate: new Date().toISOString().split('T')[0],
                                purposeId: '',
                                documentTypeIds: [],
                                actionTaken: 'PENDING',
                                authRequired: false,
                                propertyLocation: '',
                            }}
                            onBack={() => setActiveView('new-request')}
                            onBackToDashboard={() => setActiveView('dashboard')}
                        />
                    ) : activeView === 'account-settings' ? (
                        <AccountSettings
                            user={accountUser}
                            onSave={handleAccountSave}
                            onUpdateEmail={handleUpdateEmail}
                            onChangePassword={handleChangePassword}
                            onChangePhoto={handleChangePhoto}
                            onDisableAccount={handleDisableAccount}
                        />
                    ) : REQUEST_PROCESSING_VIEWS.has(activeView) ? (
                        <div className="placeholder-view" style={{ padding: '40px', textAlign: 'center' }}>
                            <h2>{VIEW_LABELS[activeView] ?? activeView}</h2>
                            <p>Module under development.</p>
                            <button onClick={() => setActiveView('dashboard')}>Return to Dashboard</button>
                        </div>
                    ) : (
                        <div className="placeholder-view" style={{ padding: '40px', textAlign: 'center' }}>
                            <h2>{activeView.replace(/-/g, ' ').toUpperCase()}</h2>
                            <p>Module under development.</p>
                            <button onClick={() => setActiveView('dashboard')}>Return to Dashboard</button>
                        </div>
                    )}
                </div>
                <DashboardFooter />
            </div>
        </div>
    );
}