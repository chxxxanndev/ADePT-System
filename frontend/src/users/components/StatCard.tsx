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

export function DashboardSummary({ title, items, iconType }: { title: string, items: any[], iconType: 'operational' | 'admin' }) {
    return (
        <div className="summary-container">
            <div className="section-heading">
                {iconType === 'operational' ? <Icons.DoubleBarIcon /> : <Icons.LinkIcon />}
                <h3>{title}</h3>
            </div>
            <div className="stat-grid">
                {items.map((item) => {
                    const MainIcon = ICON_MAP[item.icon];
                    const SubIcon = SUB_ICON_MAP[item.id];

                    return (
                        <div key={item.id} className={`stat-card accent-${item.accent}`}>
                            <div className="stat-card-top">
                                <span className="stat-card-label">{item.label}</span>
                                <div className="stat-card-icon">
                                    <MainIcon size={22} />
                                </div>
                            </div>
                            <div className="stat-card-value">{item.value}</div>
                            <div className="stat-card-sublabel">
                                <SubIcon size={16} className="sub-icon" />
                                {item.sublabel}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}