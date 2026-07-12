import type { DocumentDistributionSlice } from '../types/dashboard';
import { RefreshIcon } from './icons';

interface DocumentDistributionProps {
    slices: DocumentDistributionSlice[];
    totalDocuments: number;
    onRefresh?: () => void;
}

const COLOR_VARS: Record<DocumentDistributionSlice['color'], string> = {
    primary: 'var(--db-primary)',
    gold: 'var(--db-pending)',
    red: 'var(--db-error)',
};

export function DocumentDistribution({ slices, totalDocuments, onRefresh }: DocumentDistributionProps) {
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const dominant = slices.reduce((m, s) => (s.percentage > m.percentage ? s : m), slices[0]);

    let cumulative = 0;
    const segments = slices.map((slice) => {
        const length = (slice.percentage / 100) * circumference;
        const offset = cumulative;
        cumulative += length;
        return { ...slice, length, offset };
    });

    return (
        <div className="dashboard-card">
            <div className="dashboard-card-header">
                <div className="dashboard-card-title">Document Distribution</div>
                <button className="icon-btn" onClick={onRefresh} aria-label="Refresh">
                    <RefreshIcon size={14} />
                </button>
            </div>

            <div className="donut-wrapper">
                <svg width="150" height="150" viewBox="0 0 150 150">
                    <g transform="translate(75,75) rotate(-90)">
                        <circle r={radius} fill="none" stroke="var(--db-glass-border-alt)" strokeWidth="16" />
                        {segments.map((seg) => (
                            <circle
                                key={seg.label}
                                r={radius}
                                fill="none"
                                stroke={COLOR_VARS[seg.color]}
                                strokeWidth="16"
                                strokeDasharray={`${seg.length} ${circumference - seg.length}`}
                                strokeDashoffset={-seg.offset}
                                strokeLinecap="butt"
                            />
                        ))}
                    </g>
                    <text x="75" y="70" textAnchor="middle" className="donut-center-label">Overall</text>
                    <text x="75" y="92" textAnchor="middle" className="donut-center-value">{dominant.percentage}%</text>
                </svg>
            </div>

            <div className="distribution-legend">
                {slices.map((slice) => (
                    <div className="legend-row" key={slice.label}>
                        <span className={`legend-dot color-${slice.color}`} />
                        <span className="legend-label">{slice.label}</span>
                        <span className="legend-value">{slice.percentage}% · {slice.count}</span>
                    </div>
                ))}
                <div className="legend-total-row">
                    <span>Total Documents</span>
                    <span>{totalDocuments}</span>
                </div>
            </div>
        </div>
    );
}
