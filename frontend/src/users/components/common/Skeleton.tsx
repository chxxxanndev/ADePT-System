import React from 'react';

// Base component
export const SkeletonBox = ({ width = '100%', height = '20px', borderRadius = '4px', margin = '0' }) => (
    <div className="skeleton-item" style={{ width, height, borderRadius, margin }} />
);

// 1. CARDS: Now with content inside!
export const RegistrySummarySkeleton = () => {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '15px', marginBottom: '24px' }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="skeleton-card-ghost">
                    {/* Ghost Label */}
                    <SkeletonBox width="50%" height="10px" margin="0 0 12px 0" />
                    {/* Ghost Number */}
                    <SkeletonBox width="30%" height="24px" />
                </div>
            ))}
        </div>
    );
};

// 2. TABLE: Now with specific column widths to match your Registry
export const RegistryTableSkeleton = () => (
    <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #eef2f6', overflow: 'hidden' }}>
        {/* Table Header Placeholder */}
        <div style={{ padding: '15px 24px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
            <SkeletonBox width="100%" height="15px" />
        </div>
        
        {/* Row Placeholder (mimics your 8 columns) */}
        {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '16px 24px', gap: '15px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ width: '12%' }}><SkeletonBox width="80%" height="12px" /></div> {/* Ref No */}
                <div style={{ width: '18%' }}> {/* Declarant */}
                    <SkeletonBox width="90%" height="12px" margin="0 0 6px 0" />
                    <SkeletonBox width="60%" height="10px" />
                </div>
                <div style={{ width: '12%' }}><SkeletonBox width="70%" height="12px" /></div> {/* Req By */}
                <div style={{ width: '20%', display: 'flex', gap: '5px' }}> {/* Documents */}
                    <SkeletonBox width="60px" height="18px" borderRadius="12px" />
                    <SkeletonBox width="60px" height="18px" borderRadius="12px" />
                </div>
                <div style={{ width: '10%' }}><SkeletonBox width="60%" height="12px" /></div> {/* Date */}
                <div style={{ width: '10%' }}><SkeletonBox width="70%" height="12px" /></div> {/* Staff */}
                <div style={{ width: '10%' }}><SkeletonBox width="80px" height="22px" borderRadius="20px" /></div> {/* Status */}
                <div style={{ width: '8%', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}> {/* Actions */}
                    <SkeletonBox width="28px" height="28px" borderRadius="50%" />
                    <SkeletonBox width="28px" height="28px" borderRadius="50%" />
                </div>
            </div>
        ))}
    </div>
);