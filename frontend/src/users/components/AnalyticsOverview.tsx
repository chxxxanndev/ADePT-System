import { useState } from 'react';
import type { WeeklyTrendPoint } from '../types/dashboard';
import { BarChartIcon } from './icons';

interface AnalyticsOverviewProps {
    data: WeeklyTrendPoint[];
    lastUpdated: string;
}

export function AnalyticsOverview({ data, lastUpdated }: AnalyticsOverviewProps) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    // Both series are real: "Processed" = requests received that week (by
    // request date), "Released" = documents actually released that week
    // (by release time) — see buildWeeklyTrend in useReportsAnalytics.
    const totalProcessed = data.reduce((sum, d) => sum + d.processed, 0);
    const totalReleased = data.reduce((sum, d) => sum + d.released, 0);

    // Compute max for Y-axis scaling
    const maxVal = Math.max(...data.map((d) => Math.max(d.processed, d.released)), 10);
    const yAxisMax = Math.ceil(maxVal / 10) * 10;
    const gridTicks = [yAxisMax, Math.round(yAxisMax * 0.75), Math.round(yAxisMax * 0.5), Math.round(yAxisMax * 0.25), 0];

    return (
        <div className="dashboard-card analytics-card-enhanced">
            <div className="dashboard-card-header">
                <div>
                    <div className="dashboard-card-title">
                        <span className="dashboard-card-title-icon"><BarChartIcon size={16} /></span>
                        Analytics Overview
                    </div>
                    <span className="dashboard-card-subtext">Last Updated: {lastUpdated}</span>
                </div>
            </div>

            {/* Custom chart legend */}
            <div className="bar-chart-legend">
                <div className="chart-legend-item">
                    <span className="chart-legend-swatch primary" />
                    <span>Processed Requests</span>
                </div>
                <div className="chart-legend-item">
                    <span className="chart-legend-swatch secondary" />
                    <span>Released Docs</span>
                </div>
            </div>

            {/* Chart Area with Y-axis and Gridlines */}
            <div className="bar-chart-container">
                {/* Y-Axis Gridlines */}
                <div className="chart-gridlines">
                    {gridTicks.map((tick) => (
                        <div className="gridline-row" key={tick}>
                            <span className="gridline-label">{tick}</span>
                            <div className="gridline-line" />
                        </div>
                    ))}
                </div>

                {/* Columns Container */}
                <div className="bar-chart-cols">
                    {data.map((point, index) => {
                        const processed = point.processed;
                        const released = point.released;
                        const isHovered = hoveredIndex === index;

                        const heightPctPrimary = (processed / yAxisMax) * 100;
                        const heightPctSecondary = (released / yAxisMax) * 100;

                        return (
                            <div
                                key={point.label}
                                className={`bar-col-group ${isHovered ? 'is-hovered' : ''}`}
                                onMouseEnter={() => setHoveredIndex(index)}
                                onMouseLeave={() => setHoveredIndex(null)}
                            >
                                {/* Floating Dark Tooltip on Hover */}
                                {isHovered && (
                                    <div className="bar-tooltip">
                                        <div className="tooltip-row tooltip-range">
                                            {point.rangeLabel ?? point.label}
                                        </div>
                                        <div className="tooltip-row">
                                            <span className="tooltip-swatch primary" />
                                            <span>Processed: {processed}</span>
                                        </div>
                                        <div className="tooltip-row">
                                            <span className="tooltip-swatch secondary" />
                                            <span>Released: {released}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Grouped Twin Bars */}
                                <div className="bar-pair">
                                    <div
                                        className="bar-item bar-primary"
                                        style={{ height: `${heightPctPrimary}%` }}
                                    />
                                    <div
                                        className="bar-item bar-secondary"
                                        style={{ height: `${heightPctSecondary}%` }}
                                    />
                                </div>

                                {/* X-Axis Label */}
                                <span className="bar-col-label">
                                    {point.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Summary Footer */}
            <div className="analytics-footer">
                <div className="analytics-footer-summary">
                    <span className="analytics-footer-total">{totalProcessed.toLocaleString()} Processed</span>
                    <span className="analytics-footer-sub">· {totalReleased.toLocaleString()} Released</span>
                </div>
            </div>
        </div>
    );
}