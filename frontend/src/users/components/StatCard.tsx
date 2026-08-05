import * as Icons from './icons';

const ICON_MAP: Record<string, any> = {
    requests: Icons.FolderIcon,
    released: Icons.FolderIcon,
    issued: Icons.FolderIcon,
    active: Icons.FolderIcon,
    archived: Icons.ArchiveBoxIcon,
    voided: Icons.AlertTriangleIcon,
    reprinted: Icons.PrinterPlusIcon,
    cancelled: Icons.XSquareIcon,
};

const SUB_ICON_MAP: Record<string, any> = {
    'total-requests': Icons.TrendUpIcon,
    'released-today': Icons.CheckCircleIcon,
    'monthly-issued': Icons.CalendarIcon,
    'active-requests': Icons.ClockIcon,
    'archived': Icons.FilesIcon,
    'voided': Icons.RotateCcwIcon,
    'reprinted': Icons.CopyIcon,
    'cancelled': Icons.SettingsIcon,
};

// Fallback cadence when the items array isn't available yet — the same
// accent order the real stat cards render in (teal/gold/green/red).
const SKELETON_ACCENTS = ['teal', 'gold', 'green', 'red'];

interface DashboardSummaryProps {
    title: string;
    items: any[];
    iconType: 'operational' | 'admin';
    /** While true, renders skeleton placeholders instead of stat cards
     *  (avoids the flash of an empty/blank card before data arrives). */
    isLoading?: boolean;
}

export function DashboardSummary({ title, items, iconType, isLoading = false }: DashboardSummaryProps) {
    const skeletonItems = items.length > 0 ? items : SKELETON_ACCENTS.map((accent) => ({ id: accent, accent }));

    return (
        <div className="summary-container">
            <div className="section-heading">
                {iconType === 'operational' ? <Icons.DoubleBarIcon /> : <Icons.LinkIcon />}
                <h3>{title}</h3>
            </div>
            <div className="stat-grid">
                {isLoading ? (
                    skeletonItems.map((item) => (
                        // Mirrors the real .stat-card structure 1:1 (top label
                        // row + icon well, big value, sublabel) so the lazy-load
                        // state looks like the actual dashboard boxes.
                        <div
                            key={item.id}
                            className={`db-skeleton-stat-card db-skeleton-accent-${item.accent}`}
                        >
                            <div className="db-skeleton-stat-top">
                                <div className="db-skeleton db-skeleton-stat-label" />
                                <div className="db-skeleton-stat-icon" />
                            </div>
                            <div className="db-skeleton db-skeleton-stat-value" />
                            <div className="db-skeleton db-skeleton-stat-sublabel" />
                        </div>
                    ))
                ) : (
                    items.map((item) => {
                        const MainIcon = ICON_MAP[item.icon];
                        const SubIcon = SUB_ICON_MAP[item.id];

                        return (
                            <div key={item.id} className={`stat-card accent-${item.accent}`}>
                                <div className="stat-card-top">
                                    <span className="stat-card-label">{item.label}</span>
                                    <div className="stat-card-icon-wrap">
                                        <MainIcon size={18} />
                                    </div>
                                </div>
                                <span className="stat-card-value">{item.value}</span>
                                <div className="stat-card-sublabel">
                                    <SubIcon size={13} className="sub-icon" />
                                    {item.sublabel}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}