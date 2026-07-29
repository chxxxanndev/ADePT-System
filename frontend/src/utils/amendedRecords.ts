const KEY = 'va_amended_ids';

export function getAmendedIds(): Set<string> {
    try {
        const raw = localStorage.getItem(KEY);
        return new Set(raw ? JSON.parse(raw) : []);
    } catch {
        return new Set();
    }
}

export function isAmended(id: string): boolean {
    return getAmendedIds().has(id);
}

export function markAmended(id: string) {
    const ids = getAmendedIds();
    ids.add(id);
    localStorage.setItem(KEY, JSON.stringify(Array.from(ids)));
}