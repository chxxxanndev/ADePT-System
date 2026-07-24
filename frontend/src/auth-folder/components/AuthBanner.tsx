import sealImg from '../assets/seal.png';
import logoImg from '../assets/logo.png';
import bgImg from '../assets/background.jpg';
import type { View } from '../types/auth';

interface AuthBannerProps {
    view: View;
}

export function AuthBanner({ view }: AuthBannerProps) {
    return (
        <div
            className="auth-banner"
            // 2. Apply the image and the ADePT blue overlay gradient here inline
            style={{
                backgroundImage: `linear-gradient(rgba(41, 35, 122, 0.85), rgba(41, 35, 122, 0.85)), url(${bgImg})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            }}
        >
            <div className="banner-content">
                <div className="banner-header">
                    <div className="header-logos">
                        <img src={sealImg} alt="Zamboanga del Norte Seal" className="seal-logo" />
                        <img src={logoImg} alt="ADePT Logo" className="adept-logo" />
                    </div>
                    <div className="header-text">
                        <span className="header-country">Republic of the Philippines</span>
                        <span className="header-province">Province of Zamboanga del Norte</span>
                        <span className="header-office">Provincial Assessor's Office</span>
                    </div>
                </div>

                <div className="banner-branding-area">
                    {/* LOGIN / FORGOT: Left-aligned ADePT + vertical divider + taglines */}
                    <div className={`banner-branding-content ${view === 'login' || view === 'forgotPassword' || view === 'resetPassword' ? 'active' : ''}`}>
                        <div className="banner-branding-signup">
                            <h1 className="branding-title-signup">ADePT</h1>
                            <div className="branding-divider"></div>
                            <div className="branding-tags">
                                <span className="branding-tag">Secure</span>
                                <span className="branding-tag">Accurate</span>
                                <span className="branding-tag">Accountable</span>
                            </div>
                        </div>
                    </div>

                    {/* SIGNUP: Centered ADePT + system subtitle */}
                    <div className={`banner-branding-content ${view === 'signup' ? 'active' : ''}`}>
                        <div className="banner-branding-login">
                            <h1 className="branding-title">ADePT</h1>
                            <p className="branding-subtitle">Assessor Document Processing and Tracking System</p>
                        </div>
                    </div>
                </div>

                <div className="banner-footer-area">
                    <div className={`banner-footer-content ${view === 'signup' ? 'active' : ''}`}>
                        <p className="banner-footer-desc">
                            A secure web-based document processing and tracking system designed to streamline the
                            issuance, monitoring, and management of official assessment documents for the Provincial
                            Assessor's Office.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}