import { useMemo } from 'react';

// Refresh icon (matches the spin animation already defined in AdminDashboard.css)
function RefreshIcon({ size = 16 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <polyline points="21 3 21 9 15 9" />
        </svg>
    );
}

// Chain icon reused as the card's section icon (swap for whatever fits)
function ChainLinkIcon({ size = 18 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
    );
}

interface DistributionSlice {
    label: string;
    color: string;
    count: number;
}

interface AdminDocumentDistributionProps {
    onRefresh?: () => void;
    isRefreshing?: boolean;
}

// --- Placeholder data — wire this up to real API data later ---
const PLACEHOLDER_SLICES: DistributionSlice[] = [
    { label: 'Tax Declaration', color: '#252175', count: 4671 },
    { label: 'Cert. of Landholding', color: '#FDD835', count: 2159 },
    { label: 'Cert. of No Landholding', color: '#D32F2F', count: 2154 },
];

export function AdminDocumentDistribution({ onRefresh, isRefreshing }: AdminDocumentDistributionProps) {
    const total = useMemo(
        () => PLACEHOLDER_SLICES.reduce((sum, s) => sum + s.count, 0),
        []
    );

    // Overall % shown in the center of the donut — placeholder metric.
    const overallPct = 88;

    // --- Proper SVG donut geometry so the ring always closes into a full circle ---
    const size = 170;
    const strokeWidth = 22;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    let cumulativeOffset = 0;
    const segments = PLACEHOLDER_SLICES.map((slice) => {
        const fraction = total > 0 ? slice.count / total : 0;
        const dashLength = fraction * circumference;
        const segment = {
            ...slice,
            fraction,
            dasharray: `${dashLength} ${circumference - dashLength}`,
            dashoffset: -cumulativeOffset,
        };
        cumulativeOffset += dashLength;
        return segment;
    });

    return (
        <div className="admin-card donut-chart-card">
            <div className="admin-card-header" style={{ width: '100%' }}>
                <div className="admin-card-title-group">
                    <span className="admin-section-title-icon"><ChainLinkIcon /></span>
                    <span className="admin-card-title">Document Distribution</span>
                </div>
                <div className="admin-card-actions">
                    <button
                        className={`admin-refresh-btn ${isRefreshing ? 'spinning' : ''}`}
                        onClick={onRefresh}
                        aria-label="Refresh document distribution"
                    >
                        <RefreshIcon />
                    </button>
                </div>
            </div>

            <div className="donut-chart-container">
                <svg viewBox={`0 0 ${size} ${size}`} className="donut-chart-svg">
                    {/* Track (background ring) */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="#ECEFF1"
                        strokeWidth={strokeWidth}
                    />
                    {/* Data segments */}
                    {segments.map((seg) => (
                        <circle
                            key={seg.label}
                            className="donut-segment"
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            stroke={seg.color}
                            strokeDasharray={seg.dasharray}
                            strokeDashoffset={seg.dashoffset}
                            strokeLinecap="butt"
                        />
                    ))}
                </svg>
                <div className="donut-chart-center-text">
                    <span className="donut-center-label">Overall</span>
                    <span className="donut-center-val">{overallPct}%</span>
                </div>
            </div>

            <div className="donut-legend-list">
                {segments.map((seg) => (
                    <div className="donut-legend-item" key={seg.label}>
                        <div className="donut-legend-item-left">
                            <span className="donut-legend-marker" style={{ backgroundColor: seg.color }} />
                            <span>{seg.label}</span>
                        </div>
                        <div className="donut-legend-item-right">
                            <span className="donut-legend-pct">{Math.round(seg.fraction * 100)}%</span>
                            <span className="donut-legend-cnt">{seg.count.toLocaleString()} Documents</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="donut-total-row">
                <span className="donut-total-label">Total Documents:</span>
                <span className="donut-total-value">{total.toLocaleString()}</span>
            </div>
        </div>
    );
}