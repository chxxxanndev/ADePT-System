import logoImg from '../../auth-folder/assets/logo.png';
import { MapPinIcon } from './icons';

export function DashboardFooter() {
    const year = new Date().getFullYear();

    return (
        <footer className="dashboard-footer">
            <div className="dashboard-footer-top">
                <div className="footer-brand">
                    <div className="footer-brand-logo">
                        <img width={50} height={50} src={logoImg} alt="ADePT" />
                    </div>
                    <div className="footer-brand-text">
                        <span className="footer-brand-title">ADePT v1.0.0</span>
                        <span className="footer-brand-tagline">Assessor Document Processing and Tracking System</span>
                    </div>
                </div>

                <div className="footer-office">
                    <span className="footer-office-name">Provincial Assessor's Office</span>
                    <span className="footer-office-location">
                        <MapPinIcon size={12} /> Province of Zamboanga del Norte
                    </span>
                </div>
            </div>

            <div className="footer-copyright">
                © {year} Provincial Government of Zamboanga del Norte. All Rights Reserved.
            </div>
        </footer>
    );

}