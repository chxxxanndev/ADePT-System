import { useState, useEffect } from 'react';
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
import VoidAndAmend from './VoidAndAmend';

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

export function Dashboard({ user, onLogout, onUserUpdate }: DashboardProps) {
    const [activeView, setActiveView] = useState<string>(
        () => sessionStorage.getItem('adept-active-view') || 'dashboard'
    );
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [completedEntryData, setCompletedEntryData] = useState<CompletedEntryData | null>(null);
    const [selectedPayment, setSelectedPayment] = useState<PendingPaymentRequest | null>(null);
    const [prefilledRequestData, setPrefilledRequestData] = useState<any | null>(null);

    const handleSelectNewRequest = async (type: 'tax' | 'landholding' | 'nolandholding') => {
        try {
            const meta = await requestService.getMetadata();
            const docTypes = Array.isArray(meta?.docTypes) ? meta.docTypes : [];
            let documentTypeIds: string[] = [];

            if (type === 'tax') {
                const found = docTypes.find((d: any) => d.name.toLowerCase().includes('tax declaration') || d.id === 'dt1' || d.id === 'dt2');
                if (found) documentTypeIds = [found.id];
            } else if (type === 'landholding') {
                const found = docTypes.find((d: any) => d.name.toLowerCase().includes('property/landholding') || d.name.toLowerCase().includes('landholding') || d.id === 'dt3');
                if (found) documentTypeIds = [found.id];
            } else if (type === 'nolandholding') {
                const found = docTypes.find((d: any) => d.name.toLowerCase().includes('no property/landholding') || d.name.toLowerCase().includes('no landholding') || d.id === 'dt4');
                if (found) documentTypeIds = [found.id];
            }

            setPrefilledRequestData({
                declarantName: '',
                requestedByName: '',
                requestDate: new Date().toISOString().split('T')[0],
                purposeId: '',
                documentTypeIds,
                authRequired: false,
                actionTaken: 'PENDING',
                propertyLocation: '',
                releasingStaffId: '',
                releaseDate: '',
                referenceNumber: `REF-${new Date().getFullYear()}-0000`,
            });
            setActiveView('new-request');
        } catch (err) {
            console.error('Failed to get metadata for prefilling', err);
            setActiveView('new-request');
        }
    };

    const handleSelectDraft = (draft: any) => {
        setPrefilledRequestData(draft);
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
            // Copy the client data, but strip away the IDs so it creates a NEW database row
            setPrefilledRequestData({
                declarantName: completedEntryData.declarantName,
                requestedByName: completedEntryData.requestedByName,
                requestDate: new Date().toISOString().split('T')[0],
                purposeId: completedEntryData.purposeId,
                authRequired: completedEntryData.authRequired,
                actionTaken: completedEntryData.actionTaken || 'PENDING',
                propertyLocation: completedEntryData.propertyLocation, // FIX: Keep property location!

                // Explicitly clear IDs and selections
                id: undefined,
                requestId: undefined,
                documentTypeIds: [],
                referenceNumber: `REF-${new Date().getFullYear()}-XXXX`, // Let the entry form auto-generate the correct prefix
            });
            // Clear completed data and go back to entry
            setCompletedEntryData(null);
            setActiveView('new-request');
        }
    };

    if (!user) return <div className="white-screen-fix">Loading Session...</div>;

    const handleNavigate = (view: string) => {
        setActiveView(view);
        setMobileMenuOpen(false);
    };

    const fullName = `${user.firstName || ''} ${user.lastName || ''}`;
    const headerUser = { name: fullName, email: user.email || '', role: user.role || 'Staff', lastLogin: 'Today • 8:12 AM' };

    const hideHeader = activeView === 'new-request' || activeView === 'request-form' || activeView === 'tax-declaration' || activeView === 'tax-dec' || activeView === 'certificate-land-holding' || activeView === 'land-holding' || activeView === 'certificate-no-landholding' || activeView === 'no-land-holding' || activeView === 'account-settings' || activeView === 'pending-payment' || activeView === 'payment-details' || activeView === 'document-request' || activeView === 'reports' || activeView === 'transaction-registry' || activeView === 'void-amend' || activeView === 'certified-true-copy' || activeView === 'archive-management' || activeView === 'transaction-summary';
    const isRequestFormView = activeView === 'new-request' || activeView === 'request-form';

    const accountUser: AccountUser = { id: user.id, fullName: fullName.trim(), username: user.username || user.email?.split('@')[0] || '', email: user.email || '', role: user.role || 'Staff', avatarUrl: (user as any).avatarUrl, lastPasswordChange: (user as any).lastPasswordChange };

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
        throw err; // Re-throw so AccountSettings knows the API failed
    }
};

    return (
        <div className="dashboard-page">
            <Sidebar sections={navSections} activeView={activeView} onNavigate={handleNavigate} onLogout={onLogout} mobileOpen={mobileMenuOpen} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)} />

            <div className="dashboard-main">
                {!hideHeader && <DashboardHeader user={headerUser} userName={fullName} onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)} />}

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
                    ) : activeView === 'reports' ? (
                        <Reports />
                    ) : activeView === 'certified-true-copy' ? (
                        <CertifiedTrueCopy />
                    ) : activeView === 'archive-management' ? (
                        <ArchiveManagement />
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
                                // CRUCIAL FIX: Use handleAddAnother so it remembers the client name!
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
                        <TransactionRegistry />
                    ) : activeView === 'void-amend' ? (
                        <VoidAndAmend />
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