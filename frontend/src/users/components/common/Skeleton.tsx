import React from 'react';

// Base component
export const SkeletonBox = ({ width = '100%', height = '20px', borderRadius = '4px', margin = '0' }) => (
    <div className="skeleton-item" style={{ width, height, borderRadius, margin }} />
);

// 1. CARDS: reuses the real .tr-summary-grid class so it collapses to
// 3 columns at 1100px and 2 columns at 720px exactly like the loaded cards do.
export const RegistrySummarySkeleton = () => {
    return (
        <div className="tr-summary-grid">
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="skeleton-card-ghost">
                    {/* Ghost Label */}
                    <SkeletonBox width="60%" height="10px" margin="0 0 8px 0" />
                    {/* Ghost Number */}
                    <SkeletonBox width="35%" height="22px" />
                </div>
            ))}
        </div>
    );
};

// 2. TOOLBAR: mirrors the real .tr-toolbar's 5 controls (search, 2 selects,
// date range, reset) inside the same .tr-toolbar-skeleton row container.
export const RegistryToolbarSkeleton = () => (
    <div className="tr-toolbar-skeleton">
        <SkeletonBox width="32%" height="42px" borderRadius="10px" />
        <SkeletonBox width="15%" height="42px" borderRadius="10px" />
        <SkeletonBox width="15%" height="42px" borderRadius="10px" />
        <SkeletonBox width="18%" height="42px" borderRadius="10px" />
        <SkeletonBox width="10%" height="42px" borderRadius="10px" />
    </div>
);

const COLUMNS = [
    'Control Number',
    'Declarant',
    'Requested By',
    'Requested Documents',
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
                        <td>
                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                <SkeletonBox width="70px" height="20px" borderRadius="999px" />
                                <SkeletonBox width="70px" height="20px" borderRadius="999px" />
                            </div>
                        </td>
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