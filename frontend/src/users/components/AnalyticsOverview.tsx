import { useState } from 'react';
import type { TrendPoint } from '../types/dashboard';
import { BarChartIcon, RefreshIcon } from './icons';

interface AnalyticsOverviewProps {
    /** Real processed/released counts, already bucketed to fit whatever
     *  span the Dashboard Period picker currently has selected. */
    data: TrendPoint[];
    /** The active Dashboard Period label (e.g. "This Month", "Last Week"),
     *  shown under the title so this card visibly tracks the same
     *  selector as the stat cards and donut chart. */
    periodLabel: string;
    /** Totals sourced from the same analytics.selected* fields the stat
     *  cards use, so the footer here never drifts from the rest of the
     *  dashboard even if bucket-boundary rounding differs slightly. */
    totalProcessed: number;
    totalReleased: number;
    onRefresh?: () => void;
}

export function AnalyticsOverview({ data, periodLabel, totalProcessed, totalReleased, onRefresh }: AnalyticsOverviewProps) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    // Compute max for Y-axis scaling across both series
    const maxVal = Math.max(...data.flatMap((d) => [d.processed, d.released]), 10);
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
                    <span className="dashboard-card-subtext">Showing: {periodLabel}</span>
                </div>
                <button className="icon-btn" onClick={onRefresh} aria-label="Refresh analytics">
                    <RefreshIcon size={14} />
                </button>
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
                        const isHovered = hoveredIndex === index;

                        const heightPctPrimary = (point.processed / yAxisMax) * 100;
                        const heightPctSecondary = (point.released / yAxisMax) * 100;

                        return (
                            <div
                                key={`${point.label}-${index}`}
                                className={`bar-col-group ${isHovered ? 'is-hovered' : ''}`}
                                onMouseEnter={() => setHoveredIndex(index)}
                                onMouseLeave={() => setHoveredIndex(null)}
                            >
                                {/* Floating Dark Tooltip on Hover */}
                                {isHovered && (
                                    <div className="bar-tooltip">
                                        <div className="tooltip-row">
                                            <span className="tooltip-swatch primary" />
                                            <span>Processed: {point.processed}</span>
                                        </div>
                                        <div className="tooltip-row">
                                            <span className="tooltip-swatch secondary" />
                                            <span>Released: {point.released}</span>
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

            {/* Summary Footer — sourced from analytics.selected*, same as the stat cards */}
            <div className="analytics-footer">
                <div className="analytics-footer-summary">
                    <span className="analytics-footer-total">{totalProcessed.toLocaleString()} Processed</span>
                    <span className="analytics-footer-sub">· {totalReleased.toLocaleString()} Released</span>
                </div>
            </div>
        </div>
    );
}