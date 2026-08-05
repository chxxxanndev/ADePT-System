import { useState, useEffect, useRef } from 'react';
// REMOVED the conflicting UserProfile import from here
import { MenuIcon, CalendarIcon, UserIcon, PeriodToggleIcon, RefreshIcon } from './icons';
import type { PeriodRange } from '../types/dashboard';

// Calendar navigation chevrons — same SVG shapes as the Transaction
// Registry's DateRangePicker so the dashboard calendar matches it exactly.
const ChevronLeft = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>;
const ChevronRight = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>;

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
    title?: string;
    subtitle?: string;
    brandMode?: boolean;
}

export function DashboardHeader({
    user,
    userName,
    onToggleMobileMenu,
    title = 'Dashboard',
    subtitle,
    brandMode = false,
}: DashboardHeaderProps) {
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
            <div className="header-profile">
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

export function resolvePeriodRange(label: string): PeriodRange | null {
    const now = new Date();
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const endOfDay = (d: Date) => { const e = new Date(d); e.setHours(23, 59, 59, 999); return e; };
    const startOfWeek = (d: Date) => {
        const date = startOfDay(d);
        const day = date.getDay();
        const diff = (day === 0 ? -6 : 1) - day; // Monday start
        date.setDate(date.getDate() + diff);
        return date;
    };

    switch (label) {
        case 'Today':
            return { from: startOfDay(now), to: endOfDay(now) };
        case 'Yesterday': {
            const y = new Date(now); y.setDate(y.getDate() - 1);
            return { from: startOfDay(y), to: endOfDay(y) };
        }
        case 'This Week':
            return { from: startOfWeek(now), to: endOfDay(now) };
        case 'Last Week': {
            const thisWeekStart = startOfWeek(now);
            const lastWeekStart = new Date(thisWeekStart);
            lastWeekStart.setDate(lastWeekStart.getDate() - 7);
            const lastWeekEnd = new Date(thisWeekStart.getTime() - 1);
            return { from: lastWeekStart, to: endOfDay(lastWeekEnd) };
        }
        case 'This Month':
            return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now) };
        case 'Last Month': {
            const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const end = new Date(now.getFullYear(), now.getMonth(), 0);
            return { from: start, to: endOfDay(end) };
        }
        case 'This Quarter': {
            const q = Math.floor(now.getMonth() / 3);
            return { from: new Date(now.getFullYear(), q * 3, 1), to: endOfDay(now) };
        }
        case 'Last Quarter': {
            const q = Math.floor(now.getMonth() / 3);
            const start = new Date(now.getFullYear(), (q - 1) * 3, 1);
            const end = new Date(now.getFullYear(), q * 3, 0);
            return { from: start, to: endOfDay(end) };
        }
        case 'This Year':
            return { from: new Date(now.getFullYear(), 0, 1), to: endOfDay(now) };
        default:
            return null; // 'Custom Range...' is handled separately via handleApplyRange
    }
}

function isSameDay(a: Date | null, b: Date | null) {
    return !!a && !!b &&
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();
}

interface CalendarPickerProps {
    onApply: (start: Date, end: Date) => void;
    onCancel: () => void;
    onClear?: () => void;
}

function CalendarPicker({ onApply, onCancel, onClear }: CalendarPickerProps) {
    const today = new Date();
    const [viewMonth, setViewMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
    const [rangeStart, setRangeStart] = useState<Date | null>(null);
    const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
    const [hoverDate, setHoverDate] = useState<Date | null>(null);

    const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
    const leading = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1).getDay();

    const days: (Date | null)[] = [];
    for (let i = 0; i < leading; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));

    const isInRange = (d: Date) => {
        if (!rangeStart) return false;
        const end = rangeEnd || hoverDate;
        if (!end) return false;
        const lo = rangeStart <= end ? rangeStart : end;
        const hi = rangeStart <= end ? end : rangeStart;
        return d > lo && d < hi;
    };

    const handleDayClick = (d: Date) => {
        if (!rangeStart || (rangeStart && rangeEnd)) {
            setRangeStart(d);
            setRangeEnd(null);
        } else if (d < rangeStart) {
            setRangeEnd(rangeStart);
            setRangeStart(d);
        } else {
            setRangeEnd(d);
        }
    };

    // Mirror the registry's Range Picker: "Done" applies a complete range
    // and closes; an incomplete selection just closes (like the registry).
    const handleDone = () => {
        if (rangeStart && rangeEnd) onApply(rangeStart, rangeEnd);
        else onCancel();
    };

    const weekdays = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    const monthLabel = viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
        <div className="dash-cal-panel">
            <div className="dash-cal-header">
                <button
                    type="button"
                    className="dash-cal-nav-btn"
                    onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
                    aria-label="Previous month"
                ><ChevronLeft /></button>
                <span className="dash-cal-title">{monthLabel}</span>
                <button
                    type="button"
                    className="dash-cal-nav-btn"
                    onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
                    aria-label="Next month"
                ><ChevronRight /></button>
            </div>

            <div className="dash-cal-weekdays">
                {weekdays.map((w) => <span key={w} className="dash-cal-weekday">{w}</span>)}
            </div>

            <div className="dash-cal-grid">
                {days.map((d, i) => {
                    if (!d) return <span key={`empty-${i}`} className="dash-cal-day dash-cal-day--empty" />;
                    const isStart = isSameDay(d, rangeStart);
                    const isEnd = isSameDay(d, rangeEnd);
                    return (
                        <button
                            type="button"
                            key={d.toISOString()}
                            className={[
                                'dash-cal-day',
                                (isStart || isEnd) ? 'dash-cal-day--selected' : '',
                                isInRange(d) ? 'dash-cal-day--in-range' : '',
                                isSameDay(d, today) && !isStart && !isEnd ? 'dash-cal-day--today' : '',
                            ].filter(Boolean).join(' ')}
                            onMouseEnter={() => setHoverDate(d)}
                            onClick={() => handleDayClick(d)}
                        >
                            {d.getDate()}
                        </button>
                    );
                })}
            </div>

            <div className="dash-cal-footer">
                <button type="button" className="dash-cal-clear-btn" onClick={() => { setRangeStart(null); setRangeEnd(null); onClear?.(); }}>
                    Clear
                </button>
                <button type="button" className="dash-cal-done-btn" onClick={handleDone}>
                    Done
                </button>
            </div>
        </div>
    );
}

