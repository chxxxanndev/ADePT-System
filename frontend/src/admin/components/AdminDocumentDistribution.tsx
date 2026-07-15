import { RefreshIcon } from '../../users/components/icons';
import { documentDistributionMock, totalDocumentsCount } from '../data/dashboardMockData';

interface AdminDocumentDistributionProps {
    onRefresh: () => void;
    isRefreshing: boolean;
}

export function AdminDocumentDistribution({
    onRefresh,
    isRefreshing
}: AdminDocumentDistributionProps) {

    // Segment percentages for visual display (adding up to 100%)
    // Segment 1 (Indigo): 52% Tax Declaration
    // Segment 2 (Yellow): 30% Cert. of Landholding
    // Segment 3 (Red): 18% Cert. of No Landholding
    const segments = documentDistributionMock.map((item) => ({
        percentage: item.percentage,
        color: item.color,
    }));

    // Calculate stroke offset accumulators
    let accumulatedPercent = 0;

    return (
        <div className="admin-card donut-chart-card">
            {/* Header */}
            <div className="admin-card-header" style={{ width: '100%' }}>
                <span className="admin-card-title">Document Distribution</span>
                <button
                    className={`admin-refresh-btn ${isRefreshing ? 'spinning' : ''}`}
                    onClick={onRefresh}
                    title="Refresh Chart"
                    disabled={isRefreshing}
                >
                    <RefreshIcon size={16} />
                </button>
            </div>

            {/* SVG Donut Chart */}
            <div className="donut-chart-container">
                <svg viewBox="0 0 42 42" className="donut-chart-svg">
                    <circle
                        cx="21"
                        cy="21"
                        r="15.91549430918954"
                        fill="transparent"
                        stroke="rgba(0, 0, 0, 0.03)"
                        strokeWidth="5"
                    />
                    {segments.map((seg, idx) => {
                        const dasharray = `${seg.percentage} ${100 - seg.percentage}`;
                        const dashoffset = -accumulatedPercent;
                        accumulatedPercent += seg.percentage;

                        return (
                            <circle
                                key={idx}
                                cx="21"
                                cy="21"
                                r="15.91549430918954"
                                fill="transparent"
                                stroke={seg.color}
                                strokeWidth="5"
                                strokeDasharray={dasharray}
                                strokeDashoffset={dashoffset}
                                className="donut-segment"
                            />
                        );
                    })}
                </svg>
                <div className="donut-chart-center-text">
                    <span className="donut-center-label">Overall</span>
                    <span className="donut-center-val">88%</span>
                </div>
            </div>

            {/* Legend matches visual data precisely */}
            <div className="donut-legend-list">
                {documentDistributionMock.map((item) => (
                    <div className="donut-legend-item" key={item.id}>
                        <div className="donut-legend-item-left">
                            <div
                                className="donut-legend-marker"
                                style={{ backgroundColor: item.color }}
                            />
                            <span>{item.label}</span>
                        </div>
                        <div className="donut-legend-item-right">
                            <span className="donut-legend-pct">{item.percentage}%</span>
                            <span className="donut-legend-cnt">{item.count.toLocaleString()} Documents</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Total Documents Row */}
            <div className="donut-total-row">
                <span className="donut-total-label">Total Documents:</span>
                <span className="donut-total-value">{totalDocumentsCount.toLocaleString()}</span>
            </div>
        </div>
    );
}