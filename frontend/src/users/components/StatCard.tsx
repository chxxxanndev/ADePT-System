import * as Icons from './icons';
import type { StatCardData } from '../types/dashboard';

const ICON_MAP: Record<string, any> = {
    requests: Icons.FolderIcon,
    released: Icons.FolderIcon,
    ready: Icons.FolderIcon,
    active: Icons.FolderIcon,
    archived: Icons.ArchiveBoxIcon,
    voided: Icons.AlertTriangleIcon,
    reprinted: Icons.PrinterPlusIcon,
    cancelled: Icons.XSquareIcon,
};

const SUB_ICON_MAP: Record<string, any> = {
    'total-requests': Icons.TrendUpIcon,
    'released-today': Icons.CheckCircleIcon,
    'ready-for-release': Icons.ClockIcon,
    'active-requests': Icons.ClockIcon,
    'archived': Icons.FilesIcon,
    'voided': Icons.RotateCcwIcon,
    'reprinted': Icons.CopyIcon,
    'cancelled': Icons.SettingsIcon,
};

interface DashboardSummaryProps {
    title: string;
    items: StatCardData[];
    iconType: 'operational' | 'admin';
    /** While true, renders skeleton placeholders instead of stat cards.
     *  The skeletons use the same .stat-card box (dimensions, padding,
     *  radius, grid placement) as the real cards, so the layout never
     *  jumps when the data arrives. */
    isLoading?: boolean;
    /** Navigates to a card's `view` target when the card is clicked,
     *  carrying optional `viewParams` for the destination view.
     *  Cards without a `view` render as plain boxes. */
    onNavigate?: (view: string, params?: Record<string, string>) => void;
}

export function DashboardSummary({ title, items, iconType, isLoading = false, onNavigate }: DashboardSummaryProps) {
    return (
        <div className="summary-container">
            <div className="section-heading">
                {iconType === 'operational' ? <Icons.DoubleBarIcon /> : <Icons.LinkIcon />}
                <h3>{title}</h3>
            </div>
            <div className="stat-grid">
                {isLoading ? (
                    items.map((item) => (
                        <div key={item.id} className="stat-card stat-card--skeleton">
                            <div className="stat-card-top">
                                <span className="skeleton-item" style={{ width: '55%', height: 10 }} />
                                <span className="skeleton-item" style={{ width: 38, height: 38, borderRadius: '50%' }} />
                            </div>
                            <span className="skeleton-item" style={{ width: '35%', height: 26, margin: '0 auto' }} />
                            <span className="skeleton-item" style={{ width: '50%', height: 10 }} />
                        </div>
                    ))
                ) : (
                    items.map((item) => {
                        const MainIcon = ICON_MAP[item.icon];
                        const SubIcon = SUB_ICON_MAP[item.id];
                        const clickable = !!item.view && !!onNavigate;

                        const content = (
                            <>
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
                                    {clickable && (
                                        <span className="stat-card-arrow" aria-hidden="true">
                                            <Icons.ArrowRightIcon size={12} />
                                        </span>
                                    )}
                                </div>
                            </>
                        );

                        return clickable ? (
                            <button
                                key={item.id}
                                type="button"
                                className={`stat-card accent-${item.accent} stat-card--clickable`}
                                onClick={() => onNavigate(item.view!, item.viewParams)}
                                aria-label={`${item.label}: ${item.value} — ${item.sublabel}`}
                                title={`View ${item.label}`}
                            >
                                {content}
                            </button>
                        ) : (
                            <div key={item.id} className={`stat-card accent-${item.accent}`}>
                                {content}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}