/**
 * FIXED: Defined WelcomeBannerProps to solve the "Cannot find name" error.
 * Added onRefresh so the parent (Dashboard.tsx) can wire this to
 * analytics.refetch() / refetchNotifications() / etc.
 */
interface WelcomeBannerProps {
    initialPeriod?: string;
    onPeriodChange?: (period: string, range: PeriodRange | null) => void;
    onRefresh?: () => void | Promise<void>;
}

export function WelcomeBanner({ initialPeriod = 'Today', onPeriodChange, onRefresh }: WelcomeBannerProps) {
    const [period, setPeriod] = useState(initialPeriod);
    const [open, setOpen] = useState(false);
    // Two-page layout (mirrors the registry's DateRangePicker): the
    // popover opens as a single-column preset list; choosing "Custom
    // Range..." expands it into a two-pane spread — preset list on the
    // left, calendar on the right.
    const [showCalendar, setShowCalendar] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const closeDropdown = () => {
        setOpen(false);
        setShowCalendar(false);
    };

    const handleSelect = (value: string) => {
        if (value === 'Custom Range...') {
            setShowCalendar(true);
            return;
        }
        setPeriod(value);
        onPeriodChange?.(value, resolvePeriodRange(value));
        closeDropdown();
    };

    // Highlight the preset whose label matches the applied period; any
    // applied custom range (e.g. "Aug 1 – Aug 5") lights up the divider's
    // "Custom Range..." item, same as the registry's active-preset state.
    const activePreset = PERIOD_OPTIONS.includes(period) ? period : 'Custom Range...';

    const handleApplyRange = (start: Date, end: Date) => {
        const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const label = `${fmt(start)} – ${fmt(end)}`;
        setPeriod(label);
        const endOfDay = new Date(end);
        endOfDay.setHours(23, 59, 59, 999);
        onPeriodChange?.(label, { from: start, to: endOfDay });
        // Mirror the registry's Done: close without collapsing the layout
        // (the calendar stays open next time, matching the registry).
        setOpen(false);
    };

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

    return (
        <div className="dashboard-welcome">
            <div className="period-selector-wrap" ref={wrapRef}>
                <button
                    type="button"
                    className="period-selector"
                    onClick={() => setOpen((prev) => !prev)}
                    aria-haspopup="listbox"
                    aria-expanded={open}
                >
                    <CalendarIcon size={14} />
                    <span className="period-selector-label">Dashboard Period :</span>
                    <span className="period-selector-value">{period}</span>
                    <PeriodToggleIcon size={16} className={`period-selector-toggle${open ? ' open' : ''}`} />
                </button>

                {open && (
                    <div className={`period-dropdown${showCalendar ? ' period-dropdown--wide' : ''}`}>
                        <div className="dash-preset-list" role="listbox">
                            {PERIOD_OPTIONS.map((opt) => (
                                <button
                                    key={opt}
                                    type="button"
                                    role="option"
                                    aria-selected={activePreset === opt}
                                    className={[
                                        'dash-preset-item',
                                        activePreset === opt ? 'dash-preset-item--active' : '',
                                        opt === 'Custom Range...' ? 'dash-preset-item--divider' : '',
                                    ].filter(Boolean).join(' ')}
                                    onClick={() => handleSelect(opt)}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>

                        {showCalendar && (
                            <CalendarPicker
                                onApply={handleApplyRange}
                                onCancel={() => setOpen(false)}
                                onClear={() => setShowCalendar(false)}
                            />
                        )}
                    </div>
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