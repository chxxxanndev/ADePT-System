import { useState } from 'react';
import type { DocumentDistributionSlice } from '../types/dashboard';

interface DocumentDistributionProps {
    slices: DocumentDistributionSlice[];
    totalDocuments: number;
}

const COLOR_MAP: Record<DocumentDistributionSlice['color'], { fill: string; dot: string }> = {
    primary: { fill: '#4F46E5', dot: '#4F46E5' },
    gold: { fill: '#F59E0B', dot: '#F59E0B' },
    red: { fill: '#EF4444', dot: '#EF4444' },
};

// Bigger canvas + thicker ring so the donut reads clearly. All count
// labels sit uniformly OUTSIDE the ring (slice color + white halo, with a
// thin leader line pointing at the slice) — one consistent style whether
// the slice is big or small.
const RADIUS_INNER = 46;
const RADIUS_OUTER = 112;
const CENTER = 150;

// Distance from the outer ring edge to the outside labels.
const OUTER_LABEL_GAP = 18;

function getThickDonutPath(
    startPercent: number,
    endPercent: number,
    rInner = RADIUS_INNER,
    rOuter = RADIUS_OUTER,
    cx = CENTER,
    cy = CENTER
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

export function DocumentDistribution({ slices, totalDocuments }: DocumentDistributionProps) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    let cumulative = 0;
    const chartSlices = slices.map((slice, index) => {
        const startPercent = cumulative;
        const percentFraction = slice.percentage / 100;
        cumulative += percentFraction;
        const endPercent = cumulative;

        const midAngle = ((startPercent + endPercent) / 2) * 2 * Math.PI - Math.PI / 2;
        const labelRadius = RADIUS_OUTER + OUTER_LABEL_GAP;

        return {
            ...slice,
            index,
            startPercent,
            endPercent,
            path: getThickDonutPath(startPercent, endPercent),
            labelX: CENTER + labelRadius * Math.cos(midAngle),
            labelY: CENTER + labelRadius * Math.sin(midAngle),
            leaderFrom: {
                x: CENTER + (RADIUS_OUTER + 2) * Math.cos(midAngle),
                y: CENTER + (RADIUS_OUTER + 2) * Math.sin(midAngle),
            },
            leaderTo: {
                x: CENTER + (RADIUS_OUTER + OUTER_LABEL_GAP - 6) * Math.cos(midAngle),
                y: CENTER + (RADIUS_OUTER + OUTER_LABEL_GAP - 6) * Math.sin(midAngle),
            },
        };
    });

    const isEmpty = totalDocuments <= 0;
    const trackPath = getThickDonutPath(0, 1);

    return (
        <div className="dashboard-card donut-card-enhanced">
            <div className="dashboard-card-header">
                <div className="dashboard-card-title">Document Distribution</div>
            </div>

            <div className="donut-wrapper">
                <svg width="300" height="300" viewBox="0 0 300 300" className="donut-svg">
                    <filter id="donut-shadow" x="-10%" y="-10%" width="120%" height="120%">
                        <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#29237A" floodOpacity="0.12" />
                    </filter>

                    <g>
                        {/* Neutral track ring — keeps the donut shape even when
                            one slice dominates or no data exists yet. */}
                        <path d={trackPath} fill="#EEF1F6" />

                        <g filter="url(#donut-shadow)">
                            {chartSlices.map((slice) => {
                                if (!slice.path || slice.percentage <= 0) return null;
                                const isHovered = hoveredIndex === slice.index;
                                const colors = COLOR_MAP[slice.color];
                                const dimmed = hoveredIndex !== null && !isHovered;
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
                                                transformOrigin: `${CENTER}px ${CENTER}px`,
                                                transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                                                opacity: dimmed ? 0.55 : 1,
                                                cursor: 'pointer',
                                            }}
                                            onMouseEnter={() => setHoveredIndex(slice.index)}
                                            onMouseLeave={() => setHoveredIndex(null)}
                                        />

                                        {/* Count label — uniformly OUTSIDE the ring for every slice: slice
                                            color, white halo for legibility, leader line pointing
                                            at the slice. Consistent for big and small slices alike. */}
                                        <line
                                            x1={slice.leaderFrom.x}
                                            y1={slice.leaderFrom.y}
                                            x2={slice.leaderTo.x}
                                            y2={slice.leaderTo.y}
                                            stroke={colors.fill}
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                            opacity={dimmed ? 0.4 : 0.65}
                                        />
                                        <text
                                            x={slice.labelX}
                                            y={slice.labelY + 4}
                                            textAnchor="middle"
                                            fill={colors.fill}
                                            fontSize="12.5"
                                            fontWeight="800"
                                            paintOrder="stroke"
                                            stroke="#ffffff"
                                            strokeWidth="3.5"
                                            style={{
                                                pointerEvents: 'none',
                                                userSelect: 'none',
                                                transition: 'opacity 0.2s ease',
                                                opacity: dimmed ? 0.55 : 1,
                                            }}
                                        >
                                            {slice.count.toLocaleString()}
                                        </text>
                                    </g>
                                );
                            })}
                        </g>

                        {/* Center stat — the overall total sits in the hole,
                            leaving all slice numbers fully visible. */}
                        {isEmpty ? (
                            <text
                                x={CENTER}
                                y={CENTER + 5}
                                textAnchor="middle"
                                fontSize="11"
                                fontWeight="600"
                                fill="#94A3B8"
                            >
                                No data yet
                            </text>
                        ) : (
                            <>
                                <text
                                    x={CENTER}
                                    y={CENTER - 2}
                                    textAnchor="middle"
                                    fontSize="22"
                                    fontWeight="800"
                                    fill="#29237A"
                                >
                                    {totalDocuments.toLocaleString()}
                                </text>
                                <text
                                    x={CENTER}
                                    y={CENTER + 17}
                                    textAnchor="middle"
                                    fontSize="9"
                                    fontWeight="700"
                                    fill="#94A3B8"
                                    letterSpacing="1.2"
                                >
                                    DOCUMENTS
                                </text>
                            </>
                        )}
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
                                <span className="legend-count">{slice.count.toLocaleString()}</span>
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