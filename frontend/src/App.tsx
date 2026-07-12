import { useState } from 'react';
import type { View } from './types/auth';
import { useAuth } from './hooks/useAuth';
import { AuthBanner } from './components/AuthBanner';
import { LoginForm } from './pages/LoginForm';
import { SignupForm } from './pages/SignupForm';
import { ForgotPasswordForm } from './pages/ForgotPasswordForm';
import { Dashboard } from './pages/Dashboard';

function App() {
  const [view, setView] = useState<View>('login');
  const [prefilledUsername, setPrefilledUsername] = useState('');

  const { currentUser, backendHealthy, loading, login, signUp, forgotPassword, logout } = useAuth();

  const handleSignupSuccess = (username: string) => {
    setPrefilledUsername(username);
  };

  const navigateTo = (newView: View) => setView(newView);

  if (currentUser) {
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