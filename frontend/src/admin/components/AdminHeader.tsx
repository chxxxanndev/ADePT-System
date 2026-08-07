import { useRef, useState } from 'react';
import { CalendarIcon, ChevronDownIcon, MenuIcon } from '../../users/components/icons';
import type { User } from '../../auth-folder/types/auth';
import { CalendarPicker } from './Calendarpicker';
import { FloatingPopover } from '../../shared/components/FloatingPopover';

interface AdminHeaderProps {
    user: User;
    dateFilter: string;
    onToggleMobileMenu: () => void;
    onDateFilterChange?: (period: string, range: { from: string; to: string }) => void;
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

// Returns the inclusive [from, to] date range (YYYY-MM-DD) for a period label.
function toLocalISO(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function rangeForPeriod(period: string): { from: string; to: string } {
    const now = new Date();
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

    switch (period) {
        case 'Today': {
            const d = startOfDay(now);
            return { from: toLocalISO(d), to: toLocalISO(d) };
        }
        case 'Yesterday': {
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            return { from: toLocalISO(d), to: toLocalISO(d) };
        }
        case 'This Week': {
            const start = startOfDay(now);
            const dow = (start.getDay() + 6) % 7; // Monday = 0
            const from = new Date(start.getFullYear(), start.getMonth(), start.getDate() - dow);
            const to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 6);
            return { from: toLocalISO(from), to: toLocalISO(to) };
        }
        case 'Last Week': {
            const start = startOfDay(now);
            const dow = (start.getDay() + 6) % 7;
            const mondayThisWeek = new Date(start.getFullYear(), start.getMonth(), start.getDate() - dow);
            const from = new Date(mondayThisWeek.getFullYear(), mondayThisWeek.getMonth(), mondayThisWeek.getDate() - 7);
            const to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 6);
            return { from: toLocalISO(from), to: toLocalISO(to) };
        }
        case 'This Month': {
            const from = new Date(now.getFullYear(), now.getMonth(), 1);
            const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            return { from: toLocalISO(from), to: toLocalISO(to) };
        }
        case 'Last Month': {
            const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const to = new Date(now.getFullYear(), now.getMonth(), 0);
            return { from: toLocalISO(from), to: toLocalISO(to) };
        }
        case 'This Quarter': {
            const quarter = Math.floor(now.getMonth() / 3);
            const from = new Date(now.getFullYear(), quarter * 3, 1);
            const to = new Date(now.getFullYear(), quarter * 3 + 3, 0);
            return { from: toLocalISO(from), to: toLocalISO(to) };
        }
        case 'Last Quarter': {
            const quarter = Math.floor(now.getMonth() / 3) - 1;
            const from = new Date(now.getFullYear(), quarter * 3, 1);
            const to = new Date(now.getFullYear(), quarter * 3 + 3, 0);
            return { from: toLocalISO(from), to: toLocalISO(to) };
        }
        case 'This Year': {
            const from = new Date(now.getFullYear(), 0, 1);
            const to = new Date(now.getFullYear(), 11, 31);
            return { from: toLocalISO(from), to: toLocalISO(to) };
        }
        default:
            return { from: toLocalISO(startOfDay(now)), to: toLocalISO(startOfDay(now)) };
    }
}

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

function formatLastLogin(dateString?: string) {
    if (!dateString) return 'Just now';
    try {
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return dateString;
        const now = new Date();
        const isToday =
            date.getFullYear() === now.getFullYear() &&
            date.getMonth() === now.getMonth() &&
            date.getDate() === now.getDate();
        const timePart = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        if (isToday) return `Today • ${timePart}`;
        const dayPart = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `${dayPart} • ${timePart}`;
    } catch {
        return dateString;
    }
}

export function AdminHeader({
    user,
    dateFilter,
    onToggleMobileMenu,
    onDateFilterChange
}: AdminHeaderProps) {
    const fullName = `${user.firstName || 'Mommy'} ${user.lastName || 'Dionisia'}`;
    const initials = `${user.firstName?.[0] || 'M'}${user.lastName?.[0] || 'D'}`;

    const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
    const [view, setView] = useState<'list' | 'calendar'>('list');
    const dateDropdownRef = useRef<HTMLDivElement>(null);

    function handleSelectPeriod(period: string) {
        if (period === 'Custom Range...') {
            setView('calendar');
            return;
        }
        onDateFilterChange?.(period, rangeForPeriod(period));
        setDateDropdownOpen(false);
        setView('list');
    }

    function handleApplyRange(start: Date, end: Date) {
        const label = isSameDate(start, end)
            ? formatShort(start)
            : `${formatShort(start)} \u2013 ${formatShort(end)}`;
        onDateFilterChange?.(label, { from: toLocalISO(start), to: toLocalISO(end) });
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

                <div className="header-profile">
                    <div className="header-profile-card">
                        <div className="header-profile-avatar">
                            {user.avatarUrl ? (
                                <img
                                    src={user.avatarUrl}
                                    alt={fullName}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        borderRadius: '50%',
                                        objectFit: 'cover',
                                        display: 'block'
                                    }}
                                />
                            ) : (
                                initials
                            )}
                        </div>
                        <div className="header-profile-namebox">
                            <span className="header-profile-name">{fullName}</span>
                            <span className="header-profile-email">{user.email || 'provincialassessor@gmail.com'}</span>
                        </div>
                    </div>
                    <div className="header-profile-meta">
                        <span className="header-profile-role">{roleLabel(user)}</span>
                        <span className="header-profile-last-login">Last Login : {formatLastLogin(user.lastLogin)}</span>
                    </div>
                </div>
            </div>

            <div className="header-actions-row" style={{ justifyContent: 'flex-end' }}>

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

                    <FloatingPopover
                        open={dateDropdownOpen}
                        triggerRef={dateDropdownRef}
                        onClose={() => {
                            setDateDropdownOpen(false);
                            setView('list');
                        }}
                        className={`period-dropdown${view === 'calendar' ? ' period-dropdown-calendar' : ''}`}
                    >
                        {view === 'list' && (
                            <>
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
                            </>
                        )}

                        {view === 'calendar' && (
                            <CalendarPicker onApply={handleApplyRange} onCancel={() => setView('list')} />
                        )}
                    </FloatingPopover>
                </div>
            </div>
        </header>
    );
}