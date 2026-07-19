import {
    UserIcon,
    AlertTriangleIcon,
    CheckCircleIcon,
    XCircleIcon,
    RequestsIcon,
    RefreshIcon
} from '../../users/components/icons';
import type { AdminStatItem } from '../data/dashboardMockData';

// SVG Gears Icon for the "Processing" card
function GearsIcon({ size = 18, className }: { size?: number; className?: string }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
    );
}

// Icon mapper for stat cards
const STAT_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    user: UserIcon,
    alert: AlertTriangleIcon,
    check: CheckCircleIcon,
    close: XCircleIcon,
    request: RequestsIcon,
    gears: GearsIcon,
};

interface AdminStatCardProps {
    item: AdminStatItem;
}

export function AdminStatCard({ item }: AdminStatCardProps) {
    const IconComponent = STAT_ICONS[item.icon] || RequestsIcon;

    return (
        <div className={`admin-stat-card ${item.accent}`}>
            <div className="admin-stat-card-left">
                <span className="admin-stat-card-label">{item.label}</span>
                <span className="admin-stat-card-value">{item.value}</span>
            </div>
            <div className="admin-stat-card-icon-container">
                <IconComponent size={24} />
            </div>
        </div>
    );
}

interface AdminStatsSectionProps {
    title: string;
    items: AdminStatItem[];
    sectionIcon: React.ReactNode;
    onRefresh?: () => void;
    isRefreshing?: boolean;
}

export function AdminStatsSection({
    title,
    items,
    sectionIcon,
    onRefresh,
    isRefreshing
}: AdminStatsSectionProps) {
    return (
        <section className="admin-stats-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="admin-section-title-row">
                    <span className="admin-section-title-icon">{sectionIcon}</span>
                    <span>{title}</span>
                </div>
                {onRefresh && (
                    <button
                        onClick={onRefresh}
                        className={`admin-refresh-btn ${isRefreshing ? 'spinning' : ''}`}
                        title={`Refresh ${title}`}
                    >
                        <RefreshIcon size={16} />
                    </button>
                )}
            </div>
            <div className="admin-stats-grid">
                {items.map((item) => (
                    <AdminStatCard key={item.id} item={item} />
                ))}
            </div>
        </section>
    );
}