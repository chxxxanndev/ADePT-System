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
import CertifiedTrueCopy from './CeritifiedTrueCopy-Reprint';
import ArchiveManagement from './ArchiveManagement';
import { NotificationPage } from './NotificationPage';
import { PendingForRelease } from './PendingForRelease';
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
import { useCart } from '../hooks/TransactionCartContext';
import { useOnlinePresence } from '../../admin/services/useOnlinePresence';

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
    const docTypes = t.requestedDocuments?.map((d) => d.documentType).join(', ') || 'N/A';
    return {
        id: t.id,
        controlNumber: t.referenceNumber,
        declarant: t.client.declarantName,
        document: docTypes,
        // Cast status to match expected BadgeStatus in TransactionRow
        status: t.status as unknown as any,
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

const DOCUMENT_PROCESSING_VIEWS = new Set([
    'tax-declaration', 'tax-dec',
    'certificate-land-holding', 'land-holding',
    'certificate-no-landholding', 'no-land-holding',
]);

// Mirrors RequestFormEntry's own localStorage key ('adept-rfe') and its
// definition of "meaningfully filled in" — checked from outside that
// component so Dashboard can guard navigation without prop drilling.
function hasUnsavedRequestFormEntry(): boolean {
    try {
        const raw = localStorage.getItem('adept-rfe');
        if (!raw) return false;
        const data = JSON.parse(raw);
        return !!(
            data.declarantName?.trim() ||
            data.requestedByName?.trim() ||
            data.propertyLocation ||
            (Array.isArray(data.documentTypeIds) && data.documentTypeIds.length > 0)
        );
    } catch {
        return false;
    }
}

// Mirrors the per-document localStorage keys written by
// TaxDeclarationForm / LandholdingCertificateForm / NoLandholdingCertificateForm
// ('adept-td-{id}', 'adept-lh-{id}', 'adept-nlh-{id}').
function hasUnsavedDocumentForm(requestId?: string): boolean {
    if (!requestId) return false;
    try {
        return !!(
            localStorage.getItem(`adept-td-${requestId}`) ||
            localStorage.getItem(`adept-lh-${requestId}`) ||
            localStorage.getItem(`adept-nlh-${requestId}`)
        );
    } catch {
        return false;
    }
}

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
        return date
            .toLocaleString('en-US', {
                weekday: 'short',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
            })
            .replace(',', ' •');
    } catch (e) {
        return dateString;
    }
};

