import { useState, useRef, useEffect, useMemo } from 'react';

const CalendarIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
const ChevronLeft = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>;
const ChevronRight = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>;

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

function toISO(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fromISO(s: string): Date {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
}

function formatDisplay(s: string): string {
    const d = fromISO(s);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function startOfWeek(d: Date): Date {
    const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    out.setDate(out.getDate() - out.getDay());
    return out;
}

function endOfWeek(d: Date): Date {
    const out = startOfWeek(d);
    out.setDate(out.getDate() + 6);
    return out;
}

function startOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function startOfQuarter(d: Date): Date {
    const q = Math.floor(d.getMonth() / 3);
    return new Date(d.getFullYear(), q * 3, 1);
}

function endOfQuarter(d: Date): Date {
    const q = Math.floor(d.getMonth() / 3);
    return new Date(d.getFullYear(), q * 3 + 3, 0);
}

type PresetKey =
    | 'today' | 'yesterday' | 'thisWeek' | 'lastWeek'
    | 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'lastQuarter'
    | 'thisYear' | 'custom';

interface Preset {
    key: PresetKey;
    label: string;
    range?: () => [Date, Date];
}

const PRESETS: Preset[] = [
    { key: 'today', label: 'Today', range: () => { const t = new Date(); return [t, t]; } },
    { key: 'yesterday', label: 'Yesterday', range: () => { const t = new Date(); t.setDate(t.getDate() - 1); return [t, t]; } },
    { key: 'thisWeek', label: 'This Week', range: () => { const t = new Date(); return [startOfWeek(t), t]; } },
    { key: 'lastWeek', label: 'Last Week', range: () => { const t = new Date(); t.setDate(t.getDate() - 7); return [startOfWeek(t), endOfWeek(t)]; } },
    { key: 'thisMonth', label: 'This Month', range: () => { const t = new Date(); return [startOfMonth(t), t]; } },
    { key: 'lastMonth', label: 'Last Month', range: () => { const t = new Date(); const prev = new Date(t.getFullYear(), t.getMonth() - 1, 1); return [startOfMonth(prev), endOfMonth(prev)]; } },
    { key: 'thisQuarter', label: 'This Quarter', range: () => { const t = new Date(); return [startOfQuarter(t), t]; } },
    { key: 'lastQuarter', label: 'Last Quarter', range: () => { const t = new Date(); const prevQ = new Date(t.getFullYear(), t.getMonth() - 3, 1); return [startOfQuarter(prevQ), endOfQuarter(prevQ)]; } },
    { key: 'thisYear', label: 'This Year', range: () => { const t = new Date(); return [new Date(t.getFullYear(), 0, 1), t]; } },
    { key: 'custom', label: 'Custom Range...' },
];

interface DateRangePickerProps {
    dateFrom?: string;
    dateTo?: string;
    onChange: (dateFrom: string, dateTo: string) => void;
}

export function DateRangePicker({ dateFrom, dateTo, onChange }: DateRangePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [activePreset, setActivePreset] = useState<PresetKey | null>(null);
    const [showCalendar, setShowCalendar] = useState(false);
    const [viewDate, setViewDate] = useState(() => (dateFrom ? fromISO(dateFrom) : new Date()));
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const today = useMemo(() => new Date(), []);
    const todayISO = toISO(today);

    const days = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const startOffset = firstDay.getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const cells: (Date | null)[] = [];
        for (let i = 0; i < startOffset; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
        return cells;
    }, [viewDate]);

    const handlePresetClick = (preset: Preset) => {
        if (preset.key === 'custom') {
            setActivePreset('custom');
            setShowCalendar(true);
            return;
        }
        const [from, to] = preset.range!();
        setActivePreset(preset.key);
        setViewDate(from);
        onChange(toISO(from), toISO(to));
        setShowCalendar(false);
        setIsOpen(false);
    };

    const handleDayClick = (day: Date) => {
        const iso = toISO(day);
        setActivePreset('custom');
        if (!dateFrom || (dateFrom && dateTo)) {
            onChange(iso, '');
        } else {
            if (iso < dateFrom) {
                onChange(iso, dateFrom);
            } else {
                onChange(dateFrom, iso);
            }
        }
    };

    const goPrevMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    const goNextMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

    const handleClear = () => {
        onChange('', '');
        setActivePreset(null);
        setShowCalendar(false);
    };

    const label = dateFrom
        ? dateTo
            ? `${formatDisplay(dateFrom)} – ${formatDisplay(dateTo)}`
            : formatDisplay(dateFrom)
        : 'Select date range';

    return (
        <div className="tr-daterange" ref={wrapperRef}>
            <button
                type="button"
                className={`tr-daterange-btn${dateFrom ? ' has-value' : ''}`}
                onClick={() => setIsOpen((o) => !o)}
            >
                <CalendarIcon />
                <span>{label}</span>
            </button>

            {isOpen && (
                <div className={`tr-daterange-popover${showCalendar ? ' tr-daterange-popover--wide' : ''}`}>
                    <div className="tr-preset-list">
                        {PRESETS.map((preset) => (
                            <button
                                key={preset.key}
                                type="button"
                                className={[
                                    'tr-preset-item',
                                    activePreset === preset.key && 'tr-preset-item--active',
                                    preset.key === 'custom' && 'tr-preset-item--divider',
                                ].filter(Boolean).join(' ')}
                                onClick={() => handlePresetClick(preset)}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>

                    {showCalendar && (
                        <div className="tr-cal-panel">
                            <div className="tr-cal-header">
                                <button type="button" className="tr-cal-nav-btn" onClick={goPrevMonth} aria-label="Previous month">
                                    <ChevronLeft />
                                </button>
                                <span className="tr-cal-title">{MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
                                <button type="button" className="tr-cal-nav-btn" onClick={goNextMonth} aria-label="Next month">
                                    <ChevronRight />
                                </button>
                            </div>

                            <div className="tr-cal-weekdays">
                                {WEEKDAYS.map((w) => <span key={w} className="tr-cal-weekday">{w}</span>)}
                            </div>

                            <div className="tr-cal-grid">
                                {days.map((day, i) => {
                                    if (!day) return <span key={`empty-${i}`} className="tr-cal-day tr-cal-day--empty" />;
                                    const iso = toISO(day);
                                    const isFrom = iso === dateFrom;
                                    const isTo = iso === dateTo;
                                    const inRange = !!dateFrom && !!dateTo && iso > dateFrom && iso < dateTo;
                                    const isToday = iso === todayISO;

                                    return (
                                        <button
                                            type="button"
                                            key={iso}
                                            className={[
                                                'tr-cal-day',
                                                (isFrom || isTo) && 'tr-cal-day--selected',
                                                inRange && 'tr-cal-day--in-range',
                                                isToday && !isFrom && !isTo && 'tr-cal-day--today',
                                            ].filter(Boolean).join(' ')}
                                            onClick={() => handleDayClick(day)}
                                        >
                                            {day.getDate()}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="tr-cal-footer">
                                <button type="button" className="tr-cal-clear-btn" onClick={handleClear}>
                                    Clear
                                </button>
                                <button type="button" className="tr-cal-done-btn" onClick={() => setIsOpen(false)}>
                                    Done
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}