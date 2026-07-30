import { useState } from 'react';
import type { DocumentDistributionSlice } from '../types/dashboard';
import { RefreshIcon } from './icons';

interface DocumentDistributionProps {
    slices: DocumentDistributionSlice[];
    totalDocuments: number;
    onRefresh?: () => void;
}

const COLOR_MAP: Record<DocumentDistributionSlice['color'], { fill: string; dot: string }> = {
    primary: { fill: '#4F46E5', dot: '#4F46E5' },
    gold: { fill: '#F59E0B', dot: '#F59E0B' },
    red: { fill: '#EF4444', dot: '#EF4444' },
};

function getThickDonutPath(
    startPercent: number,
    endPercent: number,
    rInner = 28,
    rOuter = 82,
    cx = 100,
    cy = 100
) {
    const slicePercent = endPercent - startPercent;
    if (slicePercent <= 0) return '';
    if (slicePercent >= 0.999) {
        return `M ${cx - rOuter} ${cy} A ${rOuter} ${rOuter} 0 1 0 ${cx + rOuter} ${cy} A ${rOuter} ${rOuter} 0 1 0 ${cx - rOuter} ${cy} M ${cx - rInner} ${cy} A ${rInner} ${rInner} 0 1 1 ${cx + rInner} ${cy} A ${rInner} ${rInner} 0 1 1 ${cx - rInner} ${cy} Z`;
    }

    const startAngle = startPercent * 2 * Math.PI - Math.PI / 2;
    const endAngle = endPercent * 2 * Math.PI - Math.PI / 2;

    const xOuter1 = cx + rOuter * Math.cos(startAngle);
    const yOuter1 = cy + rOuter * Math.sin(startAngle);
    const xOuter2 = cx + rOuter * Math.cos(endAngle);
    const yOuter2 = cy + rOuter * Math.sin(endAngle);

    const xInner1 = cx + rInner * Math.cos(startAngle);
    const yInner1 = cy + rInner * Math.sin(startAngle);
    const xInner2 = cx + rInner * Math.cos(endAngle);
    const yInner2 = cy + rInner * Math.sin(endAngle);

    const largeArcFlag = slicePercent > 0.5 ? 1 : 0;

    return `M ${xOuter1} ${yOuter1} A ${rOuter} ${rOuter} 0 ${largeArcFlag} 1 ${xOuter2} ${yOuter2} L ${xInner2} ${yInner2} A ${rInner} ${rInner} 0 ${largeArcFlag} 0 ${xInner1} ${yInner1} Z`;
}

export function DocumentDistribution({ slices, totalDocuments, onRefresh }: DocumentDistributionProps) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    const rInner = 28;
    const rOuter = 82;
    const cx = 100;
    const cy = 100;

    let cumulative = 0;
    const chartSlices = slices.map((slice, index) => {
        const startPercent = cumulative;
        const percentFraction = slice.percentage / 100;
        cumulative += percentFraction;
        const endPercent = cumulative;

        const midAngle = ((startPercent + endPercent) / 2) * 2 * Math.PI - Math.PI / 2;
        const rMid = (rInner + rOuter) / 2;
        const textX = cx + rMid * Math.cos(midAngle);
        const textY = cy + rMid * Math.sin(midAngle);

        return {
            ...slice,
            index,
            startPercent,
            endPercent,
            path: getThickDonutPath(startPercent, endPercent, rInner, rOuter, cx, cy),
            textX,
            textY,
            showLabel: slice.percentage >= 4,
        };
    });

    return (
        <div className="dashboard-card donut-card-enhanced">
            <div className="dashboard-card-header">
                <div className="dashboard-card-title">Document Distribution</div>
                <button className="icon-btn" onClick={onRefresh} aria-label="Refresh distribution">
                    <RefreshIcon size={14} />
                </button>
            </div>

            <div className="donut-wrapper">
                <svg width="200" height="200" viewBox="0 0 200 200" className="donut-svg">
                    <filter id="donut-shadow" x="-10%" y="-10%" width="120%" height="120%">
                        <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#29237A" floodOpacity="0.10" />
                    </filter>
                    <g filter="url(#donut-shadow)">
                        {chartSlices.map((slice) => {
                            if (!slice.path) return null;
                            const isHovered = hoveredIndex === slice.index;
                            const colors = COLOR_MAP[slice.color];
                            return (
                                <g key={slice.label}>
                                    <path
                                        d={slice.path}
                                        fill={colors.fill}
                                        stroke="#ffffff"
                                        strokeWidth="4"
                                        strokeLinejoin="round"
                                        style={{
                                            transition: 'transform 0.22s ease, opacity 0.22s ease',
                                            transformOrigin: '100px 100px',
                                            transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                                            opacity: hoveredIndex === null || isHovered ? 1 : 0.6,
                                            cursor: 'pointer',
                                        }}
                                        onMouseEnter={() => setHoveredIndex(slice.index)}
                                        onMouseLeave={() => setHoveredIndex(null)}
                                    />
                                    {slice.showLabel && (
                                        <text
                                            x={slice.textX}
                                            y={slice.textY + 4}
                                            textAnchor="middle"
                                            fill="#ffffff"
                                            fontSize="13"
                                            fontWeight="700"
                                            style={{
                                                pointerEvents: 'none',
                                                userSelect: 'none',
                                                transition: 'opacity 0.2s ease',
                                                opacity: hoveredIndex === null || isHovered ? 1 : 0.7,
                                            }}
                                        >
                                            {slice.percentage}%
                                        </text>
                                    )}
                                </g>
                            );
                        })}
                    </g>
                </svg>
            </div>

            <div className="distribution-legend">
                {slices.map((slice, idx) => {
                    const isHovered = hoveredIndex === idx;
                    const colors = COLOR_MAP[slice.color];
                    return (
                        <div
                            className={`legend-row ${isHovered ? 'is-active' : ''}`}
                            key={slice.label}
                            onMouseEnter={() => setHoveredIndex(idx)}
                            onMouseLeave={() => setHoveredIndex(null)}
                        >
                            <span className="legend-dot" style={{ backgroundColor: colors.dot }} />
                            <span className="legend-label">{slice.label}</span>
                            <span className="legend-badge">
                                <span className="legend-pct" style={{ color: colors.dot }}>{slice.percentage}%</span>
                                <span className="legend-count">({slice.count})</span>
                            </span>
                        </div>
                    );
                })}

                <div className="legend-total-row">
                    <span className="total-label">Total Documents</span>
                    <span className="total-badge">{totalDocuments.toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
}




