import { useState, useRef, useMemo } from 'react';
import { FloatingPopover } from '../../shared/components/FloatingPopover';
import '../styles/DateRangePicker.css';

const CalendarIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
const ChevronDown = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>;
const CheckIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
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
    /** Which edge of the trigger the popover aligns to. Defaults to 'right'
     * (correct for filter toolbars); the dashboard passes 'left' so the
     * popover opens into open space next to the welcome row. */
    align?: 'left' | 'right';
    /** Optional prefix shown inside the trigger pill before the selection
     * (e.g. "Dashboard period: Today"). Only the dashboard passes this. */
    labelPrefix?: string;
    onChange: (dateFrom: string, dateTo: string) => void;
}

export function DateRangePicker({ dateFrom, dateTo, align = 'right', labelPrefix, onChange }: DateRangePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    // Two-page layout: the popover opens as a single-column preset list;
    // choosing "Custom Range..." expands it into a two-pane spread
    // (preset list on the left, calendar on the right).
    const [showCalendar, setShowCalendar] = useState(false);
    const [viewDate, setViewDate] = useState(() => (dateFrom ? fromISO(dateFrom) : new Date()));
    const [hoverDate, setHoverDate] = useState<Date | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const today = useMemo(() => new Date(), []);
    const todayISO = toISO(today);

    // Hover range preview — same interaction as the dashboard's
    // CalendarPicker: once the start date is picked, hovering a day
    // previews the range tint before the second click commits it.
    const startDate = dateFrom ? fromISO(dateFrom) : null;
    const endDate = dateTo ? fromISO(dateTo) : null;

    const isInRange = (iso: string) => {
        if (!startDate) return false;
        const end = endDate || hoverDate;
        if (!end) return false;
        const d = fromISO(iso);
        const lo = startDate <= end ? startDate : end;
        const hi = startDate <= end ? end : startDate;
        return d > lo && d < hi;
    };

    // Which preset matches the CURRENT values — derived (not stored) so a
    // range set externally (e.g. the Dashboard defaulting to today) is
    // recognized and labelled correctly too.
    const activePresetKey = useMemo<PresetKey | null>(() => {
        if (!dateFrom && !dateTo) return null;
        for (const p of PRESETS) {
            if (!p.range) continue; // 'custom'
            const [f, t] = p.range();
            if (toISO(f) === dateFrom && toISO(t) === dateTo) return p.key;
        }
        return null;
    }, [dateFrom, dateTo]);

    // Trigger shows the friendly preset name when one applies ("Today",
    // "This Week", ...), and the exact dates otherwise — so what the user
    // sees matches the Dashboard card sublabels ("Today", "Aug 1 – Aug 19").
    const triggerLabel = useMemo(() => {
        if (activePresetKey) {
            return PRESETS.find((p) => p.key === activePresetKey)?.label ?? 'Select date range';
        }
        if (!dateFrom && !dateTo) return 'Select date range';
        return dateTo
            ? `${formatDisplay(dateFrom!)} – ${formatDisplay(dateTo)}`
            : formatDisplay(dateFrom!);
    }, [activePresetKey, dateFrom, dateTo]);

    // True when the range was picked manually (calendar / presets that
    // don't map back to a preset name) — the pill then shows the full
    // dates without truncation.
    const isCustomRange = !activePresetKey && !!(dateFrom || dateTo);

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
            setShowCalendar(true);
            return;
        }
        const [from, to] = preset.range!();
        setViewDate(from);
        onChange(toISO(from), toISO(to));
        setShowCalendar(false);
        setIsOpen(false);
    };

    const handleDayClick = (day: Date) => {
        const iso = toISO(day);
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
        setShowCalendar(false);
    };

    return (
        <div className="tr-daterange" ref={wrapperRef}>
            <button
                type="button"
                className={`tr-daterange-btn${dateFrom || dateTo ? ' has-value' : ''}${isCustomRange ? ' is-custom' : ''}`}
                onClick={() => setIsOpen((o) => !o)}
                title={triggerLabel}
            >
                <CalendarIcon />
                <span className="tr-daterange-btn-label">
                    {labelPrefix && <span className="tr-daterange-btn-prefix">{labelPrefix} </span>}
                    {triggerLabel}
                </span>
                <ChevronDown />
            </button>

            <FloatingPopover
                open={isOpen}
                triggerRef={wrapperRef}
                align={align}
                onClose={() => setIsOpen(false)}
                className={`tr-daterange-popover${showCalendar ? ' tr-daterange-popover--wide' : ''}`}
            >
                <div className="tr-daterange-body">
                    <div className="tr-preset-list">
                        {PRESETS.map((preset) => (
                            <button
                                key={preset.key}
                                type="button"
                                className={[
                                    'tr-preset-item',
                                    activePresetKey === preset.key && 'tr-preset-item--active',
                                    preset.key === 'custom' && 'tr-preset-item--divider',
                                ].filter(Boolean).join(' ')}
                                onClick={() => handlePresetClick(preset)}
                            >
                                <span className="tr-preset-item-label">{preset.label}</span>
                                {activePresetKey === preset.key && (
                                    <span className="tr-preset-check" aria-hidden="true">
                                        <CheckIcon />
                                    </span>
                                )}
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
                                    const inRange = isInRange(iso);
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
                                            onMouseEnter={() => setHoverDate(day)}
                                            onClick={() => handleDayClick(day)}
                                        >
                                            {day.getDate()}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Live status of the range being built — so a
                                half-picked range ("start only") is never
                                ambiguous. */}
                            <div className={`tr-cal-selection${dateFrom && !dateTo ? ' is-incomplete' : ''}`}>
                                {dateFrom && dateTo ? (
                                    <>
                                        <strong>{formatDisplay(dateFrom)}</strong>
                                        <span className="tr-cal-selection-sep">→</span>
                                        <strong>{formatDisplay(dateTo)}</strong>
                                    </>
                                ) : dateFrom ? (
                                    <>
                                        Start <strong>{formatDisplay(dateFrom)}</strong>
                                        <span className="tr-cal-selection-hint">— now pick an end date</span>
                                    </>
                                ) : (
                                    <span className="tr-cal-selection-hint">Pick a start date, then an end date</span>
                                )}
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
            </FloatingPopover>
        </div>
    );
}