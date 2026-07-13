import { useState } from 'react';
import type { NavSection } from '../types/dashboard';
import logoImg from '../assets/logo.png';
import {
    ChevronDownIcon,
    DashboardIcon,
    FilePlusIcon,
    ClipboardListIcon,
    FilesIcon,
    SwapIcon,
    BarChartIcon,
    SettingsIcon,
    LogoutIcon,
    MenuIcon
} from './icons';

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    dashboard: DashboardIcon,
    newRequest: FilePlusIcon,
    requestProcessing: ClipboardListIcon,
    documentProcessing: FilesIcon,
    transactionManagement: SwapIcon,
    reports: BarChartIcon,
    settings: SettingsIcon,
};


interface SidebarProps {
    sections: NavSection[];
    activeView: string;
    onNavigate: (view: string) => void;
    onLogout: () => void;
    mobileOpen?: boolean;
    setMobileOpen?: (open: boolean) => void; // Added to handle mobile closing
    collapsed: boolean;                      // NOW CONTROLLED: lifted to parent so
    onToggleCollapse: () => void;            // Dashboard can force-collapse on certain views
}

export function Sidebar({
    sections,
    activeView,
    onNavigate,
    onLogout,
    mobileOpen,
    setMobileOpen,
    collapsed,
    onToggleCollapse,
}: SidebarProps) {
    const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

    const toggleMenu = (label: string) => {
        if (collapsed) onToggleCollapse(); // Expand if clicking an item while collapsed
        setOpenMenus((prev) => ({ ...prev, [label]: !prev[label] }));
    };

    const handleToggleSidebar = () => {
        if (window.innerWidth <= 900 && setMobileOpen) {
            setMobileOpen(false); // Close drawer on mobile
        } else {
            onToggleCollapse(); // Collapse/Expand on desktop
        }
    };

    return (
        <aside className={`dashboard-sidebar ${mobileOpen ? 'mobile-open' : ''} ${collapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-brand">
                <div className="sidebar-brand-left">
                    <div className="sidebar-logo-circle">
                        <img src={logoImg} alt="ADePT" />
                    </div>
                    {!collapsed && <span className="sidebar-brand-name">ADePT</span>}
                </div>
                <button className="sidebar-toggle-btn" onClick={handleToggleSidebar} title="Toggle Sidebar">
                    <MenuIcon size={18} />
                </button>
            </div>

            <nav className="sidebar-nav">
                {sections.map((section) => (
                    <div className="nav-section" key={section.label}>
                        {!collapsed && <span className="nav-section-label">{section.label}</span>}

                        {section.items.map((item) => {
                            const Icon = ICONS[item.icon] ?? DashboardIcon;
                            const hasSubItems = !!item.subItems?.length;
                            const isOpen = !!openMenus[item.label];
                            const isActive = item.view === activeView;

                            return (
                                <div key={item.label}>
                                    <button
                                        className={`nav-item ${isActive ? 'active' : ''}`}
                                        onClick={() => (hasSubItems ? toggleMenu(item.label) : item.view && onNavigate(item.view))}
                                        title={collapsed ? item.label : ""}
                                    >
                                        <span className="nav-item-icon"><Icon size={18} /></span>
                                        {!collapsed && <span className="nav-item-label">{item.label}</span>}
                                        {!collapsed && hasSubItems && (
                                            <span className={`nav-item-chevron ${isOpen ? 'open' : ''}`}>
                                                <ChevronDownIcon size={14} />
                                            </span>
                                        )}
                                    </button>

                                    {!collapsed && hasSubItems && (
                                        <div className={`nav-subitems ${isOpen ? 'open' : ''}`}>
                                            {item.subItems!.map((sub) => (
                                                <div
                                                    key={sub.label}
                                                    className={`nav-subitem ${sub.view === activeView ? 'active' : ''}`}
                                                    onClick={() => onNavigate(sub.view)}
                                                >
                                                    <span className="nav-subitem-label">{sub.label}</span>
                                                    {typeof sub.badge === 'number' && sub.badge > 0 && (
                                                        <span className="nav-subitem-badge">{sub.badge}</span>
                                                    )}
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

            <button className="sidebar-logout" onClick={onLogout} title={collapsed ? "Log out" : ""}>
                <span className="nav-item-icon"><LogoutIcon size={18} /></span>
                {!collapsed && <span className="nav-item-label">Log out</span>}
            </button>
        </aside>
    );
}