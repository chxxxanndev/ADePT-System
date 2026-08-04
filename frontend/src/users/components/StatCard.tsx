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

// Matches the accent colors already defined in TransactionRegistry.css
// (.skeleton-accent-purple/gold/blue/green/navy/red) — used as placeholder
// count while the real items haven't loaded yet.
const SKELETON_ACCENTS = ['purple', 'gold', 'blue', 'green', 'navy', 'red'];

interface DashboardSummaryProps {
    title: string;
    items: any[];
    iconType: 'operational' | 'admin';
    /** While true, renders skeleton placeholders instead of stat cards
     *  (avoids the flash of an empty/blank card before data arrives). */
    isLoading?: boolean;
}

export function DashboardSummary({ title, items, iconType, isLoading = false }: DashboardSummaryProps) {
    return (
        <div className="summary-container">
            <div className="section-heading">
                {iconType === 'operational' ? <Icons.DoubleBarIcon /> : <Icons.LinkIcon />}
                <h3>{title}</h3>
            </div>
            <div className="stat-grid">
                {isLoading ? (
                    SKELETON_ACCENTS.map((accent) => (
                        <div key={accent} className={`skeleton-card-accent skeleton-accent-${accent}`}>
                            <div className="skeleton-item" style={{ width: '55%', height: 10 }} />
                            <div className="skeleton-item" style={{ width: '35%', height: 20 }} />
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