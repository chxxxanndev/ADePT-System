import { useEffect, useRef, useState } from 'react';
import { FloatingPopover } from '../../shared/components/FloatingPopover';
import '../styles/CustomDateInput.css';

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function toISO(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseISO(s: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    const [y, m, d] = s.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date && toISO(date) === s ? date : null;
}

function isToday(d: Date): boolean {
    return toISO(d) === toISO(new Date());
}

interface CustomDateInputProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
    placeholder?: string;
    id?: string;
    /** Anchor the calendar popover to the calendar icon instead of the
     *  input's left edge (used by wide full-width fields like the
     *  Request form's Date of Request). */
    anchorToIcon?: boolean;
}

const CalendarIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);

const ChevronLeft = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
    </svg>
);

const ChevronRight = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
    </svg>
);

/** Custom date input with the ADePT redesigned calendar card.
 *  Replaces the native <input type="date"> popup (which browsers render
 *  unstylable) with a matching text field — same className passthrough,
 *  same ISO "YYYY-MM-DD" value handling — plus our own calendar panel
 *  rendered in a portal so it is never clipped. */
export function CustomDateInput({ value, onChange, className, placeholder, id, anchorToIcon = false }: CustomDateInputProps) {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);
    const iconBtnRef = useRef<HTMLButtonElement>(null);
    const [view, setView] = useState<Date>(() => {
        const d = parseISO(value);
        return d ? new Date(d.getFullYear(), d.getMonth(), 1) : new Date();
    });

    useEffect(() => {
        const d = parseISO(value);
        if (d) setView(new Date(d.getFullYear(), d.getMonth(), 1));
    }, [value]);

    const monthLabel = view.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const firstDow = new Date(view.getFullYear(), view.getMonth(), 1).getDay();
    const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = [
        ...Array.from({ length: firstDow }, () => null),
        ...Array.from({ length: daysInMonth }, (_, i) => new Date(view.getFullYear(), view.getMonth(), i + 1)),
    ];

    const handleSelect = (day: Date) => {
        onChange(toISO(day));
        setOpen(false);
    };

    const handleToday = () => {
        onChange(toISO(new Date()));
        setOpen(false);
    };

    const handleClear = () => {
        onChange('');
        setOpen(false);
    };

    return (
        <>
            <div className="cdi-wrap" ref={wrapRef}>
                <input
                    id={id}
                    type="text"
                    readOnly
                    className={`cdi-input ${className ?? ''}`.trim()}
                    value={value}
                    placeholder={placeholder ?? 'YYYY-MM-DD'}
                    onFocus={() => setOpen(true)}
                />
                <button
                    type="button"
                    className="cdi-calendar-btn"
                    aria-label="Open calendar"
                    tabIndex={-1}
                    ref={iconBtnRef}
                    onClick={() => setOpen((o) => !o)}
                >
                    <CalendarIcon />
                </button>
            </div>

            <FloatingPopover
                open={open}
                triggerRef={anchorToIcon ? iconBtnRef : wrapRef}
                align={anchorToIcon ? 'right' : 'left'}
                onClose={() => setOpen(false)}
                className="cdi-popover"
            >
                <div className="cdi-cal">
                    <div className="cdi-cal-header">
                        <button type="button" className="cdi-cal-nav" onClick={() => setView((v) => new Date(v.getFullYear(), v.getMonth() - 1, 1))} aria-label="Previous month">
                            <ChevronLeft />
                        </button>
                        <span className="cdi-cal-title">{monthLabel}</span>
                        <button type="button" className="cdi-cal-nav" onClick={() => setView((v) => new Date(v.getFullYear(), v.getMonth() + 1, 1))} aria-label="Next month">
                            <ChevronRight />
                        </button>
                    </div>

                    <div className="cdi-cal-weekdays">
                        {WEEKDAY_LABELS.map((w) => <span key={w} className="cdi-cal-weekday">{w}</span>)}
                    </div>

                    <div className="cdi-cal-grid">
                        {cells.map((day, i) => {
                            if (!day) return <span key={`empty-${i}`} className="cdi-cal-day cdi-cal-day--empty" />;
                            const iso = toISO(day);
                            const isSelected = iso === value;
                            const isCurrent = isToday(day);
                            const classNames = [
                                'cdi-cal-day',
                                isSelected && 'cdi-cal-day--selected',
                                !isSelected && isCurrent && 'cdi-cal-day--today',
                            ].filter(Boolean).join(' ');
                            return (
                                <button
                                    key={iso}
                                    type="button"
                                    className={classNames}
                                    onClick={() => handleSelect(day)}
                                >
                                    {day.getDate()}
                                </button>
                            );
                        })}
                    </div>

                    <div className="cdi-cal-footer">
                        <button type="button" className="cdi-cal-today-btn" onClick={handleToday}>Today</button>
                        <button type="button" className="cdi-cal-clear-btn" onClick={handleClear}>Clear</button>
                    </div>
                </div>
            </FloatingPopover>
        </>
    );
}