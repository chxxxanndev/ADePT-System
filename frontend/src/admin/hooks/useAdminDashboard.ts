import { useState } from 'react';
import {
    accessRequestsMock,
    requestQueueMock,
    transactionsMock,
    staffPerformanceMock,
    activitiesMock,
} from '../data/dashboardMockData';

// Simulated network delay for refresh actions so the spinning state is visible.
const REFRESH_DELAY_MS = 700;

export function useAdminDashboard() {
    // Navigation / layout state
    const [activeView, setActiveView] = useState('overview');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Header controls
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter] = useState('Today');

    // Data states — swap these setters for real API responses when ready
    const [accessRequests] = useState(accessRequestsMock);
    const [requestQueue] = useState(requestQueueMock);
    const [transactions] = useState(transactionsMock);
    const [staffPerformance] = useState(staffPerformanceMock);
    const [activities] = useState(activitiesMock);

    // Per-section refresh indicators
    const [refreshingTransactions, setRefreshingTransactions] = useState(false);
    const [refreshingPerformance, setRefreshingPerformance] = useState(false);
    const [refreshingDistribution, setRefreshingDistribution] = useState(false);
    const [refreshingAccessRequests, setRefreshingAccessRequests] = useState(false);
    const [refreshingQueue, setRefreshingQueue] = useState(false);

    const withSpinner = (
        setter: (value: boolean) => void,
        action?: () => void
    ) => {
        setter(true);
        window.setTimeout(() => {
            action?.();
            setter(false);
        }, REFRESH_DELAY_MS);
    };

    const refreshTransactions = () => withSpinner(setRefreshingTransactions);
    const refreshPerformance = () => withSpinner(setRefreshingPerformance);
    const refreshDistribution = () => withSpinner(setRefreshingDistribution);
    const refreshAccessRequests = () => withSpinner(setRefreshingAccessRequests);
    const refreshQueue = () => withSpinner(setRefreshingQueue);

    return {
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
        refreshQueue,
    };
}