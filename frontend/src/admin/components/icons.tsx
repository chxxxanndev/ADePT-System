// Shared icon library
// Feather-style line icons, consistent with the inline icons already used in
// AdminDashboard.tsx (strokeWidth 2.5, round caps/joins, currentColor).
// Every icon accepts `size` (px, default 18) and an optional `className`.

export interface IconProps {
    size?: number;
    className?: string;
}

const base = {
    fill: 'none' as const,
    stroke: 'currentColor' as const,
    strokeWidth: 2.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
};

/* ---------------------------------- Header ---------------------------------- */

export function SearchIcon({ size = 18, className }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
    );
}

export function MapPinIcon({ size = 14 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
        </svg>
    );
}


export function CalendarIcon({ size = 18, className }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <line x1="16" y1="3" x2="16" y2="7" />
            <line x1="8" y1="3" x2="8" y2="7" />
            <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
    );
}

export function ChevronDownIcon({ size = 18, className }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
            <polyline points="6 9 12 15 18 9" />
        </svg>
    );
}

export function MenuIcon({ size = 18, className }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
    );
}

/* --------------------------------- Sidebar ---------------------------------- */

export function DashboardIcon({ size = 18, className }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
            <rect x="3" y="3" width="7" height="9" rx="1.5" />
            <rect x="14" y="3" width="7" height="5" rx="1.5" />
            <rect x="14" y="12" width="7" height="9" rx="1.5" />
            <rect x="3" y="16" width="7" height="5" rx="1.5" />
        </svg>
    );
}

export function UserIcon({ size = 18, className }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
        </svg>
    );
}

export function ClipboardListIcon({ size = 18, className }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
            <rect x="5" y="4" width="14" height="17" rx="2" />
            <path d="M9 3h6a1 1 0 0 1 1 1v1H8V4a1 1 0 0 1 1-1z" />
            <line x1="8.5" y1="11" x2="15.5" y2="11" />
            <line x1="8.5" y1="15" x2="15.5" y2="15" />
        </svg>
    );
}

export function BarChartIcon({ size = 18, className }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
            <line x1="5" y1="21" x2="5" y2="13" />
            <line x1="12" y1="21" x2="12" y2="7" />
            <line x1="19" y1="21" x2="19" y2="10" />
            <line x1="3" y1="21" x2="21" y2="21" />
        </svg>
    );
}

export function ArchiveIcon({ size = 18, className }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
            <rect x="3" y="4" width="18" height="4" rx="1" />
            <path d="M4 8h16v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8z" />
            <line x1="10" y1="12.5" x2="14" y2="12.5" />
        </svg>
    );
}

export function SettingsIcon({ size = 18, className }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
    );
}

export function LogoutIcon({ size = 18, className }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
    );
}

/* -------------------------------- Stat cards --------------------------------- */

export function AlertTriangleIcon({ size = 18, className }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    );
}

export function CheckCircleIcon({ size = 18, className }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
            <circle cx="12" cy="12" r="9" />
            <polyline points="8.5 12.5 11 15 15.5 9.5" />
        </svg>
    );
}

export function XCircleIcon({ size = 18, className }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
            <circle cx="12" cy="12" r="9" />
            <line x1="9" y1="9" x2="15" y2="15" />
            <line x1="15" y1="9" x2="9" y2="15" />
        </svg>
    );
}

export function RequestsIcon({ size = 18, className }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <path d="M8 12h8" />
            <path d="M8 8h5" />
            <path d="M8 16h3" />
        </svg>
    );
}

/* ---------------------------------- Shared ----------------------------------- */

export function RefreshIcon({ size = 18, className }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>
            <path d="M21.5 2v6h-6" />
            <path d="M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
        </svg>
    );
}