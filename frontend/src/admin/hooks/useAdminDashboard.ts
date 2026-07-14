import { useState, useEffect } from 'react';
import {
    accountAccessRequestsMock,
    documentRequestQueueMock,
    recentTransactionsMock,
    staffPerformanceMock,
    recentActivityMock
} from '../data/dashboardMockData';
import type {
    AdminTransactionRow,
    StaffPerformanceItem,
    RecentActivityItem,
    AdminStatItem
} from '../data/dashboardMockData';

export function useAdminDashboard() {
    const [activeView, setActiveView] = useState<string>('overview');
    const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [dateFilter, setDateFilter] = useState<string>('TODAY');

    // Stats & Data states to allow refreshing/updating
    const [accessRequests, setAccessRequests] = useState<AdminStatItem[]>(accountAccessRequestsMock);
    const [requestQueue, setRequestQueue] = useState<AdminStatItem[]>(documentRequestQueueMock);
    const [transactions, setTransactions] = useState<AdminTransactionRow[]>(recentTransactionsMock);
    const [staffPerformance, setStaffPerformance] = useState<StaffPerformanceItem[]>(staffPerformanceMock);
    const [activities] = useState<RecentActivityItem[]>(recentActivityMock);

    // Refresh states to trigger loading animations on individual components
    const [refreshingTransactions, setRefreshingTransactions] = useState<boolean>(false);
    const [refreshingPerformance, setRefreshingPerformance] = useState<boolean>(false);
    const [refreshingDistribution, setRefreshingDistribution] = useState<boolean>(false);
    const [refreshingAccessRequests, setRefreshingAccessRequests] = useState<boolean>(false);
    const [refreshingQueue, setRefreshingQueue] = useState<boolean>(false);

    // Trigger local scroll resets on view change
    useEffect(() => {
        const scrollContainer = document.querySelector('.admin-dashboard-main');
        scrollContainer?.scrollTo(0, 0);
    }, [activeView]);

    // Simulated refresh handlers
    const refreshTransactions = () => {
        setRefreshingTransactions(true);
        setTimeout(() => {
            // Randomize values slightly to look "refreshed"
            setTransactions(prev => prev.map(row => ({
                ...row,
                date: new Date().toLocaleDateString('en-US')
            })));
            setRefreshingTransactions(false);
        }, 600);
    };

    const refreshPerformance = () => {
        setRefreshingPerformance(true);
        setTimeout(() => {
            setStaffPerformance(prev => prev.map(staff => ({
                ...staff,
                requests: Math.max(0, staff.requests + Math.floor(Math.random() * 5) - 2)
            })));
            setRefreshingPerformance(false);
        }, 600);
    };

    const refreshDistribution = () => {
        setRefreshingDistribution(true);
        setTimeout(() => {
            setRefreshingDistribution(false);
        }, 700);
    };

    const refreshAccessRequests = () => {
        setRefreshingAccessRequests(true);
        setTimeout(() => {
            setAccessRequests(prev => prev.map(stat => ({
                ...stat,
                value: Math.max(0, stat.value + Math.floor(Math.random() * 3) - 1)
            })));
            setRefreshingAccessRequests(false);
        }, 500);
    };

    const refreshQueue = () => {
        setRefreshingQueue(true);
        setTimeout(() => {
            setRequestQueue(prev => prev.map(stat => ({
                ...stat,
                value: Math.max(0, stat.value + Math.floor(Math.random() * 4) - 1)
            })));
            setRefreshingQueue(false);
        }, 500);
    };

    // Filter transactions and performance by search query
    const filteredTransactions = transactions.filter(row =>
        row.controlNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.declarant.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.document.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.assignedStaff.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredStaffPerformance = staffPerformance.filter(staff =>
        staff.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
        setDateFilter,

        // Data states
        accessRequests,
        requestQueue,
        transactions: filteredTransactions,
        staffPerformance: filteredStaffPerformance,
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
    };
}
