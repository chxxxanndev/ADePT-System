import type { WeeklyTrendPoint } from '../types/dashboard';
import { BarChartIcon, RefreshIcon } from './icons';

interface AnalyticsOverviewProps {
    data: WeeklyTrendPoint[];
    lastUpdated: string;
    onRefresh?: () => void;
}

export function AnalyticsOverview({ data, lastUpdated, onRefresh }: AnalyticsOverviewProps) {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    const avg = Math.round(total / data.length);
    const max = data.reduce((m, d) => (d.value > m.value ? d : m), data[0]);
    const maxValue = Math.max(...data.map((d) => d.value));

    return (
        <div className="dashboard-card">
            <div className="dashboard-card-header">
                <div>
                    <div className="dashboard-card-title">
                        <span className="dashboard-card-title-icon"><BarChartIcon size={16} /></span>
                        Analytics Overview
                    </div>
                    <span className="dashboard-card-subtext">Last Updated: {lastUpdated}</span>
                </div>
                <button className="icon-btn" onClick={onRefresh} aria-label="Refresh">
                    <RefreshIcon size={14} />
                </button>
            </div>

            <span className="trend-pill">Weekly Processing Trend</span>

            <div className="bar-chart">
                {data.map((point) => (
                    <div className="bar-chart-col" key={point.label}>
                        <div
                            className={`bar-chart-bar ${point.value === maxValue ? 'is-max' : ''}`}
                            style={{ height: `${(point.value / maxValue) * 100}%` }}
                            title={`${point.label}: ${point.value}`}
                        />
                        <span className="bar-chart-label">{point.label.replace('Week ', 'W')}</span>
                    </div>
                ))}
            </div>

            <div className="analytics-footer">
                <span className="analytics-footer-total">{total} Total Requests</span>
                <div className="analytics-footer-meta">
                    <span className="analytics-footer-avg">↑ Avg: {avg}/Week</span>
                    <span className="analytics-footer-high">Highest: {max.label} ({max.value})</span>
                </div>
            </div>
        </div>
    );
}
