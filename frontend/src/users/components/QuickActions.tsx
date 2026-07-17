import type { QuickActionItem } from '../types/dashboard';
import { FilePlusIcon, ClockIcon, SearchIcon, ArchiveIcon, BarChartIcon, ZapIcon } from './icons';

const ICONS: Record<QuickActionItem['icon'], React.ComponentType<{ size?: number; className?: string }>> = {
    newRequest: FilePlusIcon,
    pending: ClockIcon,
    search: SearchIcon,
    archive: ArchiveIcon,
    reports: BarChartIcon,
};

interface QuickActionsProps {
    actions: QuickActionItem[];
    onSelect: (view: string) => void;
}

export function QuickActions({ actions, onSelect }: QuickActionsProps) {
    return (
        <div className="dashboard-card">
            <div className="dashboard-card-header">
                <div className="dashboard-card-title">
                    <span className="dashboard-card-title-icon" style={{ color: 'var(--db-error)' }}>
                        <ZapIcon size={16} />
                    </span>
                    Quick Actions
                </div>
            </div>

            <div className="quick-actions-list">
                {actions.map((action) => {
                    const Icon = ICONS[action.icon];
                    return (
                        <button key={action.id} className="quick-action-item" onClick={() => onSelect(action.view)}>
                            <span className="quick-action-icon"><Icon size={16} /></span>
                            <span>
                                <div className="quick-action-text-title">{action.title}</div>
                                <div className="quick-action-text-desc">{action.description}</div>
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
