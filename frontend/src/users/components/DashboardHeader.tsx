import { useState } from 'react';
import type { KeyboardEvent } from 'react';
// REMOVED the conflicting UserProfile import from here
import { MenuIcon, UserIcon, RefreshIcon } from './icons';
import { DateRangePicker } from './DateRangePicker';

/**
 * Updated interface to support the connected database fields
 * Defining it here locally fixes the "conflict" error.
 */
export interface UserProfile {
    name: string;
    email: string;
    role: string;
    lastLogin: string;
    avatarUrl?: string;
}

interface DashboardHeaderProps {
    user: UserProfile;
    userName: string;
    onToggleMobileMenu?: () => void;
    onProfileClick?: () => void;
    title?: string;
    subtitle?: string;
    brandMode?: boolean;
}

export function DashboardHeader({
    user,
    userName,
    onToggleMobileMenu,
    onProfileClick,
    title = 'Dashboard',
    subtitle,
    brandMode = false,
}: DashboardHeaderProps) {
    const handleProfileKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onProfileClick?.();
        }
    };

    return (
        <header className={`dashboard-header ${brandMode ? 'dashboard-header-brand' : ''}`}>
            <div className="header-left">
                <button className="header-menu-btn" onClick={onToggleMobileMenu} aria-label="Toggle menu">
                    <MenuIcon size={22} />
                </button>
                {brandMode ? (
                    <div className="header-brand">
                        <div className="header-brand-logo">
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                                <line x1="8" y1="11" x2="16" y2="11" />
                                <line x1="8" y1="15" x2="16" y2="15" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="header-brand-title">
                                ASSESSOR<span className="header-brand-accent">DESK</span>
                            </h1>
                            <p className="header-brand-subtitle">
                                {subtitle || 'Office Of The Provincial Assessor'}
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        <h1 className="header-title">{title}</h1>
                        <div className="header-welcome">
                            <h2 className="welcome-title">
                                Greetings, <span className="welcome-name">{userName}</span>!
                            </h2>
                            <p className="welcome-subtitle">
                                {subtitle || "Today's operations overview for the Provincial Assessor's Office."}
                            </p>
                        </div>
                    </>
                )}
            </div>
            <div
                className="header-profile"
                role="button"
                tabIndex={0}
                aria-label="Open account settings"
                onClick={onProfileClick}
                onKeyDown={handleProfileKeyDown}
            >
                <div className="header-profile-card">
                    <div className="header-profile-avatar">
                        {user.avatarUrl ? (
                            <img
                                src={user.avatarUrl}
                                alt={userName}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    display: 'block'
                                }}
                            />
                        ) : (
                            <UserIcon size={18} />
                        )}
                    </div>
                    <div className="header-profile-namebox">
                        <span className="header-profile-name">{user.name}</span>
                        <span className="header-profile-email">{user.email}</span>
                    </div>
                </div>
                <div className="header-profile-meta">
                    <span className="header-profile-role">{user.role}</span>
                    <span className="header-profile-last-login">Last Login : {user.lastLogin}</span>
                </div>
            </div>
        </header>
    );
}

/**
 * Welcome banner for the dashboard home view. The "Summary period"
 * selector reuses the same DateRangePicker the Transaction Registry uses,
 * so the calendar UX matches across screens. The selected range flows up
 * to Dashboard.tsx via onDateRangeChange, which filters ONLY the 8 summary
 * stat cards to the chosen period (the Analytics Overview / Recent
 * Transactions widgets below are not scoped by it — hence the label says
 * "Summary", not "Dashboard").
 */
interface WelcomeBannerProps {
    dateFrom?: string;
    dateTo?: string;
    onDateRangeChange?: (dateFrom: string, dateTo: string) => void;
    onReset?: () => void;
    onRefresh?: () => void | Promise<void>;
}

export function WelcomeBanner({ dateFrom, dateTo, onDateRangeChange, onReset, onRefresh }: WelcomeBannerProps) {
    const [refreshing, setRefreshing] = useState(false);

    const handleRefreshClick = async () => {
        if (refreshing) return;
        setRefreshing(true);
        try {
            await onRefresh?.();
        } finally {
            // Keep the spin visible briefly even on instant refreshes
            setTimeout(() => setRefreshing(false), 500);
        }
    };

    // The dashboard period defaults to today — show the reset button only
    // when the selected range has drifted from that default.
    const now = new Date();
    const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const isDefaultRange = dateFrom === todayISO && dateTo === todayISO;

    return (
        <div className="dashboard-welcome">
            <div className="period-selector-wrap">
                <DateRangePicker
                    dateFrom={dateFrom}
                    dateTo={dateTo}
                    align="left"
                    labelPrefix="Summary period:"
                    appendDates
                    onChange={(from, to) => onDateRangeChange?.(from, to)}
                />
                {!isDefaultRange && onReset && (
                    <button
                        type="button"
                        className="tr-filter-reset tr-filter-reset--danger"
                        onClick={onReset}
                    >
                        Reset
                    </button>
                )}
            </div>

            <button
                type="button"
                className="refresh-btn"
                onClick={handleRefreshClick}
                aria-label="Refresh dashboard data"
                disabled={refreshing}
            >
                <RefreshIcon size={14} className={refreshing ? 'refresh-btn-icon spinning' : 'refresh-btn-icon'} />
                <span>Refresh</span>
            </button>
        </div>
    );
}