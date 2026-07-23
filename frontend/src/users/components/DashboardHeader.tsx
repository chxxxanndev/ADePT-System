import { useState, useEffect, useRef  } from 'react';
// REMOVED the conflicting UserProfile import from here
import { SearchIcon, MenuIcon, CalendarIcon, UserIcon, PeriodToggleIcon } from './icons';

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
                        <div className="header-brand-logo">📋</div>
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
                    <span className="header-profile-lastlogin">Last Login : {user.lastLogin}</span>
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

function isSameDay(a: Date | null, b: Date | null) {
    return !!a && !!b &&
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();
}

interface CalendarPickerProps {
    onApply: (start: Date, end: Date) => void;
    onCancel: () => void;
}

function CalendarPicker({ onApply, onCancel }: CalendarPickerProps) {
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

    const monthLabel = viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return (
        <div className="calendar-picker">
            <div className="calendar-picker-header">
                <button
                    type="button"
                    className="calendar-nav-btn"
                    onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
                >‹</button>
                <span className="calendar-month-label">{monthLabel}</span>
                <button
                    type="button"
                    className="calendar-nav-btn"
                    onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
                >›</button>
            </div>

            <div className="calendar-weekdays">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((w) => (
                    <span key={w} className="calendar-weekday">{w}</span>
                ))}
            </div>

            <div className="calendar-grid">
                {days.map((d, i) => {
                    if (!d) return <span key={`empty-${i}`} className="calendar-cell empty" />;
                    const isStart = isSameDay(d, rangeStart);
                    const isEnd = isSameDay(d, rangeEnd);
                    return (
                        <button
                            type="button"
                            key={d.toISOString()}
                            className={[
                                'calendar-cell',
                                isStart ? 'range-start' : '',
                                isEnd ? 'range-end' : '',
                                isInRange(d) ? 'in-range' : '',
                                isSameDay(d, today) ? 'is-today' : '',
                            ].filter(Boolean).join(' ')}
                            onMouseEnter={() => setHoverDate(d)}
                            onClick={() => handleDayClick(d)}
                        >
                            {d.getDate()}
                        </button>
                    );
                })}
            </div>

            <div className="calendar-picker-footer">
                <span className="calendar-range-preview">
                    {rangeStart ? fmt(rangeStart) : 'Start'} – {rangeEnd ? fmt(rangeEnd) : 'End'}
                </span>
                <div className="calendar-picker-actions">
                    <button type="button" className="calendar-btn calendar-btn-ghost" onClick={onCancel}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="calendar-btn calendar-btn-primary"
                        disabled={!rangeStart || !rangeEnd}
                        onClick={() => rangeStart && rangeEnd && onApply(rangeStart, rangeEnd)}
                    >
                        Apply
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * FIXED: Defined WelcomeBannerProps to solve the "Cannot find name" error.
 */
interface WelcomeBannerProps {
    initialPeriod?: string;
    onPeriodChange?: (period: string) => void;
}

export function WelcomeBanner({ initialPeriod = 'Today', onPeriodChange }: WelcomeBannerProps) {
    const [period, setPeriod] = useState(initialPeriod);
    const [open, setOpen] = useState(false);
    const [view, setView] = useState<'list' | 'calendar'>('list');
    const wrapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
                setOpen(false);
                setView('list');
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const closeDropdown = () => {
        setOpen(false);
        setView('list');
    };

    const handleSelect = (value: string) => {
        if (value === 'Custom Range...') {
            setView('calendar');
            return;
        }
        setPeriod(value);
        onPeriodChange?.(value);
        closeDropdown();
    };

    const handleApplyRange = (start: Date, end: Date) => {
        const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const label = `${fmt(start)} – ${fmt(end)}`;
        setPeriod(label);
        onPeriodChange?.(label);
        closeDropdown();
    };

    return (
        <div className="dashboard-welcome">
            <div className="header-search">
                <SearchIcon size={16} />
                <input type="text" placeholder="Search by Control No, Declarant, ARP No, OR Number..." />
            </div>

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

                {open && view === 'list' && (
                    <ul className="period-dropdown" role="listbox">
                        {PERIOD_OPTIONS.map((opt) => (
                            <li
                                key={opt}
                                role="option"
                                aria-selected={opt === period}
                                className={`period-dropdown-item${opt === period ? ' active' : ''}`}
                                onClick={() => handleSelect(opt)}
                            >
                                {opt}
                            </li>
                        ))}
                    </ul>
                )}

                {open && view === 'calendar' && (
                    <div className="period-dropdown period-dropdown-calendar">
                        <CalendarPicker onApply={handleApplyRange} onCancel={() => setView('list')} />
                    </div>
                )}
            </div>
        </div>
    );
}