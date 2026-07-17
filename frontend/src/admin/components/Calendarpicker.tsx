import { useState } from 'react';

interface CalendarPickerProps {
    onApply: (start: Date, end: Date) => void;
    onCancel: () => void;
}

const WEEKDAY_LABELS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

function isSameDay(a: Date | null, b: Date | null) {
    if (!a || !b) return false;
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

function formatShort(date: Date) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Note: this component renders ONLY the calendar's inner content — no
// absolutely-positioned wrapper. The parent is expected to render it inside
// a wrapper like: <div className="period-dropdown period-dropdown-calendar">
export function CalendarPicker({ onApply, onCancel }: CalendarPickerProps) {
    const today = new Date();
    const [viewMonth, setViewMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
    const [rangeStart, setRangeStart] = useState<Date | null>(null);
    const [rangeEnd, setRangeEnd] = useState<Date | null>(null);

    const monthLabel = viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Build the 7-wide day grid, with leading blanks for the first week
    const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
    const leadingBlanks = firstOfMonth.getDay(); // 0 = Sunday

    const cells: (Date | null)[] = [
        ...Array(leadingBlanks).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i + 1)),
    ];

    function goToPrevMonth() {
        setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
    }

    function goToNextMonth() {
        setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1));
    }

    function handleDayClick(day: Date) {
        // No start yet, or both already set → start a fresh range
        if (!rangeStart || (rangeStart && rangeEnd)) {
            setRangeStart(day);
            setRangeEnd(null);
            return;
        }
        // Have a start, picking the end
        if (day < rangeStart) {
            setRangeEnd(rangeStart);
            setRangeStart(day);
        } else {
            setRangeEnd(day);
        }
    }

    function isInRange(day: Date) {
        if (!rangeStart || !rangeEnd) return false;
        return day > rangeStart && day < rangeEnd;
    }

    function handleApply() {
        if (rangeStart) {
            onApply(rangeStart, rangeEnd ?? rangeStart);
        }
    }

    const rangeLabel =
        rangeStart && rangeEnd
            ? `${formatShort(rangeStart)} \u2013 ${formatShort(rangeEnd)}`
            : rangeStart
                ? `${formatShort(rangeStart)} \u2013 End`
                : 'Start \u2013 End';

    return (
        <>
            <div className="calendar-month-nav">
                <button type="button" className="calendar-nav-btn" onClick={goToPrevMonth} aria-label="Previous month">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>
                <span className="calendar-month-label">{monthLabel}</span>
                <button type="button" className="calendar-nav-btn" onClick={goToNextMonth} aria-label="Next month">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                </button>
            </div>

            <div className="calendar-weekday-row">
                {WEEKDAY_LABELS.map((label) => (
                    <span key={label} className="calendar-weekday-cell">{label}</span>
                ))}
            </div>

            <div className="calendar-day-grid">
                {cells.map((day, index) => {
                    if (!day) {
                        return <span key={`blank-${index}`} className="calendar-day-cell empty" />;
                    }
                    const isToday = isSameDay(day, today);
                    const isStart = isSameDay(day, rangeStart);
                    const isEnd = isSameDay(day, rangeEnd);
                    const inRange = isInRange(day);

                    const classNames = [
                        'calendar-day-cell',
                        isToday ? 'today' : '',
                        isStart || isEnd ? 'selected' : '',
                        inRange ? 'in-range' : '',
                    ].filter(Boolean).join(' ');

                    return (
                        <button
                            key={day.toISOString()}
                            type="button"
                            className={classNames}
                            onClick={() => handleDayClick(day)}
                        >
                            {day.getDate()}
                        </button>
                    );
                })}
            </div>

            <div className="calendar-footer-row">
                <span className="calendar-range-label">{rangeLabel}</span>
                <div className="calendar-footer-actions">
                    <button type="button" className="calendar-cancel-btn" onClick={onCancel}>
                        Cancel
                    </button>
                    <button type="button" className="calendar-apply-btn" onClick={handleApply} disabled={!rangeStart}>
                        Apply
                    </button>
                </div>
            </div>
        </>
    );
}