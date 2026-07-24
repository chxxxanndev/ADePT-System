import { useEffect, useRef, useState } from 'react';
import { SearchIcon, CalendarIcon, ChevronDownIcon, MenuIcon } from '../../users/components/icons';
import type { User } from '../../auth-folder/types/auth';
import { CalendarPicker } from './Calendarpicker';

interface AdminHeaderProps {
    user: User;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    dateFilter: string;
    onToggleMobileMenu: () => void;
    onDateFilterChange?: (period: string) => void;
}

const PERIOD_OPTIONS = [
    'Today',
    'Yesterday',
    'This Week',
    'Last Week',
    'This Month',
    'Last Month',
    'This Quarter',
    'Last Quarter',
    'This Year',
    'Custom Range...',
];

function formatShort(date: Date) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isSameDate(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function roleLabel(user: User): string {
    if (user.role === 'SUPER_ADMIN') return 'Super Admin';
    if (user.role === 'ADMIN') {
        const level = user.adminLevel
            ? user.adminLevel.charAt(0) + user.adminLevel.slice(1).toLowerCase()
            : '';
        return level ? `Admin · ${level}` : 'Admin';
    }
    if (user.role === 'OFFICE_STAFF') return 'Office Staff';
    return user.role || 'Super Admin';
}

export function AdminHeader({
    user,
    searchQuery,
    setSearchQuery,
    dateFilter,
    onToggleMobileMenu,
    onDateFilterChange
}: AdminHeaderProps) {
    const fullName = `${user.firstName || 'Mommy'} ${user.lastName || 'Dionisia'}`;
    const initials = `${user.firstName?.[0] || 'M'}${user.lastName?.[0] || 'D'}`;

    const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
    const [view, setView] = useState<'list' | 'calendar'>('list');
    const dateDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dateDropdownRef.current && !dateDropdownRef.current.contains(event.target as Node)) {
                setDateDropdownOpen(false);
                setView('list');
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    function handleSelectPeriod(period: string) {
        if (period === 'Custom Range...') {
            setView('calendar');
            return;
        }
        onDateFilterChange?.(period);
        setDateDropdownOpen(false);
        setView('list');
    }

    function handleApplyRange(start: Date, end: Date) {
        const label = isSameDate(start, end)
            ? formatShort(start)
            : `${formatShort(start)} \u2013 ${formatShort(end)}`;
        onDateFilterChange?.(label);
        setDateDropdownOpen(false);
        setView('list');
    }

    return (
        <header className="admin-header">
            <div className="header-top-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <button className="mobile-menu-toggle" onClick={onToggleMobileMenu}>
                        <MenuIcon size={20} />
                    </button>
                    <div className="header-title-section">
                        <h1 className="header-dashboard-title">
                            <span style={{ color: '#D32F2F' }}>D</span>
                            <span style={{ color: '#FF9800' }}>A</span>
                            <span style={{ color: '#FDD835' }}>S</span>
                            <span style={{ color: '#4CAF50' }}>H</span>
                            <span style={{ color: '#00BCD4' }}>B</span>
                            <span style={{ color: '#1976D2' }}>O</span>
                            <span style={{ color: '#252175' }}>A</span>
                            <span style={{ color: '#9C27B0' }}>R</span>
                            <span style={{ color: '#E91E63' }}>D</span>
                        </h1>
                        <p className="header-dashboard-subtitle">
                            Welcome back, <strong>{fullName}</strong>! Today's operations overview for the Provincial Assessor's Office.
                        </p>
                    </div>
                </div>

                <div className="admin-profile-widget">
                    <div className="profile-widget-avatar-container">
                        {initials}
                    </div>
                    <div className="profile-widget-info">
                        <span className="profile-widget-name">{fullName}</span>
                        <span className="profile-widget-email">{user.email || 'provincialassessor@gmail.com'}</span>
                        <div className="profile-widget-meta">
                            <span className="profile-widget-role">
                                {roleLabel(user)}
                            </span>
                            <span>Last Login : Today • 8:12 AM</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="header-actions-row">
                <div className="admin-search-wrapper">
                    <span className="admin-search-icon">
                        <SearchIcon size={18} />
                    </span>
                    <input
                        type="text"
                        placeholder="Search by Account, Staff, Control No. or Document..."
                        className="admin-search-input"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="date-selector-wrapper" ref={dateDropdownRef}>
                    <button
                        className="date-selector-btn"
                        onClick={() => setDateDropdownOpen((prev) => !prev)}
                        type="button"
                    >
                        <CalendarIcon size={16} />
                        <span>Dashboard Period: <strong>{dateFilter}</strong></span>
                        <ChevronDownIcon size={14} />
                    </button>

                    {dateDropdownOpen && view === 'list' && (
                        <div className="period-dropdown">
                            {PERIOD_OPTIONS.map((period) => (
                                <button
                                    key={period}
                                    type="button"
                                    className={`date-selector-option ${period === dateFilter ? 'active' : ''}`}
                                    onClick={() => handleSelectPeriod(period)}
                                >
                                    {period}
                                </button>
                            ))}
                        </div>
                    )}

                    {dateDropdownOpen && view === 'calendar' && (
                        <div className="period-dropdown period-dropdown-calendar">
                            <CalendarPicker onApply={handleApplyRange} onCancel={() => setView('list')} />
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}