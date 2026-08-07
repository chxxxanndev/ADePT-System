import { useState, useEffect } from 'react';
import type { User } from '../../auth-folder/types/auth';
import { requestService } from '../services/requestService';
import {
    ClipboardListIcon,
    FilePlusIcon,
    RefreshIcon,
    LandmarkIcon,
    ScrollTextIcon,
    FileCheckIcon,
    LayersIcon,
    FolderOpenIcon,
    TrashIcon,
    AlertTriangleIcon,
} from '../components/icons';
import '../styles/DocumentRequestDashboard.css';
import { NameTooltip } from '../components/common/NameTooltip';

interface DocumentRequestDashboardProps {
    user: User;
    onSelectNewRequest: (type: 'tax' | 'landholding' | 'nolandholding') => void;
    onSelectDraft: (draft: any) => void;
    onSelectDocumentView: (view: string) => void;
    onNavigateToDashboard?: () => void;
}

export function DocumentRequestDashboard({
    user: _user,
    onSelectNewRequest,
    onSelectDraft,
    onSelectDocumentView: _onSelectDocumentView,
    onNavigateToDashboard,
}: DocumentRequestDashboardProps) {
    const [drafts, setDrafts] = useState<any[]>([]);
    const [metadata, setMetadata] = useState<{ docTypes: any[] }>({ docTypes: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectMode, setSelectMode] = useState(false);
    const [selectedDraftIds, setSelectedDraftIds] = useState<string[]>([]);
    const [deleteModalState, setDeleteModalState] = useState<{ open: boolean; idsToDelete: string[]; draftRefs: string[] }>({
        open: false,
        idsToDelete: [],
        draftRefs: [],
    });
    const [isDeleting, setIsDeleting] = useState(false);

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

    const toggleSelectDraft = (id: string) => {
        setSelectedDraftIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const handleToggleSelectAll = () => {
        if (selectedDraftIds.length === drafts.length) {
            setSelectedDraftIds([]);
        } else {
            setSelectedDraftIds(drafts.map((d) => d.id));
        }
    };

    const handleDeleteSelected = () => {
        if (selectedDraftIds.length === 0) return;
        const selectedDrafts = drafts.filter((d) => selectedDraftIds.includes(d.id));
        const refs = selectedDrafts.map((d) => d.control_number || d.referenceNumber || d.declarant_name || d.declarantName || 'Draft Request');
        setDeleteModalState({
            open: true,
            idsToDelete: selectedDraftIds,
            draftRefs: refs,
        });
    };

    const handleDeleteDraft = (e: React.MouseEvent, draft: any) => {
        e.stopPropagation();
        const ref = draft.control_number || draft.referenceNumber || draft.declarant_name || draft.declarantName || 'Draft Request';
        setDeleteModalState({
            open: true,
            idsToDelete: [draft.id],
            draftRefs: [ref],
        });
    };

    const handleConfirmDeleteModal = async () => {
        if (deleteModalState.idsToDelete.length === 0) return;
        setIsDeleting(true);
        try {
            await Promise.all(deleteModalState.idsToDelete.map((id) => requestService.deleteRequest(id)));
            setDrafts((prev) => prev.filter((d) => !deleteModalState.idsToDelete.includes(d.id)));
            setSelectedDraftIds((prev) => prev.filter((id) => !deleteModalState.idsToDelete.includes(id)));
            if (selectedDraftIds.every((id) => deleteModalState.idsToDelete.includes(id))) {
                setSelectMode(false);
            }
            setDeleteModalState({ open: false, idsToDelete: [], draftRefs: [] });
        } catch (err) {
            console.error('Delete draft error:', err);
            alert('Failed to delete draft request(s). Please try again.');
        } finally {
            setIsDeleting(false);
        }
    };

    const getDocTypeNames = (typeIds: string[]) => {
        if (!typeIds || typeIds.length === 0) return ['Unspecified'];
        return typeIds.map((id) => {
            const found = metadata.docTypes.find((d) => d.id === id);
            return found ? found.name : 'Unknown Document';
        });
    };

    const formatDate = (value: string) => {
        if (!value) return '—';
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return value;
        return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    };

    const REQUEST_CARDS = [
        {
            type: 'tax-declaration' as const,
            className: 'tax-dec',
            icon: <LandmarkIcon size={22} />,
            label: 'Tax Declaration',
            desc: 'Generate latest or historical certified true copies of property tax declarations.',
            badge: 'Form Entry',
        },
        {
            type: 'certificate-land-holding' as const,
            className: 'land-holding',
            icon: <ScrollTextIcon size={22} />,
            label: 'Certificate of Land Holding',
            desc: 'Generate official certifications listing all properties declared under a specific client.',
            badge: 'Form Entry',
        },
        {
            type: 'certificate-no-landholding' as const,
            className: 'no-landholding',
            icon: <FileCheckIcon size={22} />,
            label: 'Certificate of No Landholding',
            desc: 'Create certifications verifying that a client owns no real property in this region.',
            badge: 'Form Entry',
        },
    ];

    return (
        <div className="doc-req-container page-transition">
            {/* Breadcrumb — Dashboard > Document Request */}
            <nav className="doc-req-breadcrumb" aria-label="Breadcrumb">
                <button
                    type="button"
                    className="doc-req-breadcrumb-item--link"
                    onClick={onNavigateToDashboard}
                >
                    Dashboard
                </button>
                <span className="doc-req-breadcrumb-sep">&gt;</span>
                <span className="doc-req-breadcrumb-item--current">Document Request</span>
            </nav>

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
                    <span className="doc-req-section-icon">
                        <LayersIcon size={18} />
                    </span>
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
                        <h2>
                            Saved Request Drafts
                            {drafts.length > 0 && <span className="doc-req-drafts-count">{drafts.length}</span>}
                        </h2>
                        <p>Draft requests that need document generation or staff action</p>
                    </div>
                    {drafts.length > 0 && (
                        <div className="doc-req-drafts-header-actions">
                            {!selectMode ? (
                                <button
                                    className="doc-req-select-btn"
                                    onClick={() => setSelectMode(true)}
                                    title="Enable selection mode to select drafts to delete"
                                >
                                    <ClipboardListIcon size={14} />
                                    <span>Select</span>
                                </button>
                            ) : (
                                <div className="doc-req-select-actions">
                                    <button
                                        className="doc-req-select-all-btn"
                                        onClick={handleToggleSelectAll}
                                    >
                                        <span>{selectedDraftIds.length === drafts.length ? 'Deselect All' : 'Select All'}</span>
                                    </button>
                                    <button
                                        className="doc-req-delete-selected-btn"
                                        onClick={handleDeleteSelected}
                                        disabled={selectedDraftIds.length === 0}
                                    >
                                        <TrashIcon size={14} />
                                        <span>Delete Selected ({selectedDraftIds.length})</span>
                                    </button>
                                    <button
                                        className="doc-req-cancel-select-btn"
                                        onClick={() => {
                                            setSelectMode(false);
                                            setSelectedDraftIds([]);
                                        }}
                                    >
                                        <span>Done</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
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
                        <div className="doc-req-empty-icon">
                            <FolderOpenIcon size={32} />
                        </div>
                        <h3>No Drafts Found</h3>
                        <p>All saved document requests are fully processed. Create a new form to begin.</p>
                    </div>
                ) : (
                    <div className="doc-req-drafts-wrapper">
                        {/* Table Layout Headers */}
                        <div className={`doc-req-draft-table-header ${selectMode ? 'has-checkbox' : ''}`}>
                            {selectMode && (
                                <div className="doc-req-checkbox-cell">
                                    <input
                                        type="checkbox"
                                        checked={selectedDraftIds.length === drafts.length && drafts.length > 0}
                                        onChange={handleToggleSelectAll}
                                        title="Select all drafts"
                                    />
                                </div>
                            )}
                            <div>Reference</div>
                            <div>Declarant</div>
                            <div>Document Details</div>
                            <div className="doc-req-col-actions">Actions</div>
                        </div>

                        <div className="doc-req-drafts-list">
                            {drafts.map((draft) => {
                                const docNames = getDocTypeNames(draft.documentTypeIds || []);
                                const isSelected = selectedDraftIds.includes(draft.id);
                                const declarant = draft.declarant_name || draft.declarantName || 'Unnamed Declarant';
                                return (
                                    <div
                                        className={`doc-req-draft-row ${selectMode ? 'has-checkbox' : ''} ${isSelected ? 'selected' : ''}`}
                                        key={draft.id}
                                        onClick={() => selectMode && toggleSelectDraft(draft.id)}
                                        title={selectMode ? 'Click to select/deselect draft' : undefined}
                                    >
                                        {selectMode && (
                                            <div className="doc-req-checkbox-cell" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelectDraft(draft.id)}
                                                />
                                            </div>
                                        )}
                                        <div className="doc-req-draft-ref-group">
                                            <div className="doc-req-draft-ref">
                                                <FilePlusIcon size={14} />
                                                <span>{draft.control_number || draft.referenceNumber || 'REF-XXXX'}</span>
                                                <span className="doc-req-draft-badge-status">
                                                    {draft.status || 'Draft'}
                                                </span>
                                            </div>
                                            <div className="doc-req-draft-date">
                                                {formatDate(draft.request_date || draft.requestDate)}
                                            </div>
                                        </div>
                                        <div className="doc-req-draft-declarant">
                                            <NameTooltip value={declarant}>{declarant}</NameTooltip>
                                        </div>
                                        <div className="doc-req-draft-docs">
                                            {docNames.map((name, i) => (
                                                <span className="doc-req-draft-doc-badge" key={i} title={name}>
                                                    {name}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="doc-req-draft-actions">
                                            {/* New Icon Edit Button */}
                                            <button
                                                className="doc-req-draft-edit-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSelectDraft(draft);
                                                }}
                                                title="Continue Editing"
                                                aria-label="Edit Draft"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M12 20h9"></path>
                                                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                                                </svg>
                                            </button>

                                            <button
                                                className="doc-req-draft-delete-btn"
                                                onClick={(e) => handleDeleteDraft(e, draft)}
                                                title="Delete Abandoned Draft"
                                                aria-label="Delete Draft"
                                            >
                                                <TrashIcon size={15} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {deleteModalState.open && (
                <div
                    className="doc-req-modal-backdrop"
                    onClick={() => !isDeleting && setDeleteModalState({ open: false, idsToDelete: [], draftRefs: [] })}
                >
                    <div className="doc-req-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="doc-req-modal-header">
                            <div className="doc-req-modal-icon-badge">
                                <AlertTriangleIcon size={24} />
                            </div>
                            <div className="doc-req-modal-title-group">
                                <h3>Delete Draft Request{deleteModalState.idsToDelete.length > 1 ? 's' : ''}?</h3>
                                <p>Permanently remove {deleteModalState.idsToDelete.length > 1 ? `${deleteModalState.idsToDelete.length} draft requests` : 'this draft request'}</p>
                            </div>
                        </div>

                        <div className="doc-req-modal-body">
                            <p style={{ margin: '0 0 12px 0' }}>
                                Are you sure you want to delete {deleteModalState.idsToDelete.length > 1 ? 'the following selected draft requests' : 'this draft request'}?
                                This action <strong>cannot be undone</strong> and all pre-filled details will be permanently removed.
                            </p>

                            <div className="doc-req-modal-item-list">
                                {deleteModalState.draftRefs.map((ref, idx) => (
                                    <div key={idx} className="doc-req-modal-item-chip">
                                        <TrashIcon size={12} />
                                        <span>{ref}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="doc-req-modal-footer">
                            <button
                                className="doc-req-modal-cancel-btn"
                                onClick={() => setDeleteModalState({ open: false, idsToDelete: [], draftRefs: [] })}
                                disabled={isDeleting}
                            >
                                Cancel
                            </button>
                            <button
                                className="doc-req-modal-confirm-btn"
                                onClick={handleConfirmDeleteModal}
                                disabled={isDeleting}
                            >
                                {isDeleting ? (
                                    <>
                                        <span className="loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <TrashIcon size={14} />
                                        Delete {deleteModalState.idsToDelete.length > 1 ? `(${deleteModalState.idsToDelete.length})` : ''}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}