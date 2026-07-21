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
    onSelectDocumentView: _onSelectDocumentView,
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
        e.stopPropagation();
        if (confirm("Are you sure you want to permanently delete this abandoned draft?")) {
            try {
                await requestService.deleteRequest(draftId);
                setDrafts(prev => prev.filter(d => d.id !== draftId));
            } catch (err) {
                console.error("Delete draft error:", err);
                alert("Failed to delete draft.");
            }
        }
    };

    return (
        <div className="doc-req-container page-transition">
            {/* Header Area */}
            <div className="doc-req-header">
                <div className="doc-req-title-section">
                    <h1>Document Requests Hub</h1>
                    <p>Create new request records or complete existing drafts for approval</p>
                </div>
                <button
                    className="doc-req-refresh-btn"
                    onClick={fetchDraftsAndMetadata}
                    title="Refresh Data"
                >
                    <RefreshIcon size={14} />
                    <span>Refresh</span>
                </button>
            </div>

            {/* Document Selection Grid */}
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
                                <span className="action-arrow">→</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Saved Request Drafts Registry */}
            <div className="doc-req-drafts-section">
                <div className="doc-req-drafts-header">
                    <div className="doc-req-drafts-header-title">
                        <h2>Saved Request Drafts</h2>
                        <p>Draft requests that need document generation or staff action</p>
                    </div>
                </div>

                {loading ? (
                    <div className="doc-req-loader">
                        <span className="loading-spinner"></span>
                        <p>Loading drafts...</p>
                    </div>
                ) : error ? (
                    <div className="doc-req-error">
                        <p>{error}</p>
                        <button onClick={fetchDraftsAndMetadata} className="retry-btn">
                            Retry Connection
                        </button>
                    </div>
                ) : drafts.length === 0 ? (
                    <div className="doc-req-empty-state">
                        <div className="doc-req-empty-icon">📁</div>
                        <h3>No Drafts Found</h3>
                        <p>All saved document requests are fully processed. Create a new form to begin.</p>
                    </div>
                ) : (
                    <div className="doc-req-drafts-wrapper">
                        {/* Table Layout Headers */}
                        <div className="doc-req-draft-table-header">
                            <div>Reference Number</div>
                            <div>Declarant</div>
                            <div>Date Created</div>
                            <div>Document Details</div>
                            <div style={{ textAlign: 'right', paddingRight: '12px' }}>Actions</div>
                        </div>

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
                                        <div className="doc-req-draft-ref">
                                            <FilePlusIcon size={14} />
                                            <span>{draft.control_number || draft.referenceNumber || 'REF-XXXX'}</span>
                                        </div>
                                        <div className="doc-req-draft-declarant">
                                            {draft.declarant_name || draft.declarantName}
                                        </div>
                                        <div className="doc-req-draft-date">
                                            {draft.request_date || draft.requestDate}
                                        </div>
                                        <div className="doc-req-draft-docs">
                                            {docNames.map((name, i) => (
                                                <span className="doc-req-draft-doc-badge" key={i} title={name}>
                                                    {name}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="doc-req-draft-actions">
                                            <span className="doc-req-draft-badge-status">
                                                {draft.status || 'Draft'}
                                            </span>
                                            <button className="doc-req-draft-action-btn" aria-label="Edit Draft">
                                                <ClipboardListIcon size={15} />
                                            </button>
                                            <button
                                                className="doc-req-draft-delete-btn"
                                                onClick={(e) => handleDeleteDraft(e, draft.id)}
                                                title="Delete Abandoned Draft"
                                                aria-label="Delete Draft"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}