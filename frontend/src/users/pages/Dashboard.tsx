import { useState, useEffect, useMemo } from 'react';
import '../styles/dashboard.css';
import { Sidebar } from '../components/Sidebar';
import { DashboardHeader, WelcomeBanner } from '../components/DashboardHeader';
import { DashboardFooter } from '../components/DashboardFooter';
import { RequestFormEntry } from './RequestFormEntry';
import { AccountSettings } from './accountSettings';
import { TaxDeclarationForm } from './request-processing/TaxDeclaration/TaxDeclarationForm';
import { LandholdingCertificateForm } from './request-processing/LandholdingCertificate/LandholdingCertificateForm';
import { NoLandholdingCertificateForm } from './request-processing/NoLandholdingCertificate/NoLandholdingCertificateForm';
import { PendingPayment } from './PendingPayment';
import { PaymentDetails } from './PaymentDetails';
import { DocumentRequestDashboard } from './DocumentRequestDashboard';
import Reports from './Reports';
import CertifiedTrueCopy from './CertifiedTrueCopy';
import ArchiveManagement from './ArchiveManagement';
import { NotificationPage } from './NotificationPage';
import { requestService } from '../services/requestService';
import { RequestGuard } from '../components/RequestGuard';
import { DashboardSummary } from '../components/StatCard';
import { AnalyticsOverview } from '../components/AnalyticsOverview';
import { DocumentDistribution } from '../components/DocumentDistribution';
import { RecentTransactions } from '../components/RecentTransactions';
import { QuickActions } from '../components/QuickActions';
import type { User } from '../../auth-folder/types/auth';
import type { CompletedEntryData } from '../types/taxDeclaration';
import type { AccountUser, AccountSettingsFormData } from '../types/accountSettings';
import { accountService } from '../services/accountService';
import type { PendingPaymentRequest } from '../types/PendingPayment';
import { TransactionRegistry } from './TransactionRegistry';
import { TransactionSummary } from './request-processing/TransactionSummary';
import { ROLES } from '../constants/roles';
import { useNotifications } from '../hooks/useNotifications';

// Single shared source of truth for registry-derived analytics — also used
// by Reports.tsx, so the Analytics Overview / Document Distribution here and
// the numbers on the Reports page never drift apart.
import { useReportsAnalytics } from '../hooks/useReportsAnalytics';
import type { Transaction } from '../types/transaction';
import type { TransactionRow } from '../types/dashboard';

import {
    navSections,
    operationalSummary,
    administrativeSummary,
    quickActions,
} from '../data/dashboardMockData';
import VoidAndAmend from './VoidAndAmend';
import type { VoidAmendRecord } from './VoidAndAmend';

// sessionStorage key for the in-progress "completed entry" (the data that
// gates the Tax Declaration / Landholding / No-Landholding / Transaction
// Summary views). Mirrors the 'adept-active-view' pattern already used
// below for activeView, so a page refresh doesn't fall back to RequestGuard.
const COMPLETED_ENTRY_STORAGE_KEY = 'adept-completed-entry';

