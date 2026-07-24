import { useState } from 'react';
import { CloseIcon } from './icons';
import '../styles/ForwardToStaffModal.css';

interface StaffOption { id: string; name: string; role?: string; }

interface ForwardToStaffModalProps {
    open: boolean;
    staffOptions: StaffOption[];
    currentStaffId?: string;
    referenceNumber?: string;
    onClose: () => void;
    onConfirm: (staffId: string, note: string) => Promise<void> | void;
}

export function ForwardToStaffModal({
    open, staffOptions, currentStaffId, referenceNumber, onClose, onConfirm,
}: ForwardToStaffModalProps) {
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState('');
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    if (!open) return null;

    const options = staffOptions.filter((s) => s.id !== currentStaffId);
    const filtered = search.trim()
        ? options.filter((s) => s.name.toLowerCase().includes(search.trim().toLowerCase()))
        : options;

    const handleConfirm = async () => {
        if (!selectedId) { setError('Select a staff member to forward this to.'); return; }
        setError('');
        setSubmitting(true);
        try {
            await onConfirm(selectedId, note);
            setSelectedId(''); setNote(''); setSearch('');
        } catch (err: any) {
            setError(err?.message || 'Failed to forward. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="ftsm-overlay" onClick={onClose}>
            <div className="ftsm-modal" onClick={(e) => e.stopPropagation()}>
                <div className="ftsm-header">
                    <div>
                        <h3 className="ftsm-title">Forward This Request</h3>
                        {referenceNumber && <span className="ftsm-subtitle">{referenceNumber}</span>}
                    </div>
                    <button className="ftsm-close-btn" onClick={onClose} title="Close">
                        <CloseIcon size={18} />
                    </button>
                </div>

                <div className="ftsm-body">
                    <label className="ftsm-label">Search staff</label>
                    <input
                        className="ftsm-search"
                        type="text"
                        placeholder="Type a name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                    />

                    <div className="ftsm-staff-list">
                        {filtered.length === 0 && <div className="ftsm-empty">No matching staff found</div>}
                        {filtered.map((s) => (
                            <button
                                type="button"
                                key={s.id}
                                className={`ftsm-staff-option ${selectedId === s.id ? 'ftsm-staff-option-selected' : ''}`}
                                onClick={() => setSelectedId(s.id)}
                            >
                                <span className="ftsm-staff-avatar">{s.name.charAt(0).toUpperCase()}</span>
                                <span className="ftsm-staff-info">
                                    <span className="ftsm-staff-name">{s.name}</span>
                                    {s.role && <span className="ftsm-staff-role">{s.role}</span>}
                                </span>
                                {selectedId === s.id && <span className="ftsm-staff-check">✓</span>}
                            </button>
                        ))}
                    </div>

                    <label className="ftsm-label" style={{ marginTop: 14 }}>
                        Note {selectedId ? `for ${options.find((o) => o.id === selectedId)?.name}` : ''} (optional)
                    </label>
                    <textarea
                        className="ftsm-note"
                        placeholder="e.g. Client is waiting at the counter, please prioritize."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={3}
                    />

                    {error && <div className="ftsm-error">{error}</div>}
                </div>

                <div className="ftsm-footer">
                    <button className="ftsm-btn-cancel" onClick={onClose} disabled={submitting}>Cancel</button>
                    <button className="ftsm-btn-confirm" onClick={handleConfirm} disabled={submitting || !selectedId}>
                        {submitting ? 'Forwarding…' : '📨 Forward Request'}
                    </button>
                </div>
            </div>
        </div>
    );
}