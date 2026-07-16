import type { ReactNode } from 'react';
import '../styles/Reports.css';
import {
    documentsReleased,
    totalRequests,
    documentsReleasedTrend,
    totalRequestsTrend,
    documentTypeBreakdown,
    processingQueue,
    transactionManagement,
    completionRate,
    avgTurnaroundHours,
    staffReleaseSummary,
} from '../data/reportsMockData';
import type { PeriodMetric, TrendInfo, DocumentTypeMetric, SimpleMetric, StaffReleaseSummary } from '../data/reportsMockData';

function TrendBadge({ trend }: { trend: TrendInfo }) {
    return (
        <span className={`report-trend-badge ${trend.direction}`}>
            {trend.direction === 'up' ? '↑' : '↓'} {trend.percentage}% {trend.comparedTo}
        </span>
    );
}

function PeriodStatCard({
    label,
    icon,
    metric,
    trend,
}: {
    label: string;
    icon: ReactNode;
    metric: PeriodMetric;
    trend?: TrendInfo;
}) {
    return (
        <div className="report-card period-stat-card">
            <div className="period-stat-header">
                <span className="report-card-icon">{icon}</span>
                <span className="period-stat-label">{label}</span>
                {trend && <TrendBadge trend={trend} />}
            </div>
            <div className="period-stat-columns">
                <div className="period-stat-column">
                    <span className="period-stat-value">{metric.daily}</span>
                    <span className="period-stat-period">Today</span>
                </div>
                <div className="period-stat-divider" />
                <div className="period-stat-column">
                    <span className="period-stat-value">{metric.weekly}</span>
                    <span className="period-stat-period">This Week</span>
                </div>
                <div className="period-stat-divider" />
                <div className="period-stat-column">
                    <span className="period-stat-value">{metric.monthly}</span>
                    <span className="period-stat-period">This Month</span>
                </div>
            </div>
        </div>
    );
}

function DocumentTypeCard({ doc }: { doc: DocumentTypeMetric }) {
    return (
        <div className="report-card doc-type-card">
            <div className="doc-type-header">
                <span className="doc-type-dot" style={{ background: doc.color }} />
                <span className="doc-type-label">{doc.label}</span>
            </div>
            <div className="period-stat-columns">
                <div className="period-stat-column">
                    <span className="period-stat-value">{doc.daily}</span>
                    <span className="period-stat-period">Today</span>
                </div>
                <div className="period-stat-divider" />
                <div className="period-stat-column">
                    <span className="period-stat-value">{doc.weekly}</span>
                    <span className="period-stat-period">This Week</span>
                </div>
                <div className="period-stat-divider" />
                <div className="period-stat-column">
                    <span className="period-stat-value">{doc.monthly}</span>
                    <span className="period-stat-period">This Month</span>
                </div>
            </div>
        </div>
    );
}

function SimpleStatCard({ item }: { item: SimpleMetric }) {
    return (
        <div className="report-card simple-stat-card">
            <span className="simple-stat-dot" style={{ background: item.color }} />
            <div className="simple-stat-text">
                <span className="simple-stat-value">{item.count}</span>
                <span className="simple-stat-label">{item.label}</span>
            </div>
        </div>
    );
}

function StaffReleaseRow({ item, isLast }: { item: StaffReleaseSummary; isLast: boolean }) {
    return (
        <div className={`staff-release-row ${isLast ? 'no-border' : ''}`}>
            <span className="staff-release-icon" style={{ background: item.color }} />
            <div className="staff-release-text">
                <span className="staff-release-title">
                    {item.totalReleased} {item.docTypeLabel}
                </span>
                <span className="staff-release-subtitle">
                    {item.mostRecentStaff} · {item.mostRecentTime}
                </span>
            </div>
        </div>
    );
}

export function Reports() {
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="reports-page">
            <div className="reports-page-header">
                <div>
                    <h1 className="reports-page-title">Reports & Analytics</h1>
                    <p className="reports-page-subtitle">
                        A breakdown of document processing activity for the Provincial Assessor's Office.
                    </p>
                </div>
                <button className="report-print-btn" onClick={handlePrint}>
                    Print Report
                </button>
            </div>

            {/* Overview */}
            <section className="reports-section">
                <h2 className="reports-section-title">Documents Released &amp; Requests</h2>
                <div className="reports-grid two-col">
                    <PeriodStatCard
                        label="Documents Released"
                        icon={<CheckIcon />}
                        metric={documentsReleased}
                        trend={documentsReleasedTrend}
                    />
                    <PeriodStatCard
                        label="Total Requests"
                        icon={<InboxIcon />}
                        metric={totalRequests}
                        trend={totalRequestsTrend}
                    />
                </div>
            </section>

            {/* By document type */}
            <section className="reports-section">
                <h2 className="reports-section-title">Requests by Document Type</h2>
                <div className="reports-grid three-col">
                    {documentTypeBreakdown.map((doc) => (
                        <DocumentTypeCard doc={doc} key={doc.id} />
                    ))}
                </div>
            </section>

            {/* Documents released by staff */}
            <section className="reports-section">
                <h2 className="reports-section-title">Documents Released by Staff</h2>
                <p className="reports-section-subtitle">Running totals per document type, with the most recent release.</p>
                <div className="report-card staff-release-card">
                    {staffReleaseSummary.map((item, idx) => (
                        <StaffReleaseRow item={item} key={item.id} isLast={idx === staffReleaseSummary.length - 1} />
                    ))}
                </div>
            </section>

            {/* Processing queue */}
            <section className="reports-section">
                <h2 className="reports-section-title">Processing Queue</h2>
                <p className="reports-section-subtitle">Current snapshot — items awaiting action right now.</p>
                <div className="reports-grid two-col">
                    {processingQueue.map((item) => (
                        <SimpleStatCard item={item} key={item.id} />
                    ))}
                </div>
            </section>

            {/* Transaction management */}
            <section className="reports-section">
                <h2 className="reports-section-title">Transaction Management</h2>
                <div className="reports-grid four-col">
                    {transactionManagement.map((item) => (
                        <SimpleStatCard item={item} key={item.id} />
                    ))}
                </div>
            </section>

            {/* Performance insights */}
            <section className="reports-section">
                <h2 className="reports-section-title">Performance Insights</h2>
                <p className="reports-section-subtitle">Additional indicators worth tracking alongside raw counts.</p>
                <div className="reports-grid two-col">
                    <div className="report-card insight-card">
                        <span className="insight-value">{completionRate}%</span>
                        <span className="insight-label">Completion Rate</span>
                        <span className="insight-detail">Requests successfully released vs. total requested this month</span>
                    </div>
                    <div className="report-card insight-card">
                        <span className="insight-value">{avgTurnaroundHours}h</span>
                        <span className="insight-label">Avg. Turnaround Time</span>
                        <span className="insight-detail">From request intake to document release</span>
                    </div>
                </div>
            </section>
        </div>
    );
}

// ── Inline icons (self-contained, no dependency on icons.tsx) ──
function CheckIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function InboxIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 4h16l2 8v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6l2-8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <path d="M2 12h5l2 3h6l2-3h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}