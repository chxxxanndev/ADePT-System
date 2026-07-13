import { useState } from 'react';
import '../styles/dashboard.css';
import { Sidebar } from '../components/Sidebar';
import { DashboardHeader, WelcomeBanner } from '../components/DashboardHeader';
import { DashboardFooter } from '../components/DashboardFooter';
import { RequestFormEntry } from './RequestFormEntry';
import { TaxDeclarationForm } from './request-processing/TaxDeclaration/TaxDeclarationForm';
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
import type { CompletedEntryData } from '../types/taxDeclaration';

interface DashboardProps {
    user: User;
    onLogout: () => void;
    backendHealthy?: boolean | null;
}

// Views that live under "Request Processing" and require a completed entry form
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

export function Dashboard({ user, onLogout }: DashboardProps) {
    const [activeView, setActiveView] = useState('dashboard');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    /**
     * Holds the completed Request Form Entry data.
     * null  → entry not yet submitted (Request Processing views are gated).
     * object → entry saved; Request Processing views are unlocked.
     */
    const [completedEntryData, setCompletedEntryData] = useState<CompletedEntryData | null>(null);

    // Defensive check: If user is missing, show nothing or a loader
    if (!user) return <div className="white-screen-fix">Loading Session...</div>;

    const handleNavigate = (view: string) => {
        setActiveView(view);
        setMobileMenuOpen(false);
    };

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

    const fullName = `${user.firstName || ''} ${user.lastName || ''}`;
    const headerUser = {
        name: fullName,
        email: user.email || '',
        role: user.role || 'Staff',
        lastLogin: 'Today • 8:12 AM',
    };

    // ── Render the content area based on activeView ──────────────────────────
    const renderContent = () => {
        // ── Dashboard home ──
        if (activeView === 'dashboard') {
            return (
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
            );
        }

        // ── Request Form Entry ──
        if (activeView === 'new-request' || activeView === 'request-form') {
            return (
                <RequestFormEntry
                    user={user}
                    onCancel={() => setActiveView('dashboard')}
                    onEntryComplete={handleEntryComplete}
                    onNavigateToProcessing={handleNavigateToProcessing}
                />
            );
        }

        // ── Request Processing views ──
        // TODO: Re-enable guard when Request Form Entry is finalized.
        // Guard is temporarily disabled so the Tax Declaration form can be previewed directly.
        if (REQUEST_PROCESSING_VIEWS.has(activeView)) {
            // -- GUARD (temporarily bypassed) --
            // if (!completedEntryData) {
            //     return (
            //         <RequestGuard
            //             attemptedView={VIEW_LABELS[activeView] ?? activeView}
            //             onGoToEntry={() => setActiveView('new-request')}
            //             onBackToDashboard={() => setActiveView('dashboard')}
            //         />
            //     );
            // }

            // Tax Declaration form
            // Use completedEntryData if available, otherwise fall back to a temporary stub
            const entryDataForForm = completedEntryData ?? {
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
            };

            if (activeView === 'tax-declaration') {
                return (
                    <TaxDeclarationForm
                        user={user}
                        entryData={entryDataForForm}
                        onBack={() => setActiveView('new-request')}
                        onBackToDashboard={() => setActiveView('dashboard')}
                    />
                );
            }

            // Placeholder for other request processing types
            return (
                <div className="placeholder-view" style={{ padding: '40px', textAlign: 'center' }}>
                    <h2>{VIEW_LABELS[activeView] ?? activeView}</h2>
                    <p>Module under development.</p>
                    <button onClick={() => setActiveView('dashboard')}>Return to Dashboard</button>
                </div>
            );
        }

        // ── All other views (placeholder) ──
        return (
            <div className="placeholder-view" style={{ padding: '40px', textAlign: 'center' }}>
                <h2>{activeView.replace(/-/g, ' ').toUpperCase()}</h2>
                <p>Module under development.</p>
                <button onClick={() => setActiveView('dashboard')}>Return to Dashboard</button>
            </div>
        );
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
                    {renderContent()}
                </div>
                <DashboardFooter />
            </div>
        </div>
    );
}