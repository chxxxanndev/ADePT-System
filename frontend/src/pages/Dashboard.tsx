import type { User } from '../types/auth';
import sealImg from '../assets/seal.png';
import logoImg from '../assets/logo.png';

interface DashboardProps {
    user: User;
    backendHealthy: boolean | null;
    onLogout: () => void;
}

export function Dashboard({ user, backendHealthy, onLogout }: DashboardProps) {
    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div className="dashboard-header-brand">
                    <img src={sealImg} alt="Zamboanga del Norte Seal" className="page-brand-logo" />
                    <img src={logoImg} alt="ADePT Logo" className="page-brand-logo" />
                    <div>
                        <h1 style={{ fontSize: '30px', color: 'var(--primary-color)', margin: '0 0 5px', fontWeight: 800 }}>
                            ADePT Portal
                        </h1>
                        <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                            Assessor Document Processing &amp; Tracking System
                        </p>
                    </div>
                </div>
                <button className="logout-btn" onClick={onLogout}>Sign Out</button>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '19px', marginBottom: '10px', color: 'var(--primary-color)' }}>
                    Welcome back, {user.firstName}!
                </h2>
                <p style={{ fontWeight: 550, color: 'var(--text-muted)' }}>
                    You have successfully signed in to the Assessor's Portal.
                </p>
            </div>

            <div className="user-profile-card">
                <div className="profile-field">
                    <span className="profile-label">First Name</span>
                    <span className="profile-value">{user.firstName}</span>
                </div>
                <div className="profile-field">
                    <span className="profile-label">Last Name</span>
                    <span className="profile-value">{user.lastName}</span>
                </div>
                <div className="profile-field">
                    <span className="profile-label">Email Address</span>
                    <span className="profile-value">{user.email}</span>
                </div>
                <div className="profile-field">
                    <span className="profile-label">Username</span>
                    <span className="profile-value">{user.username}</span>
                </div>
            </div>

            <div
                style={{
                    padding: '16px 20px',
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    borderRadius: '8px',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    color: '#1e3a8a',
                    fontSize: '14px',
                    fontWeight: 600,
                }}
            >
                System Connection Mode: {backendHealthy ? 'Connected to Express & Supabase Backend' : 'Standalone Frontend Demo Mode'}
            </div>
        </div>
    );
}