// Helper to format date as "MM/DD/YYYY hh:mm AM/PM"
const formatTransactionDateTime = (dateStr: string): string => {
    try {
        const d = new Date(dateStr);
        return `${d.toLocaleDateString('en-US')} ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } catch {
        return dateStr;
    }
};

// Map a Transaction (from registry) to TransactionRow (for RecentTransactions)
const mapTransactionToRow = (t: Transaction): TransactionRow => {
    const docTypes = t.requestedDocuments?.map(d => d.documentType).join(', ') || 'N/A';
        return {
        id: t.id,
        controlNumber: t.referenceNumber,
        declarant: t.client.declarantName,
        document: docTypes,
        // Cast status to match expected BadgeStatus in TransactionRow
        status: (t.status as unknown) as any,
        dateTime: formatTransactionDateTime(t.dateRequested),
    };
};

const REQUEST_PROCESSING_VIEWS = new Set([
    'tax-declaration',
    'certificate-land-holding',
    'certificate-no-landholding',
    'tax-dec',
    'land-holding',
    'no-land-holding',
]);

const VIEW_LABELS: Record<string, string> = {
    'tax-declaration': 'Tax Declaration',
    'certificate-land-holding': 'Certificate of Land Holding',
    'certificate-no-landholding': 'Certificate of No Landholding',
    'tax-dec': 'Tax Declaration',
    'land-holding': 'Certificate of Land Holding',
    'no-land-holding': 'Certificate of No Landholding',
};

interface DashboardProps {
    user: User;
    onLogout: () => void;
    onUserUpdate: (patch: Partial<User>) => void;
    backendHealthy?: boolean | null;
}

const formatLastLogin = (dateString?: string) => {
    if (!dateString) return 'Just now';
    try {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: true
        }).replace(',', ' •');
    } catch (e) {
        return dateString;
    }
};

export function Dashboard({ user, onLogout, onUserUpdate }: DashboardProps) {
    const [activeView, setActiveView] = useState<string>(
        () => sessionStorage.getItem('adept-active-view') || 'dashboard'
    );
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // FIX: rehydrate completedEntryData from sessionStorage on mount instead
    // of always starting at null. Previously a page refresh reset this to
    // null while `activeView` (above) correctly restored to e.g.
    // 'certificate-no-landholding' — so the form's `completedEntryData ? Form : RequestGuard`
    // check would fail and staff would see "Request Entry Not Completed"
    // even though they had a valid in-progress entry.
    const [completedEntryData, setCompletedEntryData] = useState<CompletedEntryData | null>(() => {
        try {
            const saved = sessionStorage.getItem(COMPLETED_ENTRY_STORAGE_KEY);
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });

    const [selectedPayment, setSelectedPayment] = useState<PendingPaymentRequest | null>(null);
    const [prefilledRequestData, setPrefilledRequestData] = useState<any | null>(null);
    const [pendingVoidItems, setPendingVoidItems] = useState<VoidAmendRecord[]>([]);

    // --- Live registry analytics (weekly trend, document distribution, recent transactions) ---
    // Called unconditionally (rules-of-hooks) even though it's only rendered
    // for the 'dashboard' view, mirroring how useNotifications is used below.
    const analytics = useReportsAnalytics();

    // Recent transactions is just the 5 most-recently-requested Released
    // transactions out of the same registry fetch the rest of this hook
    // already pulled — no second network call needed.
    const recentTransactionsData: TransactionRow[] = useMemo(() => {
        return analytics.transactions
            .filter((t) => t.status === 'Released')
            .sort((a, b) => new Date(b.dateRequested).getTime() - new Date(a.dateRequested).getTime())
            .slice(0, 5)
            .map(mapTransactionToRow);
    }, [analytics.transactions]);

    // The FULL mapped transaction list — this is what actually connects
    // the Recent Transaction search box to the whole registry dataset
    // instead of only the 5 rows visible by default.
    const allTransactionsData: TransactionRow[] = useMemo(() => {
        return [...analytics.transactions]
            .sort((a, b) => new Date(b.dateRequested).getTime() - new Date(a.dateRequested).getTime())
            .map(mapTransactionToRow);
    }, [analytics.transactions]);

    // Single shared notifications state + realtime subscription
    const {
        notifications,
        unreadCount,
        loading: notifLoading,
        error: notifError,
        refetch: refetchNotifications,
        markAsRead,
        markAllAsRead,
    } = useNotifications(user);

    // Clicking a notification (from the bell OR the full page) lands here
    const handleOpenNotification = async (requestId: string, notifId: string) => {
        markAsRead(notifId);
        try {
            const res = await requestService.getRequestById(requestId);
            setPrefilledRequestData(res.data || res);
            setActiveView('new-request');
        } catch (err) {
            console.error('Failed to load forwarded request', err);
            alert('Failed to load this request.');
        }
    };

    const handleSelectNewRequest = async (type: 'tax' | 'landholding' | 'nolandholding') => {
        try {
            const meta = await requestService.getMetadata();
            const docTypes = Array.isArray(meta?.docTypes) ? meta.docTypes : [];
            let documentTypeIds: string[] = [];
            let prefix = 'REF';

            if (type === 'tax') {
                const found = docTypes.find((d: any) => d.name.toLowerCase().includes('tax declaration') || d.id === 'dt1');
                if (found) { documentTypeIds = [found.id]; prefix = 'TD'; }
            } else if (type === 'landholding') {
                const found = docTypes.find((d: any) => d.name.toLowerCase().includes('landholding') || d.id === 'dt3');
                if (found) { documentTypeIds = [found.id]; prefix = 'LH'; }
            } else if (type === 'nolandholding') {
                const found = docTypes.find((d: any) => d.name.toLowerCase().includes('no landholding') || d.id === 'dt4');
                if (found) { documentTypeIds = [found.id]; prefix = 'NLH'; }
            }

            setPrefilledRequestData({
                declarantName: '',
                requestedByName: '',
                requestDate: new Date().toISOString().split('T')[0],
                purposeId: '',
                documentTypeIds,
                lockedDocType: true,
                authRequired: false,
                actionTaken: 'PENDING',
                propertyLocation: '',
                releasingStaffId: '',
                releaseDate: '',
                referenceNumber: `${prefix}-${new Date().getFullYear()}-XXXX`,
            });
            setActiveView('new-request');
        } catch (err) {
            console.error('Failed to get metadata for prefilling', err);
            setActiveView('new-request');
        }
    };

    const handleSelectDraft = (draft: any) => {
        setPrefilledRequestData({ ...draft, lockedDocType: false });
        setActiveView('new-request');
    };

    const handleCancelEntry = () => {
        setPrefilledRequestData(null);
        setActiveView('document-request');
    };

    useEffect(() => {
        const scrollContainer = document.querySelector('.dashboard-main');
        scrollContainer?.scrollTo(0, 0);
    }, [activeView]);

    useEffect(() => {
        sessionStorage.setItem('adept-active-view', activeView);
    }, [activeView]);

    // FIX: keep sessionStorage in sync with completedEntryData so a refresh
    // rehydrates it (see the lazy useState initializer above). When it's
    // cleared (e.g. handleAddAnother sets it back to null), remove the key
    // entirely rather than persisting "null".
    useEffect(() => {
        try {
            if (completedEntryData) {
                sessionStorage.setItem(COMPLETED_ENTRY_STORAGE_KEY, JSON.stringify(completedEntryData));
            } else {
                sessionStorage.removeItem(COMPLETED_ENTRY_STORAGE_KEY);
            }
        } catch {
            // ignore storage write failures (e.g. private browsing quota)
        }
    }, [completedEntryData]);

    const handleEntryComplete = (data: CompletedEntryData) => {
        setCompletedEntryData(data);
        setPrefilledRequestData(null);
    };

    const handleNavigateToProcessing = (view: string) => {
        setActiveView(view);
    };

    const handleSelectPayment = (payment: PendingPaymentRequest) => {
        setSelectedPayment(payment);
        setActiveView('payment-details');
    };

    const handleAddAnother = () => {
        if (completedEntryData) {
            setPrefilledRequestData({
                declarantName: completedEntryData.declarantName,
                requestedByName: completedEntryData.requestedByName,
                requestDate: new Date().toISOString().split('T')[0],
                purposeId: completedEntryData.purposeId,
                authRequired: completedEntryData.authRequired,
                actionTaken: completedEntryData.actionTaken || 'PENDING',
                propertyLocation: completedEntryData.propertyLocation,
                id: undefined,
                requestId: undefined,
                documentTypeIds: [],
                lockedDocType: false,
                referenceNumber: `REF-${new Date().getFullYear()}-XXXX`,
            });
            setCompletedEntryData(null);
            setActiveView('new-request');
        }
    };

    if (!user) return <div className="white-screen-fix">Loading Session...</div>;

    const handleNavigate = (view: string) => {
        setActiveView(view);
        setMobileMenuOpen(false);
    };

    const handleNavigateToVoidAmend = (newVoidedItems: VoidAmendRecord[]) => {
        setPendingVoidItems(newVoidedItems);
        setActiveView('void-amend');
    };

    const fullName = `${user.firstName || ''} ${user.lastName || ''}`;

    const headerUser = {
        name: fullName,
        email: user.email || '',
        role: (user as any).roleName || 'Staff',
        lastLogin: formatLastLogin((user as any).lastLogin),
        avatarUrl: user.avatarUrl
    };

    const hideHeader = [
        'new-request', 'request-form', 'tax-declaration', 'tax-dec',
        'certificate-land-holding', 'land-holding', 'certificate-no-landholding',
        'no-land-holding', 'account-settings', 'pending-payment',
        'payment-details', 'document-request', 'reports',
        'transaction-registry', 'void-amend', 'certified-true-copy',
        'archive-management', 'transaction-summary', 'notifications'
    ].includes(activeView);

    const isRequestFormView = activeView === 'new-request' || activeView === 'request-form';

    const accountUser: AccountUser = {
        id: user.id,
        fullName: fullName.trim(),
        username: user.username || user.email?.split('@')[0] || '',
        email: user.email || '',
        role: (user as any).roleName || 'Staff',
        avatarUrl: user.avatarUrl,
        lastPasswordChange: (user as any).lastPasswordChange,
        status: (user as any).status || 'ACTIVE'
    };

    if ((user as any).roleCode === ROLES.SUPER_ADMIN) {
        // console.log("User is an admin");
    }

    const handleAccountSave = async (data: AccountSettingsFormData) => {
        const result = await accountService.updateProfile(data.fullName, data.username);
        onUserUpdate({
            firstName: result.data.first_name,
            lastName: result.data.last_name,
            username: result.data.username,
        });
    };

    const handleUpdateEmail = async (newEmail: string) => {
        await accountService.updateEmail(newEmail);
        onUserUpdate({ email: newEmail });
    };

    const handleChangePassword = async (currentPassword: string, newPassword: string) => {
        await accountService.changePassword(currentPassword, newPassword);
    };

    const handleChangePhoto = async (file: File): Promise<string> => {
        const avatarUrl = await accountService.uploadPhoto(file);
        onUserUpdate({ avatarUrl } as Partial<User>);
        return avatarUrl;
    };

    const handleDisableAccount = async (disabled: boolean) => {
        try {
            await accountService.setAccountStatus(disabled);
            if (disabled) {
                setTimeout(() => {
                    onLogout();
                }, 500);
            }
        } catch (err) {
            console.error("Failed to update account status", err);
            throw err;
        }
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
                unreadCount={unreadCount}
                onOpenNotifications={() => setActiveView('notifications')}
            />

            <div className="dashboard-main">
                {!hideHeader && <DashboardHeader user={headerUser as any} userName={fullName} onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)} />}

                <div className="dashboard-content">
                    {activeView === 'dashboard' ? (
                        <>
                            <WelcomeBanner onRefresh={analytics.refetch} />
                            {/*
                              TODO: operationalSummary / administrativeSummary are still mock
                              data (data/dashboardMockData.ts). The live counts they should
                              show are already available above via `analytics` —
                              e.g. analytics.totalRequests.daily, analytics.documentsReleased.daily,
                              analytics.pendingCount, analytics.voidedCount, analytics.archivedCount,
                              analytics.reprintedCount — but wiring them safely requires knowing
                              the exact item shape components/StatCard.tsx (DashboardSummary)
                              expects. Share that file (and dashboardMockData.ts) and this can be
                              swapped from mock arrays to `analytics`-derived ones directly.
                            */}
                            <DashboardSummary title="Operational Summary" items={operationalSummary} iconType="operational" />
                            <DashboardSummary title="Administrative Summary" items={administrativeSummary} iconType="admin" />
                            <div className="dashboard-row">
                                <AnalyticsOverview data={analytics.weeklyTrend} lastUpdated="Today • 2:45 PM" />
                                <DocumentDistribution slices={analytics.documentDistribution} totalDocuments={analytics.totalDocuments} />
                            </div>
                            <div className="dashboard-row">
                                <RecentTransactions
                                    rows={recentTransactionsData}
                                    allRows={allTransactionsData}
                                    onViewAll={() => setActiveView('transaction-registry')}
                                />
                                <QuickActions actions={quickActions} onSelect={setActiveView} />
                            </div>
                        </>
                    ) : activeView === 'reports' ? (
                        <Reports />
                    ) : activeView === 'certified-true-copy' ? (
                        <CertifiedTrueCopy />
                    ) : activeView === 'archive-management' ? (
                        <ArchiveManagement />
                    ) : activeView === 'notifications' ? (
                        <NotificationPage
                            notifications={notifications}
                            onOpenRequest={handleOpenNotification}
                            loading={notifLoading}
                            error={notifError}
                            onRetry={refetchNotifications}
                            unreadCount={unreadCount}
                            onMarkAllRead={markAllAsRead}
                        />
                    ) : isRequestFormView ? (
                        <RequestFormEntry user={user} onCancel={handleCancelEntry} onEntryComplete={handleEntryComplete} onNavigateToProcessing={handleNavigateToProcessing} prefilledRequestData={prefilledRequestData} />
                    ) : activeView === 'tax-declaration' || activeView === 'tax-dec' ? (
                        completedEntryData ? (
                            <TaxDeclarationForm
                                user={user}
                                entryData={completedEntryData}
                                onBack={() => setActiveView('new-request')}
                                onGoToSummary={() => setActiveView('transaction-summary')}
                                onAddAnother={handleAddAnother}
                            />
                        ) : (<RequestGuard attemptedView="Tax Declaration" onGoToEntry={() => setActiveView('new-request')} onBackToDashboard={() => setActiveView('dashboard')} />)
                    ) : activeView === 'certificate-land-holding' || activeView === 'land-holding' ? (
                        completedEntryData ? (
                            <LandholdingCertificateForm
                                user={user}
                                entryData={completedEntryData}
                                onBack={() => setActiveView('new-request')}
                                onGoToSummary={() => setActiveView('transaction-summary')}
                                onAddAnother={handleAddAnother}
                            />
                        ) : (
                            <RequestGuard attemptedView="Certificate of Land Holding" onGoToEntry={() => setActiveView('new-request')} onBackToDashboard={() => setActiveView('dashboard')} />
                        )
                    ) : activeView === 'certificate-no-landholding' || activeView === 'no-land-holding' ? (
                        completedEntryData ? (
                            <NoLandholdingCertificateForm
                                user={user}
                                entryData={completedEntryData}
                                onBack={() => setActiveView('new-request')}
                                onGoToSummary={() => setActiveView('transaction-summary')}
                                onAddAnother={handleAddAnother}
                            />
                        ) : (<RequestGuard attemptedView="Certificate of No Landholding" onGoToEntry={() => setActiveView('new-request')} onBackToDashboard={() => setActiveView('dashboard')} />)
                    ) : activeView === 'document-request' ? (
                        <DocumentRequestDashboard user={user} onSelectNewRequest={handleSelectNewRequest} onSelectDraft={handleSelectDraft} onSelectDocumentView={(view) => setActiveView(view)} />
                    ) : activeView === 'transaction-summary' ? (
                        completedEntryData ? (
                            <TransactionSummary
                                entryData={completedEntryData}
                                onBackToForms={handleAddAnother}
                                onProceedToQueue={() => setActiveView('pending-payment')}
                            />
                        ) : (<RequestGuard attemptedView="Transaction Summary" onGoToEntry={() => setActiveView('new-request')} onBackToDashboard={() => setActiveView('dashboard')} />)
                    ) : activeView === 'account-settings' ? (
                        <AccountSettings user={accountUser} onSave={handleAccountSave} onUpdateEmail={handleUpdateEmail} onChangePassword={handleChangePassword} onChangePhoto={handleChangePhoto} onDisableAccount={handleDisableAccount} />
                    ) : activeView === 'pending-payment' ? (
                        <PendingPayment onSelectPayment={handleSelectPayment} />
                    ) : activeView === 'payment-details' ? (
                        <PaymentDetails
                            payment={selectedPayment}
                            onBack={() => setActiveView('pending-payment')}
                            onEditDocument={(_controlNumber) => {
                                if (selectedPayment?.documentType.toLowerCase().includes('landholding')) setActiveView('certificate-land-holding');
                                else if (selectedPayment?.documentType.toLowerCase().includes('no landholding')) setActiveView('certificate-no-landholding');
                                else setActiveView('tax-declaration');
                            }}
                        />
                    ) : activeView === 'transaction-registry' ? (
                        <TransactionRegistry user={user} onNavigateToVoidAmend={handleNavigateToVoidAmend} />
                    ) : activeView === 'void-amend' ? (
                        <VoidAndAmend
                            pendingItems={pendingVoidItems}
                            onPendingItemsConsumed={() => setPendingVoidItems([])}
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