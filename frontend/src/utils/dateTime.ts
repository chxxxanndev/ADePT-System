/**
 * Shared date/time formatting used by the Dashboard (Recent Transactions),
 * Transaction Registry table and details panel so every screen renders the
 * same "MM/DD/YYYY hh:mm AM/PM" style.
 *
 * A value's time of day is only rendered when the source string actually
 * carries one. Date-only values (e.g. the `date` column request_date like
 * "2026-08-11", or "8/11/2026") must NOT get a time appended — parsing them
 * as UTC midnight shifts into a fake fixed local time (8:00 AM for UTC+8),
 * which is misleading. Full timestamps (created_at / released_at) always
 * show the time, converted to the user's local timezone.
 */

const DATE_ONLY_ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PART_RE = /[T ]\d{1,2}:\d{2}/;

export function hasTimeComponent(value: string): boolean {
    return !DATE_ONLY_ISO_RE.test(value) && TIME_PART_RE.test(value);
}

/** "8/11/2026" or "8/11/2026 11:23 AM" — '' when the value is missing. */
export function formatDateTime(value?: string | null): string {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    const datePart = d.toLocaleDateString('en-US');
    if (!hasTimeComponent(value)) return datePart;
    return `${datePart} ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
}