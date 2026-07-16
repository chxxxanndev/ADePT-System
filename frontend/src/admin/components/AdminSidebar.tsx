import { useState } from 'react';
import logoImg from '../../auth-folder/assets/logo.png';
import { adminNavigation } from '../data/dashboardMockData';
import {
    ChevronDownIcon,
    DashboardIcon,
    UserIcon,
    ClipboardListIcon,
    BarChartIcon,
    ArchiveIcon,
    SettingsIcon,
    LogoutIcon,
    MenuIcon
} from '../../users/components/icons';

interface AdminSidebarProps {
    activeView: string;
    onNavigate: (view: string) => void;
    onLogout: () => void;
    collapsed: boolean;
    onToggleCollapse: () => void;
    mobileOpen: boolean;
    setMobileOpen: (open: boolean) => void;
}

// Icon mapper for general navigation
const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    'Overview': DashboardIcon,
    'User Management': UserIcon,
    'Request queue': ClipboardListIcon,
    'Reports & Analytics': BarChartIcon,
    'Audit Log': ArchiveIcon,
    'Settings': SettingsIcon,
};

export function AdminSidebar({
    activeView,
    onNavigate,
    onLogout,
    collapsed,
    onToggleCollapse,
    mobileOpen,
    setMobileOpen
}: AdminSidebarProps) {
    const [userManagementExpanded, setUserManagementExpanded] = useState(true);

    const handleItemClick = (label: string, view: string, hasSubItems: boolean) => {
        if (hasSubItems) {
            if (label === 'User Management') {
                setUserManagementExpanded(!userManagementExpanded);
            }
        } else {
            onNavigate(view);
            if (window.innerWidth <= 900) {
                setMobileOpen(false);
            }
        }
    };

    const handleSubItemClick = (view: string) => {
        onNavigate(view);
        if (window.innerWidth <= 900) {
            setMobileOpen(false);
        }
    };

    return (
        <aside className={`admin-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
            {/* Brand Logo & Name */}
            <div className={`sidebar-brand-wrapper ${collapsed ? 'collapsed' : ''}`}>
                <div className="sidebar-brand-info">
                    <img src={logoImg} alt="ADePT Seal" className="sidebar-brand-logo" />
                    {!collapsed && <span className="sidebar-brand-title">ADePT</span>}
                </div>
                <div>
                <button
                    className="sidebar-collapse-trigger"
                    onClick={onToggleCollapse}
                    title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    <MenuIcon size={18} />
                </button>
            </div>
            </div>

            {/* Navigation Lists */}
            <nav className="sidebar-navigation">
                {adminNavigation.map((sec) => (
                    <div className="sidebar-item-container" key={sec.section}>
                        <div className="sidebar-section-header">{sec.section}</div>
                        {sec.items.map((item) => {
                            const IconComponent = ICON_MAP[item.label] || DashboardIcon;
                            const hasSubItems = !!item.subItems?.length;
                            const isExpanded = item.label === 'User Management' ? userManagementExpanded : false;

                            // Check if active
                            const isParentActive = activeView === item.view ||
                                (hasSubItems && item.subItems?.some(sub => sub.view === activeView));

                            return (
                                <div key={item.label} style={{ display: 'flex', flexDirection: 'column' }}>
                                    <button
                                        className={`sidebar-item-btn ${isParentActive ? 'active' : ''}`}
                                        onClick={() => handleItemClick(item.label, item.view, hasSubItems)}
                                    >
                                        <div className="sidebar-item-left">
                                            <span className="sidebar-item-icon">
                                                <IconComponent size={18} />
                                            </span>
                                            {!collapsed && <span className="sidebar-item-label">{item.label}</span>}
                                        </div>
                                        {!collapsed && hasSubItems && (
                                            <span className={`sidebar-chevron ${isExpanded ? 'rotated' : ''}`}>
                                                <ChevronDownIcon size={14} />
                                            </span>
                                        )}
                                    </button>

                                    {/* Sub-items list */}
                                    {!collapsed && hasSubItems && isExpanded && (
                                        <div className="sidebar-subitems-wrapper">
                                            {item.subItems?.map((sub) => (
                                                <div
                                                    key={sub.label}
                                                    className={`sidebar-subitem-link ${activeView === sub.view ? 'active' : ''}`}
                                                    onClick={() => handleSubItemClick(sub.view)}
                                                >
                                                    {sub.label}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </nav>

            {/* Logout Footer Button */}
            <div className="sidebar-footer">
                <button className="sidebar-logout-btn" onClick={onLogout} title="Log out of session">
                    <span className="sidebar-item-icon">
                        <LogoutIcon size={18} />
                    </span>
                    {!collapsed && <span>Log out</span>}
                </button>
            </div>
        </aside>
    );
}