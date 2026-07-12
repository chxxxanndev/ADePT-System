import type { StatCardData } from '../types/dashboard';
import {
    RequestsIcon,
    CheckCircleIcon,
    FilesIcon,
    ClockIcon,
    ArchiveIcon,
    RotateCcwIcon,
    CopyIcon,
    XCircleIcon,
} from './icons';

const ICONS: Record<StatCardData['icon'], React.ComponentType<{ size?: number; className?: string }>> = {
    requests: RequestsIcon,
    released: CheckCircleIcon,
    issued: FilesIcon,
    active: ClockIcon,
    archived: ArchiveIcon,
    voided: RotateCcwIcon,
    reprinted: CopyIcon,
    cancelled: XCircleIcon,
};

export function StatCard({ data }: { data: StatCardData }) {
    const Icon = ICONS[data.icon];

    return (
        <div className={`stat-card accent-${data.accent}`}>
            <div className="stat-card-top">
                <span className="stat-card-label">{data.label}</span>
                <span className="stat-card-icon"><Icon size={17} /></span>
            </div>
            <span className="stat-card-value">{data.value}</span>
            <span className={`stat-card-sublabel ${data.trend === 'up' ? 'trend-up' : ''}`}>
                {data.trend === 'up' && '↑ '}
                {data.sublabel}
            </span>
        </div>
    );
}

interface SummarySectionProps {
    title: string;
    icon: React.ReactNode;
    stats: StatCardData[];
}

export function SummarySection({ title, icon, stats }: SummarySectionProps) {
    return (
        <section>
            <div className="section-heading">
                <span className="section-heading-icon">{icon}</span>
                <h3>{title}</h3>
            </div>
            <div className="stat-grid">
                {stats.map((stat) => (
                    <StatCard key={stat.id} data={stat} />
                ))}
            </div>
        </section>
    );
}