export function Dashboard({ user, onLogout, onUserUpdate }: DashboardProps) {
    useOnlinePresence(user);

    const [activeView, setActiveView] = useState<string>(
        () => sessionStorage.getItem('adept-active-view') || 'dashboard'
    );
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
    const [navigationWarning, setNavigationWarning] = useState<
        | { type: 'cart' }
        | { type: 'entry-form' }
        | { type: 'document-form'; label: string; goBackView: string }
        | null
    >(null);

    // --- Live registry analytics (weekly trend, document distribution, recent transactions) ---
    // Called unconditionally (rules-of-hooks) even though it's only rendered
    // for the 'dashboard' view, mirroring how useNotifications is used below.
    const analytics = useReportsAnalytics();
    const { items: cartItems } = useCart();

    const guardedSetActiveView = (view: string) => {
        if (cartItems.length > 0 && view !== 'transaction-summary') {
            setNavigationWarning({ type: 'cart' });
            return;
        }

        if (activeView === 'new-request' && view !== 'new-request' && hasUnsavedRequestFormEntry()) {
            setNavigationWarning({ type: 'entry-form' });
            return;
        }

        if (
            DOCUMENT_PROCESSING_VIEWS.has(activeView) &&
            view !== activeView &&
            hasUnsavedDocumentForm(completedEntryData?.requestId)
        ) {
            setNavigationWarning({
                type: 'document-form',
                label: VIEW_LABELS[activeView] ?? activeView,
                goBackView: activeView,
            });
            return;
        }

        setActiveView(view);
    };

    const handleAcknowledgeNavigationWarning = () => {
        if (!navigationWarning) return;
        const target =
            navigationWarning.type === 'cart' ? 'transaction-summary' :
                navigationWarning.type === 'entry-form' ? 'new-request' :
                    navigationWarning.goBackView;

        setNavigationWarning(null);
        setActiveView(target);
    };

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
            guardedSetActiveView('new-request');
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
                const found = docTypes.find(
                    (d: any) => d.name.toLowerCase().includes('tax declaration') || d.id === 'dt1'
                );
                if (found) {
                    documentTypeIds = [found.id];
                    prefix = 'TD';
                }
            } else if (type === 'landholding') {
                const found = docTypes.find(
                    (d: any) => d.name.toLowerCase().includes('landholding') || d.id === 'dt3'
                );
                if (found) {
                    documentTypeIds = [found.id];
                    prefix = 'LH';
                }
            } else if (type === 'nolandholding') {
                const found = docTypes.find(
                    (d: any) => d.name.toLowerCase().includes('no landholding') || d.id === 'dt4'
                );
                if (found) {
                    documentTypeIds = [found.id];
                    prefix = 'NLH';
                }
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

    const handleDiscardDocumentForm = async () => {
        if (completedEntryData?.requestId) {
            try {
                await requestService.updateRequest(completedEntryData.requestId, { status: 'CANCELLED' });
            } catch (err) {
                console.error('Failed to cancel request on discard', err);
            }
            try {
                localStorage.removeItem(`adept-td-${completedEntryData.requestId}`);
                localStorage.removeItem(`adept-lh-${completedEntryData.requestId}`);
                localStorage.removeItem(`adept-nlh-${completedEntryData.requestId}`);
            } catch { }
        }
        setCompletedEntryData(null);
        setActiveView('document-request');
    };

    const handleDiscardRequestFormEntry = () => {
        try { localStorage.removeItem('adept-rfe'); } catch { }
        setNavigationWarning(null);
        setActiveView('document-request');
    };

    useEffect(() => {
        const scrollContainer = document.querySelector('.dashboard-main');
        scrollContainer?.scrollTo(0, 0);
    }, [activeView]);

    useEffect(() => {
        sessionStorage.setItem('adept-active-view', activeView);
    }, [activeView]);

    useEffect(() => {
        try {
            if (completedEntryData) {
                sessionStorage.setItem('adept-completed-entry-data', JSON.stringify(completedEntryData));
            } else {
                sessionStorage.removeItem('adept-completed-entry-data');
            }
        } catch { }
    }, [completedEntryData]);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            const hasCartItems = cartItems.length > 0;
            const hasEntryDraft = activeView === 'new-request' && hasUnsavedRequestFormEntry();
            const hasDocDraft =
                DOCUMENT_PROCESSING_VIEWS.has(activeView) &&
                hasUnsavedDocumentForm(completedEntryData?.requestId);

            if (hasCartItems || hasEntryDraft || hasDocDraft) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [cartItems, activeView, completedEntryData]);

    // Fetch the latest profile from the backend when viewing account settings,
    // so changes made by an admin (e.g. title) are reflected immediately.
    useEffect(() => {
        if (activeView === 'account-settings') {
            accountService.getProfile().then((profile) => {
                onUserUpdate({
                    firstName: profile.firstName,
                    middleInitial: profile.middleInitial,
                    lastName: profile.lastName,
                    username: profile.username,
                    email: profile.email,
                    avatarUrl: profile.avatarUrl,
                    position: profile.position,
                    suffix: profile.suffix,
                });
            }).catch(() => { });
        }
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
        guardedSetActiveView('payment-details');
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
        guardedSetActiveView(view);
        setMobileMenuOpen(false);
    };

    const handleNavigateToVoidAmend = (newVoidedItems: VoidAmendRecord[]) => {
        setPendingVoidItems(newVoidedItems);
        setActiveView('void-amend');
    };

    const fullName = `${user.firstName || ''} ${user.middleInitial ? user.middleInitial.replace(/\.$/, '') + '. ' : ''}${user.lastName || ''}`.replace(/\s+/g, ' ').trim();

    const headerUser = {
        name: fullName,
        email: user.email || '',
        role: (user as any).roleName || 'Staff',
        lastLogin: formatLastLogin((user as any).lastLogin),
        avatarUrl: user.avatarUrl,
    };

    const hideHeader = [
        'new-request',
        'request-form',
        'tax-declaration',
        'tax-dec',
        'certificate-land-holding',
        'land-holding',
        'certificate-no-landholding',
        'no-land-holding',
        'account-settings',
        'pending-payment',
        'pending-for-release',
        'payment-details',
        'document-request',
        'reports',
        'transaction-registry',
        'void-amend',
        'certified-true-copy',
        'archive-management',
        'transaction-summary',
        'notifications',
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
        status: (user as any).status || 'ACTIVE',
        position: user.position || undefined,
        suffix: user.suffix || undefined,
    };

    if ((user as any).roleCode === ROLES.SUPER_ADMIN) {
        // console.log("User is an admin");
    }

    const handleAccountSave = async (data: AccountSettingsFormData) => {
        const result = await accountService.updateProfile(data.fullName, data.username, data.position, data.suffix);
        onUserUpdate({
            firstName: result.data.first_name,
            middleInitial: result.data.middle_initial,
            lastName: result.data.last_name,
            username: result.data.username,
            position: result.data.position || data.position,
            suffix: result.data.suffix || data.suffix,
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
            console.error('Failed to update account status', err);
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
                onOpenNotifications={() => guardedSetActiveView('notifications')}
            />

            <div className="dashboard-main">
                {!hideHeader && (
                    <DashboardHeader
                        user={headerUser as any}
                        userName={fullName}
                        onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
                    />
                )}

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
                                <DocumentDistribution
                                    slices={analytics.documentDistribution}
                                    totalDocuments={analytics.totalDocuments}
                                />
                            </div>
                            <div className="dashboard-row">
                                <RecentTransactions
                                    rows={recentTransactionsData}
                                    allRows={allTransactionsData}
                                    onViewAll={() => guardedSetActiveView('transaction-registry')}
                                />
                                <QuickActions actions={quickActions} onSelect={guardedSetActiveView} />
                            </div>
                        </>
                    ) : activeView === 'reports' ? (
                        <Reports />
                    ) : activeView === 'certified-true-copy' ? (
                        <CertifiedTrueCopy
                            onNavigateToRegistry={() => setActiveView('transaction-registry')}
                            onNavigateToVoidAmend={() => setActiveView('void-amend')}
                        />
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
                        <RequestFormEntry
                            user={user}
                            onCancel={handleCancelEntry}
                            onEntryComplete={handleEntryComplete}
                            onNavigateToProcessing={handleNavigateToProcessing}
                            prefilledRequestData={prefilledRequestData}
                        />
                    ) : activeView === 'tax-declaration' || activeView === 'tax-dec' ? (
                        completedEntryData ? (
                            <TaxDeclarationForm
                                user={user}
                                entryData={completedEntryData}
                                onDiscard={handleDiscardDocumentForm}
                                onGoToSummary={() => setActiveView('transaction-summary')}
                                onAddAnother={handleAddAnother}
                            />
                        ) : (
                            <RequestGuard
                                attemptedView="Tax Declaration"
                                onGoToEntry={() => setActiveView('new-request')}
                                onBackToDashboard={() => setActiveView('dashboard')}
                            />
                        )
                    ) : activeView === 'certificate-land-holding' || activeView === 'land-holding' ? (
                        completedEntryData ? (
                            <LandholdingCertificateForm
                                user={user}
                                entryData={completedEntryData}
                                onDiscard={handleDiscardDocumentForm}
                                onGoToSummary={() => setActiveView('transaction-summary')}
                                onAddAnother={handleAddAnother}
                            />
                        ) : (
                            <RequestGuard
                                attemptedView="Certificate of Land Holding"
                                onGoToEntry={() => setActiveView('new-request')}
                                onBackToDashboard={() => setActiveView('dashboard')}
                            />
                        )
                    ) : activeView === 'certificate-no-landholding' || activeView === 'no-land-holding' ? (
                        completedEntryData ? (
                            <NoLandholdingCertificateForm
                                user={user}
                                entryData={completedEntryData}
                                onDiscard={handleDiscardDocumentForm}
                                onGoToSummary={() => setActiveView('transaction-summary')}
                                onAddAnother={handleAddAnother}
                            />
                        ) : (
                            <RequestGuard
                                attemptedView="Certificate of No Landholding"
                                onGoToEntry={() => setActiveView('new-request')}
                                onBackToDashboard={() => setActiveView('dashboard')}
                            />
                        )
                    ) : activeView === 'document-request' ? (
                        <DocumentRequestDashboard
                            user={user}
                            onSelectNewRequest={handleSelectNewRequest}
                            onSelectDraft={handleSelectDraft}
                            onSelectDocumentView={(view) => setActiveView(view)}
                        />
                    ) : activeView === 'transaction-summary' ? (
                        completedEntryData ? (
                            <TransactionSummary
                                entryData={completedEntryData}
                                onBackToForms={handleAddAnother}
                                onProceedToQueue={() => {
                                    setCompletedEntryData(null);
                                    setActiveView('pending-payment');
                                }}
                            />
                        ) : (
                            <RequestGuard
                                attemptedView="Transaction Summary"
                                onGoToEntry={() => setActiveView('new-request')}
                                onBackToDashboard={() => setActiveView('dashboard')}
                            />
                        )
                    ) : activeView === 'account-settings' ? (
                        <AccountSettings
                            user={accountUser}
                            onSave={handleAccountSave}
                            onUpdateEmail={handleUpdateEmail}
                            onChangePassword={handleChangePassword}
                            onChangePhoto={handleChangePhoto}
                            onDisableAccount={handleDisableAccount}
                        />
                    ) : activeView === 'pending-payment' ? (
                        <PendingPayment
                            onSelectPayment={handleSelectPayment}
                            onNavigateBack={() => setActiveView('document-request')}
                            onSwitchView={(view: string) => setActiveView(view)}
                        />
                    ) : activeView === 'payment-details' ? (
                        <PaymentDetails
                            payment={selectedPayment}
                            onBack={() => setActiveView('pending-payment')}
                            onReleased={() => setActiveView('transaction-registry')}
                             onReleasedReprint={() => setActiveView('certified-true-copy')} 
                            onSavedForLater={() => setActiveView('pending-for-release')}
                            onEditDocument={(_controlNumber) => {
                                if (selectedPayment?.documentType.toLowerCase().includes('landholding')) {
                                    setActiveView('certificate-land-holding');
                                } else if (selectedPayment?.documentType.toLowerCase().includes('no landholding')) {
                                    setActiveView('certificate-no-landholding');
                                } else {
                                    setActiveView('tax-declaration');
                                }
                            }}
                        />
                    ) : activeView === 'pending-for-release' ? (
                        <PendingForRelease
                            onSelectPayment={handleSelectPayment}
                            onNavigateBack={() => setActiveView('document-request')} /* ADD THIS */
                            onSwitchView={(view: string) => setActiveView(view)} /* ADD THIS */
                        />
                   ) : activeView === 'transaction-registry' ? (
                        <TransactionRegistry
                            user={user}
                            onNavigateToVoidAmend={handleNavigateToVoidAmend}
                            onNavigateToPendingPayment={() => guardedSetActiveView('pending-payment')}
                            onNavigateToReprint={() => setActiveView('certified-true-copy')}
                            onNavigateToPendingRequests={() => setActiveView('document-request')}
                        />
) : activeView === 'void-amend' ? (
                        <VoidAndAmend
                            pendingItems={pendingVoidItems}
                            onPendingItemsConsumed={() => setPendingVoidItems([])}
                            onAmend={(payload) => {
                                setPrefilledRequestData(payload);
                                setActiveView('new-request');
                            }}
                            onNavigateToRegistry={() => setActiveView('transaction-registry')}
                            onNavigateToReprint={() => setActiveView('certified-true-copy')}
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

            {navigationWarning && (
                <div className="utw-backdrop" onClick={handleAcknowledgeNavigationWarning}>
                    <div className="utw-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="utw-body">
                            <div className="utw-icon-wrap">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path
                                        d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
                                        stroke="#C9A227"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </div>
                            <div>
                                {navigationWarning.type === 'cart' && (
                                    <>
                                        <h3 className="utw-title">Unsubmitted Transaction</h3>
                                        <p className="utw-desc">
                                            You have documents waiting in your transaction. Please submit them to{' '}
                                            <strong>Pending Payments</strong> or cancel the document(s) before continuing.
                                        </p>
                                    </>
                                )}
                                {navigationWarning.type === 'entry-form' && (
                                    <>
                                        <h3 className="utw-title">Unfinished Request Form</h3>
                                        <p className="utw-desc">
                                            You haven't finished filling in the <strong>Request Form Entry</strong>.{' '}
                                            Your progress is saved, but you need to complete or discard it before going elsewhere.
                                        </p>
                                    </>
                                )}
                                {navigationWarning.type === 'document-form' && (
                                    <>
                                        <h3 className="utw-title">Unfinished Document</h3>
                                        <p className="utw-desc">
                                            You haven't finished filling in the <strong>{navigationWarning.label}</strong>{' '}
                                            form. Please save it or go back to finish before continuing.
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="utw-actions">
                            {navigationWarning.type === 'document-form' && (
                                <button
                                    type="button"
                                    onClick={handleDiscardDocumentForm}
                                    style={{ background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', marginRight: '10px' }}
                                >
                                    Discard Document
                                </button>
                            )}
                            {navigationWarning.type === 'entry-form' && (
                                <button
                                    type="button"
                                    onClick={handleDiscardRequestFormEntry}
                                    style={{ background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', marginRight: '10px' }}
                                >
                                    Discard Request
                                </button>
                            )}
                            <button
                                type="button"
                                className="utw-confirm-btn"
                                onClick={handleAcknowledgeNavigationWarning}
                            >
                                {navigationWarning.type === 'cart' && 'Go to Transaction Summary'}
                                {navigationWarning.type === 'entry-form' && 'Go back to Request Form Entry'}
                                {navigationWarning.type === 'document-form' && `Go back to ${navigationWarning.label}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}