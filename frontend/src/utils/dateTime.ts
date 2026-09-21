// Shared date/time formatting used by the Dashboard (Recent Transactions),
// Transaction Registry table and details panel so every screen renders the same "MM/DD/YYYY hh:mm AM/PM" style.

const DATE_ONLY_ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PART_RE = /[T ]\d{1,2}:\d{2}/;

export function hasTimeComponent(value: string): boolean {
    return !DATE_ONLY_ISO_RE.test(value) && TIME_PART_RE.test(value);
}

// "8/11/2026" or "8/11/2026 11:23 AM" — '' when the value is missing. 
export function formatDateTime(value?: string | null): string {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    const datePart = d.toLocaleDateString('en-US');
    if (!hasTimeComponent(value)) return datePart;
    return `${datePart} ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
}

export function formatPeriodRange(from?: string | null, to?: string | null): string {
    if (!from && !to) return 'All time';
    const fmt = (iso: string) => {
        const d = new Date(iso + 'T00:00:00');
        if (isNaN(d.getTime())) return iso;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };
    if (from && to && from !== to) return `${fmt(from)} – ${fmt(to)}`;
    const day = from || to;
    if (!day) return 'Selected period';
    const d = new Date(day + 'T00:00:00');
    const today = new Date();
    const isToday =
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate();
    return isToday ? 'Today' : fmt(day);
}