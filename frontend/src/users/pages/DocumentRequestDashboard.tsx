import { useState, useEffect } from 'react';
import type { User } from '../../auth-folder/types/auth';
import { requestService } from '../services/requestService';
import { ClipboardListIcon, FilePlusIcon, RefreshIcon } from '../components/icons';
import '../styles/DocumentRequestDashboard.css';

interface DocumentRequestDashboardProps {
    user: User;
    onSelectNewRequest: (type: 'tax' | 'landholding' | 'nolandholding') => void;
    onSelectDraft: (draft: any) => void;
    onSelectDocumentView: (view: string) => void;
}

export function DocumentRequestDashboard({
    user: _user,
    onSelectNewRequest,
    onSelectDraft,
    onSelectDocumentView,
}: DocumentRequestDashboardProps) {
    const [drafts, setDrafts] = useState<any[]>([]);
    const [metadata, setMetadata] = useState<{ docTypes: any[] }>({ docTypes: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDraftsAndMetadata = async () => {
        setLoading(true);
        setError(null);
        try {
            const meta = await requestService.getMetadata();
            if (meta) {
                setMetadata({ docTypes: Array.isArray(meta.docTypes) ? meta.docTypes : [] });
            }

            const data = await requestService.getRequests();
            if (Array.isArray(data)) {
                const draftRequests = data.filter(
                    (req: any) => req.status && req.status.toUpperCase() === 'DRAFT'
                );
                setDrafts(draftRequests);
            } else {
                setDrafts([]);
            }
        } catch (err: any) {
            console.error('Failed to fetch requests or metadata', err);
            setError('Could not load draft requests from server.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDraftsAndMetadata();
    }, []);

    const getDocTypeNames = (typeIds: string[]) => {
        if (!typeIds || typeIds.length === 0) return ['Unspecified'];
        return typeIds.map((id) => {
            const found = metadata.docTypes.find((d) => d.id === id);
            return found ? found.name : 'Unknown Document';
        });
    };

    const REQUEST_CARDS = [
        {
            type: 'tax-declaration' as const,
            className: 'tax-dec',
            icon: '🏛️',
            label: 'Tax Declaration',
            desc: 'Generate latest or historical certified true copies of property tax declarations.',
            badge: 'Form Entry',
        },
        {
            type: 'certificate-land-holding' as const,
            className: 'land-holding',
            icon: '📜',
            label: 'Certificate of Land Holding',
            desc: 'Generate official certifications listing all properties declared under a specific client.',
            badge: 'Form Entry',
        },
        {
            type: 'certificate-no-landholding' as const,
            className: 'no-landholding',
            icon: '📋',
            label: 'Certificate of No Landholding',
            desc: 'Create certifications verifying that a client owns no real property in this region.',
            badge: 'Form Entry',
        },
    ];


    const handleDeleteDraft = async (e: React.MouseEvent, draftId: string) => {
        e.stopPropagation(); // Prevents the row click from opening the draft
        if (confirm("Are you sure you want to permanently delete this abandoned draft?")) {
            try {
                await requestService.deleteRequest(draftId);
                // Update UI state immediately:
                setDrafts(prev => prev.filter(d => d.id !== draftId));
            } catch (err) {
                console.error("Delete draft error:", err);
                alert("Failed to delete draft.");
            }
        }
    };

    return (
        // ADDED page-transition class to fix the glitching!
        <div className="doc-req-container page-transition">
            {/* Header */}
            <div className="doc-req-header">
                <div className="doc-req-title-section">
                    <h1>Document Requests Hub</h1>
                    <p>Create new request records or complete existing drafts for approval</p>
                </div>
                <button
                    className="sidebar-toggle-btn"
                    onClick={fetchDraftsAndMetadata}
                    title="Refresh Data"
                    style={{
                        background: 'rgba(41, 35, 122, 0.07)',
                        color: 'var(--db-primary)',
                        display: 'flex',
                        gap: '8px',
                        padding: '10px 18px',
                        borderRadius: '8px',
                        fontWeight: 700,
                        border: '1px solid rgba(41,35,122,0.12)',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        alignItems: 'center',
                    }}
                >
                    <RefreshIcon size={15} />
                    <span>Refresh</span>
                </button>
            </div>

            {/* Request Type Cards */}
            <div className="doc-req-types-section">
                <h2 className="doc-req-section-title">
                    <span className="doc-req-section-icon">📑</span>
                    <span>Select Document Type</span>
                </h2>
                <div className="doc-req-grid">
                    {REQUEST_CARDS.map((card) => (
                        <div
                            key={card.type}
                            className={`doc-req-card ${card.className}`}
                            // This ensures the entry form opens properly
                            onClick={() => onSelectNewRequest(card.type === 'tax-declaration' ? 'tax' : card.type === 'certificate-land-holding' ? 'landholding' : 'nolandholding')}
                            role="button"
                            tabIndex={0}
                        >
                            <div className="doc-req-card-top">
                                <div className="doc-req-card-icon-container">
                                    {card.icon}
                                </div>
                                <span className="doc-req-card-stat">{card.badge}</span>
                            </div>

                            <div className="doc-req-card-body">
                                <h3>{card.label}</h3>
                                <p>{card.desc}</p>
                            </div>

                            <div className="doc-req-card-action">
                                <span>Fill Request Form</span>
                                <span>→</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Saved Draft Requests */}
            <div className="doc-req-drafts-section">
                <div className="doc-req-drafts-header">
                    <div className="doc-req-drafts-header-title">
                        <h2>Saved Request Drafts</h2>
                        <p>Draft requests that need document generation or staff action</p>
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '36px', color: 'var(--db-text-muted)', fontSize: '0.9rem' }}>
                        Loading drafts…
                    </div>
                ) : error ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--db-error)' }}>
                        {error}
                        <button
                            onClick={fetchDraftsAndMetadata}
                            style={{
                                display: 'block',
                                margin: '12px auto',
                                padding: '8px 16px',
                                background: 'var(--db-primary)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: 700,
                            }}
                        >
                            Retry
                        </button>
                    </div>
                ) : drafts.length === 0 ? (
                    <div className="doc-req-empty-state">
                        <div className="doc-req-empty-icon">📁</div>
                        <h3>No Drafts Found</h3>
                        <p>All saved document requests are fully processed. Create a new form to begin.</p>
                    </div>
                ) : (
                    <div className="doc-req-drafts-list">
                        {drafts.map((draft) => {
                            const docNames = getDocTypeNames(draft.documentTypeIds || []);
                            return (
                                <div
                                    className="doc-req-draft-row"
                                    key={draft.id}
                                    onClick={() => onSelectDraft(draft)}
                                    title="Click to resume processing this draft request"
                                >
                                    <div className="doc-req-draft-ref" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ color: 'var(--db-primary)', display: 'inline-flex' }}>
                                            <FilePlusIcon size={16} />
                                        </span>
                                        <span>{draft.control_number || draft.referenceNumber || 'REF-XXXX'}</span>
                                    </div>
                                    <div className="doc-req-draft-declarant">
                                        <div style={{ fontSize: '0.65rem', color: 'var(--db-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Declarant</div>
                                        <div>{draft.declarant_name || draft.declarantName}</div>
                                    </div>
                                    <div className="doc-req-draft-date">
                                        <div style={{ fontSize: '0.65rem', color: 'var(--db-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Date</div>
                                        <div>{draft.request_date || draft.requestDate}</div>
                                    </div>
                                    <div className="doc-req-draft-docs">
                                        {docNames.map((name, i) => (
                                            <span className="doc-req-draft-doc-badge" key={i} title={name}>
                                                {name}
                                            </span>
                                        ))}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span className="doc-req-draft-badge-status">
                                            {draft.status}
                                        </span>
                                        <div className="doc-req-draft-action-btn">
                                            <ClipboardListIcon size={18} />
                                        </div>
                                        <div
                                            className="doc-req-draft-delete-btn"
                                            onClick={(e) => handleDeleteDraft(e, draft.id)}
                                            title="Delete Abandoned Draft"
                                        >
                                            🗑️
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}