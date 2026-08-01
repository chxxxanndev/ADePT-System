
// Base component
export const SkeletonBox = ({ width = '100%', height = '20px', borderRadius = '4px', margin = '0' }) => (
    <div className="skeleton-item" style={{ width, height, borderRadius, margin }} />
);

// 1. CARDS: mirrors the real SummaryCards — a single Total card now,
// reusing .tr-summary-grid--single so it sizes/positions exactly like
// the loaded card does.
export const RegistrySummarySkeleton = () => {
    return (
        <div className="tr-summary-grid tr-summary-grid--single">
            <div className="skeleton-card-ghost tr-summary-skeleton-card">
                <SkeletonBox width="65%" height="11px" margin="0 0 10px 0" />
                <SkeletonBox width="45%" height="26px" />
            </div>
        </div>
    );
};

// 2. TOOLBAR: mirrors the real .tr-toolbar's 4 controls (search, status
// select, doc type select, date range — Reset omitted since it's a plain
// button, not data-dependent) inside the same .tr-toolbar-skeleton row.
export const RegistryToolbarSkeleton = () => (
    <div className="tr-toolbar-skeleton">
        <SkeletonBox width="36%" height="42px" borderRadius="10px" />
        <SkeletonBox width="15%" height="42px" borderRadius="10px" />
        <SkeletonBox width="18%" height="42px" borderRadius="10px" />
        <SkeletonBox width="20%" height="42px" borderRadius="10px" />
    </div>
);

const COLUMNS = [
    'Reference Number',
    'Declarant',
    'Requested By',
    'Date Requested',
    'Assigned Staff',
    'Current Status',
    'Actions',
];

// 3. TABLE: a real <table className="tr-table"> inside a real .tr-card,
// so column widths come straight from the CSS (table-layout: fixed +
// nth-child %) — guaranteed to line up with the loaded table, including
// the mobile fallback to a scrollable table below 720px.
export const RegistryTableSkeleton = ({ rows = 6 }: { rows?: number }) => (
    <div className="tr-card">
        <table className="tr-table">
            <thead>
                <tr>
                    {COLUMNS.map((col) => (
                        <th key={col} style={col === 'Actions' ? { textAlign: 'center' } : undefined}>
                            {col}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {Array.from({ length: rows }).map((_, i) => (
                    <tr key={i}>
                        <td><SkeletonBox width="80%" height="12px" /></td>
                        <td>
                            <SkeletonBox width="90%" height="12px" margin="0 0 6px 0" />
                            <SkeletonBox width="60%" height="10px" />
                        </td>
                        <td><SkeletonBox width="70%" height="12px" /></td>
                        <td><SkeletonBox width="60%" height="12px" /></td>
                        <td><SkeletonBox width="70%" height="12px" /></td>
                        <td><SkeletonBox width="80px" height="22px" borderRadius="999px" /></td>
                        <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                <SkeletonBox width="28px" height="28px" borderRadius="50%" />
                                <SkeletonBox width="28px" height="28px" borderRadius="50%" />
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);