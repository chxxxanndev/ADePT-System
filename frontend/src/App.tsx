import { useState } from 'react';
import type { View } from './auth-folder/types/auth';
import { useAuth } from './users/hooks/useAuth';
import { AuthBanner } from './users/components/AuthBanner';
import { LoginForm } from './auth-folder/LoginForm';
import { SignupForm } from './auth-folder/SignupForm';
import { ForgotPasswordForm } from './auth-folder/ForgotPasswordForm';
import { Dashboard } from './users/pages/Dashboard';
import { AdminDashboard } from './admin/pages/AdminDashboard';

function App() {
  const [view, setView] = useState<View>('login');
  const [prefilledUsername, setPrefilledUsername] = useState('');

  const { currentUser, backendHealthy, loading, login, signUp, forgotPassword, logout } = useAuth();

  const handleSignupSuccess = (username: string) => {
    setPrefilledUsername(username);
  };

  const navigateTo = (newView: View) => setView(newView);

  if (currentUser) {
    const isAdmin = currentUser.role === 'SUPER_ADMIN';
    if (isAdmin) {
      return <AdminDashboard user={currentUser} onLogout={logout} />;
    }
    return <Dashboard user={currentUser} backendHealthy={backendHealthy} onLogout={logout} />;
  }

  return (
    <div className={`auth-container${view === 'signup' ? ' signup-mode' : ''}`}>
      <AuthBanner view={view} />

      <div className="auth-form-container">
        <div className="form-content-area">
          <LoginForm
            active={view === 'login'}
            loading={loading}
            onLogin={login}
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
            active={view === 'forgot'}
            loading={loading}
            onForgotPassword={forgotPassword}
            navigateTo={navigateTo}
          />
        </div>
      </div>
    </div>
  );
}

export default App;