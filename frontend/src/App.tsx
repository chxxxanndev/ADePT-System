import { useState, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import type { View } from './auth-folder/types/auth';
import { useAuth } from "./users/hooks/useAuth";
import { AuthBanner } from './auth-folder/components/AuthBanner';
import { LoginForm } from './auth-folder/LoginForm';
import { SignupForm } from './auth-folder/SignupForm';
import { ForgotPasswordForm } from './auth-folder/ForgotPasswordForm';
import { ResetPasswordForm } from './auth-folder/ResetPasswordForm';
import { Dashboard } from './users/pages/Dashboard';
import { AdminDashboard } from './admin/pages/AdminDashboard';
import { CartProvider } from './users/hooks/TransactionCartContext';
import { SessionInterruptionBanner } from '../src/users/components/SessionInterruptionBanner';
import { LogoutConfirmModal } from './users/components/LogoutConfirmModal';

function App() {
  const [view, setView] = useState<View>('login');
  const [prefilledUsername, setPrefilledUsername] = useState('');
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  const {
    currentUser,
    sessionReady,
    backendHealthy,
    loading,
    login,
    updateCurrentUser,
    reactivateAccount,
    signUp,
    forgotPassword,
    logout,
    roleNotice,
    dismissRoleNotice
  } = useAuth();

  // Only show the "Restoring session..." UI if the restore is taking a
  // noticeable amount of time (>150ms). Most restores resolve well under
  // that, so this avoids a jarring flash on every refresh while still
  // blocking Dashboard from mounting until sessionReady is actually true.
  const [showRestoring, setShowRestoring] = useState(false);

  useEffect(() => {
    if (currentUser && !sessionReady) {
      const timer = setTimeout(() => setShowRestoring(true), 150);
      return () => clearTimeout(timer);
    }
    setShowRestoring(false);
  }, [currentUser, sessionReady]);

  const handleSignupSuccess = (username: string) => {
    setPrefilledUsername(username);
  };
  
  // A session *restore* (currentUser rehydrated from a saved token on
  // refresh, see sessionReady above) never calls `login()` — only an actual
  // form submission does — so clearing these keys here only fires on a real
  // login, and refreshes are left untouched.
  const handleLogin = (...args: Parameters<typeof login>) => {
    sessionStorage.removeItem('adept-active-view');
    sessionStorage.removeItem('adept-completed-entry');
    sessionStorage.removeItem('adept-admin-active-view'); 
    return login(...args);
  };

  // Reactivating a disabled account also sets currentUser directly (see
  // useAuth.ts) and mounts Dashboard on success — same entry point as a
  // normal login, so it needs the same reset.
  const handleReactivate = (...args: Parameters<typeof reactivateAccount>) => {
    sessionStorage.removeItem('adept-active-view');
    sessionStorage.removeItem('adept-completed-entry');
    sessionStorage.removeItem('adept-admin-active-view'); 
    return reactivateAccount(...args);
  };

  const navigateTo = (newView: View) => setView(newView);

  // Routine logout (sidebar buttons on both dashboards) is gated behind a
  // confirmation modal; the actual logout logic in useAuth is untouched and
  // only runs when the staff member confirms. Emergency flows (session
  // interruption banner, role-notice "Got it", account-disabled forced
  // logout) call `logout` directly and are not gated.
  const handleLogoutRequest = () => setConfirmingLogout(true);
  const handleLogoutCancel = () => setConfirmingLogout(false);
  const handleLogoutConfirm = () => {
    setConfirmingLogout(false);
    void logout();
  };

  useEffect(() => {
    if (window.location.pathname === '/reset-password') {
      setView('resetPassword');
    }
  }, []);

  if (currentUser && !sessionReady) {
    return showRestoring
      ? <div className="white-screen-fix">Restoring session...</div>
      : null;
  }

  if (currentUser) {
    const isAdminOrAbove =
      currentUser.role === 'SUPER_ADMIN' ||
      currentUser.role === 'ADMIN';

    return (
      <BrowserRouter>
        <CartProvider>
          <SessionInterruptionBanner onLogout={logout} />
          {isAdminOrAbove ? (
            <AdminDashboard user={currentUser} onLogout={handleLogoutRequest} />
          ) : (
            <Dashboard
              user={currentUser}
              backendHealthy={backendHealthy}
              onLogout={handleLogoutRequest}
              onUserUpdate={updateCurrentUser}
            />
          )}
          <LogoutConfirmModal
            open={confirmingLogout}
            onCancel={handleLogoutCancel}
            onConfirm={handleLogoutConfirm}
          />
          {roleNotice && (
            <div className="role-notice-overlay" role="presentation" onClick={dismissRoleNotice}>
              <div className="role-notice-modal" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                <div
                  className={`role-notice-badge${roleNotice.variant === 'demoted' ? ' role-notice-badge--staff' : ''}`}
                  aria-hidden="true"
                >
                  {roleNotice.variant === 'demoted' ? 'STAFF' : 'ADMIN'}
                </div>
                <h3 className="role-notice-title">{roleNotice.title}</h3>
                <p className="role-notice-message">{roleNotice.message}</p>
                <button
                  type="button"
                  className="role-notice-button"
                  onClick={() => { void logout(); }}
                >
                  Got it
                </button>
              </div>
            </div>
          )}
        </CartProvider>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <CartProvider>
        <div className={`auth-container${view === 'signup' ? ' signup-mode' : ''}`}>
          <AuthBanner view={view} />

          <div className="auth-form-container">
            <div className="form-content-area">
              <LoginForm
                active={view === 'login'}
                loading={loading}
                onLogin={handleLogin}
                onReactivate={handleReactivate}
                navigateTo={navigateTo}
                initialUsername={prefilledUsername}
              />
              <SignupForm
                active={view === 'signup'}
                loading={loading}
                onSignUp={signUp}
                navigateTo={navigateTo}
                prefillUsername={handleSignupSuccess}
              />
              <ForgotPasswordForm
                active={view === 'forgotPassword'}
                loading={loading}
                onForgotPassword={forgotPassword}
                navigateTo={navigateTo}
              />
              <ResetPasswordForm
                active={view === 'resetPassword'}
                navigateTo={navigateTo}
              />
            </div>
          </div>
        </div>
      </CartProvider>
    </BrowserRouter>
  );
}

export default App;