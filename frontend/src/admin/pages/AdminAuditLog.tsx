import { useState } from 'react';
import '../styles/AdminAuditLog.css';
import { SearchIcon } from '../components/icons';
import type { User } from '../../auth-folder/types/auth';

type AuditTone = 'approved' | 'declined' | 'system';

interface AuditEntry {
    id: string;
    message: string;
    timestamp: string;
    tone: AuditTone;
}

// TODO: replace with real data from a useAuditLog hook / API call
const mockAuditEntries: AuditEntry[] = [
    { id: '1', message: 'Vicente Desoy approved staff account — John Cruz', timestamp: 'Today, 8:40 AM', tone: 'approved' },
    { id: '2', message: 'Vicente Desoy approved tax declaration 2026-ADR', timestamp: 'Today, 8:12 AM', tone: 'approved' },
    { id: '3', message: 'Vicente Desoy declined a registration request — Liza Tan', timestamp: 'Today, 7:55 AM', tone: 'declined' },
    { id: '4', message: 'Vicente Desoy disapproved landholding request 2027-ADR', timestamp: 'Yesterday, 5:02 PM', tone: 'declined' },
    { id: '5', message: 'System — Carlo Gomez marked inactive after 90 days', timestamp: 'Yesterday, 2:30 PM', tone: 'system' },
];

const FILTER_OPTIONS = ['All activity', 'Approvals', 'Declines', 'System'];

interface AdminAuditLogProps {
    user: User;
}

export function AdminAuditLog({ user }: AdminAuditLogProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState('All activity');
    const [entries] = useState<AuditEntry[]>(mockAuditEntries);

    const fullName = `${user.firstName || 'Mommy'} ${user.lastName || 'Dionisia'}`;
    const initials = `${user.firstName?.[0] || 'M'}${user.lastName?.[0] || 'D'}`;
    const roleLabel = user.role === 'SUPER_ADMIN' ? 'Super Admin' : user.role === 'OFFICE_STAFF' ? 'Office Staff' : user.role || 'Super Admin';

    const filteredEntries = entries.filter((entry) => {
        const matchesFilter =
            filter === 'All activity' ||
            (filter === 'Approvals' && entry.tone === 'approved') ||
            (filter === 'Declines' && entry.tone === 'declined') ||
            (filter === 'System' && entry.tone === 'system');
        const matchesSearch = entry.message.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    return (
        <div className="admin-audit-log-page">
            {/* Page header — matches Request Queue's header pattern */}
            <div className="rq-page-header">
                <div className="rq-page-header-row">
                    <div>
                        <h1 className="rq-page-title">Audit log</h1>
                        <p className="rq-page-subtitle">A record of every approval, decline, and system action.</p>
                    </div>

                    <div className="admin-profile-widget">
                        <div className="profile-widget-avatar-container">
                            {initials}
                        </div>
                        <div className="profile-widget-info">
                            <span className="profile-widget-name">{fullName}</span>
                            <span className="profile-widget-email">{user.email || 'provincialassessor@gmail.com'}</span>
                            <div className="profile-widget-meta">
                                <span className="profile-widget-role">{roleLabel}</span>
                                <span>Last Login : Today • 8:12 AM</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search bar */}
                <div className="rq-search-wrapper">
                    <input
                        type="text"
                        className="rq-search-input"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <span className="rq-search-icon">
                        <SearchIcon size={16} />
                    </span>
                </div>
            </div>

            {/* Card */}
            <div className="admin-card aal-card">
                <div className="aal-card-header">
                    <h2 className="admin-card-title">Audit log</h2>

                    <div className="aal-filter-wrapper">
                        <select
                            className="aal-filter-select"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        >
                            {FILTER_OPTIONS.map((option) => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="activity-stack">
                    {filteredEntries.map((entry) => (
                        <div className="activity-item" key={entry.id}>
                            <div className={`activity-color-block ${entry.tone === 'approved' ? 'approved' : entry.tone === 'declined' ? 'declined' : 'pending'}`} />
                            <div className="activity-details">
                                <span className="activity-title">{entry.message}</span>
                                <span className="activity-meta">{entry.timestamp}</span>
                            </div>
                        </div>
                    ))}

                    {filteredEntries.length === 0 && (
                        <p className="aal-empty-state">No activity matches your search or filter.</p>
                    )}
                </div>
            </div>
        </div>
    );
}