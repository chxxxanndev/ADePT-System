import { SearchIcon, CalendarIcon, ChevronDownIcon, MenuIcon } from '../../users/components/icons';
import type { User } from '../../auth-folder/types/auth';

interface AdminHeaderProps {
    user: User;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    dateFilter: string;
    onToggleMobileMenu: () => void;
}

export function AdminHeader({
    user,
    searchQuery,
    setSearchQuery,
    dateFilter,
    onToggleMobileMenu
}: AdminHeaderProps) {
    const fullName = `${user.firstName || 'Mommy'} ${user.lastName || 'Dionisia'}`;
    const initials = `${user.firstName?.[0] || 'M'}${user.lastName?.[0] || 'D'}`;

    return (
        <header className="admin-header">
            {/* Top row containing Title and Profile */}
            <div className="header-top-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <button className="mobile-menu-toggle" onClick={onToggleMobileMenu}>
                        <MenuIcon size={20} />
                    </button>
                    <div className="header-title-section">
                        <h1 className="header-dashboard-title">
                            <span style={{ color: '#D32F2F' }}>D</span>
                            <span style={{ color: '#FF9800' }}>A</span>
                            <span style={{ color: '#FDD835' }}>S</span>
                            <span style={{ color: '#4CAF50' }}>H</span>
                            <span style={{ color: '#00BCD4' }}>B</span>
                            <span style={{ color: '#1976D2' }}>O</span>
                            <span style={{ color: '#252175' }}>A</span>
                            <span style={{ color: '#9C27B0' }}>R</span>
                            <span style={{ color: '#E91E63' }}>D</span>
                        </h1>
                        <p className="header-dashboard-subtitle">
                            Welcome back, <strong>{fullName}</strong>! Today's operations overview for the Provincial Assessor's Office.
                        </p>
                    </div>
                </div>

                {/* Profile card matching image */}
                <div className="admin-profile-widget">
                    <div className="profile-widget-avatar-container">
                        {initials}
                    </div>
                    <div className="profile-widget-info">
                        <span className="profile-widget-name">{fullName}</span>
                        <span className="profile-widget-email">{user.email || 'provincialassessor@gmail.com'}</span>
                        <div className="profile-widget-meta">
                            <span className="profile-widget-role">
                                {user.role === 'SUPER_ADMIN' ? 'Super Admin' : user.role === 'OFFICE_STAFF' ? 'Office Staff' : user.role || 'Super Admin'}
                            </span>
                            <span>Last Login : Today • 8:12 AM</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Row containing Search and Date */}
            <div className="header-actions-row">
                <div className="admin-search-wrapper">
                    <span className="admin-search-icon">
                        <SearchIcon size={18} />
                    </span>
                    <input
                        type="text"
                        placeholder="Search by Account, Staff, Control No. or Document..."
                        className="admin-search-input"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <button className="date-selector-btn" onClick={() => console.log('Toggle date selector modal')}>
                    <CalendarIcon size={16} />
                    <span>{dateFilter}</span>
                    <ChevronDownIcon size={14} />
                </button>
            </div>
        </header>
    );
}
