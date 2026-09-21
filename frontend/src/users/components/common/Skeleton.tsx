import { REGISTRY_COLUMNS, REGISTRY_TABLE_MIN_WIDTH } from '../TransactionTable';

export const SkeletonBox = ({ width = '100%', height = '20px', borderRadius = '4px', margin = '0' }) => (
    <div className="skeleton-item" style={{ width, height, borderRadius, margin }} />
);

export const RegistrySummarySkeleton = () => {
    return (
        <div className="tr-summary-grid">
            {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton-card-ghost tr-summary-skeleton-card" style={{ flex: 1 }}>
                    <SkeletonBox width="65%" height="11px" margin="0 0 10px 0" />
                    <SkeletonBox width="45%" height="26px" />
                </div>
            ))}
        </div>
    );
};

export const RegistryTableSkeleton = ({ rows = 6 }: { rows?: number }) => (
    <div className="tr-card">
        <div className="tr-table-toolbar">
            <SkeletonBox width="38%" height="38px" borderRadius="999px" />
            <SkeletonBox width="170px" height="38px" borderRadius="999px" />
            <SkeletonBox width="120px" height="38px" borderRadius="10px" />
        </div>
        <div className="tr-table-scroll">
            <table
                className="tr-table tr-table--registry"
                style={{ minWidth: REGISTRY_TABLE_MIN_WIDTH }}
            >
                <thead>
                    <tr>
                        {REGISTRY_COLUMNS.map((col) => (
                            <th
                                key={col.label}
                                style={{ width: `${col.width}px`, textAlign: col.align ?? 'left' }}
                            >
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {Array.from({ length: rows }).map((_, i) => (
                        <tr key={i}>
                            <td><SkeletonBox width="82%" height="14px" /></td>
                            <td><SkeletonBox width="86%" height="14px" /></td>
                            <td><SkeletonBox width="70%" height="14px" /></td>
                            <td><SkeletonBox width="58%" height="14px" /></td>
                            <td><SkeletonBox width="58%" height="14px" /></td>
                            <td><SkeletonBox width="68%" height="14px" /></td>
                            <td><SkeletonBox width="68%" height="14px" /></td>
                            <td><SkeletonBox width="56%" height="14px" /></td>
                            <td><SkeletonBox width="64%" height="14px" /></td>
                            <td><SkeletonBox width="84px" height="24px" borderRadius="999px" /></td>
                            <td style={{ textAlign: 'center' }}>
                                <SkeletonBox width="64px" height="32px" borderRadius="8px" />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);