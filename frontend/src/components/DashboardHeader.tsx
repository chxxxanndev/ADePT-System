import type { UserProfile } from '../types/dashboard';
import { SearchIcon, MenuIcon, CalendarIcon, UserIcon } from './icons';

interface DashboardHeaderProps {
    user: UserProfile;
    userName: string;
    onToggleMobileMenu?: () => void;
    title?: string;           // NEW: defaults to "Dashboard"
    subtitle?: string;        // NEW: defaults to the welcome-back copy
    brandMode?: boolean;      // NEW: true = ASSESSORDESK logo/branding style
}

export function DashboardHeader({
    user,
    userName,
    onToggleMobileMenu,
    title = 'Dashboard',
    subtitle,
    brandMode = false,
}: DashboardHeaderProps) {
    return (
        <header className={`dashboard-header ${brandMode ? 'dashboard-header-brand' : ''}`}>
            <div className="header-left">
                <button className="header-menu-btn" onClick={onToggleMobileMenu} aria-label="Toggle menu">
                    <MenuIcon size={22} />
                </button>

                {brandMode ? (
                    <div className="header-brand">
                        <div className="header-brand-logo">📋</div>
                        <div>
                            <h1 className="header-brand-title">
                                ASSESSOR<span className="header-brand-accent">DESK</span>
                            </h1>
                            <p className="header-brand-subtitle">
                                {subtitle || 'Office Of The Provincial Assessor'}
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        <h1 className="header-title">{title}</h1>
                        <div className="header-welcome">
                            <h2 className="welcome-title">
                                Welcome back, <span className="welcome-name">{userName}</span>!
                            </h2>
                            <p className="welcome-subtitle">
                                {subtitle || "Today's operations overview for the Provincial Assessor's Office."}
                            </p>
                        </div>
                    </>
                )}
            </div>

            <div className="header-profile">
                <div className="header-profile-card">
                    <div className="header-profile-avatar">
                        <UserIcon size={18} />
                    </div>
                    <div className="header-profile-namebox">
                        <span className="header-profile-name">{user.name}</span>
                        <span className="header-profile-email">{user.email}</span>
                    </div>
                </div>
                <div className="header-profile-meta">
                    <span className="header-profile-role">{user.role}</span>
                    <span className="header-profile-lastlogin">Last Login : {user.lastLogin}</span>
                </div>
            </div>
        </header>
    );
}

interface WelcomeBannerProps {
    periodLabel?: string;
}

export function WelcomeBanner({ periodLabel = 'This Month' }: WelcomeBannerProps) {
    return (
        <div className="dashboard-welcome">
            <div className="header-search">
                <SearchIcon size={16} />
                <input type="text" placeholder="Search by Control No, Declarant, ARP No, OR Number..." />
            </div>

            <div className="period-selector">
                <CalendarIcon size={14} />
                <span>Dashboard Period: {periodLabel}</span>
            </div>
        </div>
    );
}