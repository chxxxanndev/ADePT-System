import React, { useState, useEffect } from 'react';
import sealImg from './assets/seal.png';
import logoImg from './assets/logo.png';

type View = 'login' | 'signup' | 'forgot';

interface User {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
}

const API_BASE_URL = 'http://localhost:5000';

function App() {
  const [view, setView] = useState<View>('login');
  
  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('adept_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Client-side mock user database
  const [mockDb, setMockDb] = useState<Array<User & { password?: string }>>(() => {
    const saved = localStorage.getItem('adept_mock_db');
    if (saved) return JSON.parse(saved);
    return [
      {
        firstName: "Juan",
        lastName: "Dela Cruz",
        email: "JuanDelaCruz@gmail.com",
        username: "admin",
        password: "Password123!"
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('adept_mock_db', JSON.stringify(mockDb));
  }, [mockDb]);

  // General App states
  const [backendHealthy, setBackendHealthy] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Check Backend health on mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/health`);
        if (res.ok) {
          const data = await res.json();
          setBackendHealthy(true);
          console.log(`Connected to backend in ${data.mode} mode.`);
        } else {
          setBackendHealthy(false);
        }
      } catch (err) {
        setBackendHealthy(false);
      }
    };
    checkHealth();
  }, []);

  // Form Fields - Login
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Form Fields - Sign Up
  const [signupFirstName, setSignupFirstName] = useState('');
  const [signupLastName, setSignupLastName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);

  // Form Fields - Forgot Password
  const [forgotEmail, setForgotEmail] = useState('');

  // Clear messages on view swap
  const navigateTo = (newView: View) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setView(newView);
  };

  // --- Handlers ---

  // Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername || !loginPassword) {
      setErrorMsg('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (backendHealthy) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: loginUsername, password: loginPassword })
        });
        const data = await res.json();

        if (res.ok) {
          localStorage.setItem('adept_token', data.token);
          localStorage.setItem('adept_user', JSON.stringify(data.user));
          setCurrentUser(data.user);
          setSuccessMsg('Successfully signed in.');
        } else {
          setErrorMsg(data.error || 'Invalid credentials.');
        }
      } catch (err) {
        setErrorMsg('Network error. Failed to reach auth server.');
      } finally {
        setLoading(false);
      }
    } else {
      setTimeout(() => {
        const user = mockDb.find(
          u => (u.username === loginUsername || u.email === loginUsername) && u.password === loginPassword
        );
        if (user) {
          const userObj = {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            username: user.username
          };
          localStorage.setItem('adept_user', JSON.stringify(userObj));
          setCurrentUser(userObj);
          setSuccessMsg('Successfully signed in (Standalone Demo Mode).');
        } else {
          setErrorMsg('Invalid username/email or password.');
        }
        setLoading(false);
      }, 600);
    }
  };

  // Handle Sign Up Submit
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!signupFirstName || !signupLastName || !signupEmail || !signupUsername || !signupPassword) {
      setErrorMsg('All fields are required.');
      return;
    }

    if (signupPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);

    if (backendHealthy) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: signupFirstName,
            lastName: signupLastName,
            email: signupEmail,
            username: signupUsername,
            password: signupPassword
          })
        });
        const data = await res.json();

        if (res.ok) {
          setSuccessMsg('Registration successful! You can now sign in.');
          setLoginUsername(signupUsername);
          setTimeout(() => setView('login'), 2000);
        } else {
          setErrorMsg(data.error || 'Registration failed.');
        }
      } catch (err) {
        setErrorMsg('Network error. Failed to reach registration server.');
      } finally {
        setLoading(false);
      }
    } else {
      setTimeout(() => {
        const exists = mockDb.some(u => u.username === signupUsername || u.email === signupEmail);
        if (exists) {
          setErrorMsg('Username or Email already registered.');
          setLoading(false);
          return;
        }

        const newUser = {
          firstName: signupFirstName,
          lastName: signupLastName,
          email: signupEmail,
          username: signupUsername,
          password: signupPassword
        };

        setMockDb(prev => [...prev, newUser]);
        setSuccessMsg('Registration successful! You can now sign in.');
        setLoginUsername(signupUsername);
        setLoading(false);
        setTimeout(() => setView('login'), 2000);
      }, 800);
    }
  };

  // Handle Forgot Password Submit
  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    setTimeout(() => {
      setSuccessMsg('Password reset instructions have been sent to your email.');
      setLoading(false);
    }, 800);
  };

  const handleLogout = () => {
    localStorage.removeItem('adept_user');
    localStorage.removeItem('adept_token');
    setCurrentUser(null);
    setLoginPassword('');
    setView('login');
  };

  const LockDisclaimer = () => (
    <div className="authorized-disclaimer">
      <span className="disclaimer-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
          <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM5 8h6a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/>
        </svg>
      </span>
      <span>Only authorized personnel of the Provincial Assessor's Office may access this system.</span>
    </div>
  );

  return (
    <>
      {currentUser ? (
        /* Authenticated Dashboard View */
        <div className="dashboard-container">
          <div className="dashboard-header">
            <div>
              <h1 style={{ fontSize: '30px', color: 'var(--primary-color)', margin: '0 0 5px', fontWeight: 800 }}>ADePT Portal</h1>
              <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Assessor Document Processing & Tracking System</p>
            </div>
            <button className="logout-btn" onClick={handleLogout}>Sign Out</button>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '19px', marginBottom: '10px', color: 'var(--primary-color)' }}>Welcome back, {currentUser.firstName}!</h2>
            <p style={{ fontWeight: 550, color: 'var(--text-muted)' }}>You have successfully signed in to the Assessor's Portal.</p>
          </div>

          <div className="user-profile-card">
            <div className="profile-field">
              <span className="profile-label">First Name</span>
              <span className="profile-value">{currentUser.firstName}</span>
            </div>
            <div className="profile-field">
              <span className="profile-label">Last Name</span>
              <span className="profile-value">{currentUser.lastName}</span>
            </div>
            <div className="profile-field">
              <span className="profile-label">Email Address</span>
              <span className="profile-value">{currentUser.email}</span>
            </div>
            <div className="profile-field">
              <span className="profile-label">Username</span>
              <span className="profile-value">{currentUser.username}</span>
            </div>
          </div>

          <div style={{ padding: '16px 20px', backgroundColor: 'rgba(59, 130, 246, 0.15)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#1e3a8a', fontSize: '14px', fontWeight: 600 }}>
            System Connection Mode: {backendHealthy ? 'Connected to Express & Supabase Backend' : 'Standalone Frontend Demo Mode'}
          </div>
        </div>
      ) : (
        /* Login / Signup Split Container */
        <div className={`auth-container${view === 'signup' ? ' signup-mode' : ''}`}>
          
          {/* Banner / Branding Panel */}
          <div className="auth-banner">
            <div className="banner-content">
              
              {/* Header Logos */}
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

              {/* Middle Branding — cross-fades between Login and Signup text */}
              <div className="banner-branding-area">
                {/* LOGIN: Left-aligned ADePT + vertical divider + taglines */}
                <div className={`banner-branding-content ${view === 'login' || view === 'forgot' ? 'active' : ''}`}>
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

              {/* Banner Footer Description — visible on signup */}
              <div className="banner-footer-area">
                <div className={`banner-footer-content ${view === 'signup' ? 'active' : ''}`}>
                  <p className="banner-footer-desc">
                    A secure web-based document processing and tracking system designed to streamline the issuance, monitoring, and management of official assessment documents for the Provincial Assessor's Office.
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Form Container Panel */}
          <div className="auth-form-container">
            <div className="form-content-area">

              {/* VIEW 1: LOGIN FORM */}
              <div className={`form-content-wrapper ${view === 'login' ? 'active' : ''}`}>
                <div>
                  {errorMsg && view === 'login' && (
                    <div className="alert-banner error">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                      </svg>
                      {errorMsg}
                    </div>
                  )}
                  {successMsg && view === 'login' && (
                    <div className="alert-banner success">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                      </svg>
                      {successMsg}
                    </div>
                  )}
                </div>

                <div className="form-header-area">
                  <h2 className="form-title">Welcome Back!</h2>
                  <p className="form-subtitle">Please sign in using your office credentials to access the ADePT System.</p>
                </div>

                <form className="auth-form" onSubmit={handleLoginSubmit}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="username">Username</label>
                    <input
                      type="text"
                      id="username"
                      className="form-input"
                      placeholder="Enter your username"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="password">Password</label>
                    <div className="input-wrapper">
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        id="password"
                        className="form-input"
                        placeholder="Enter your password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                      >
                        {showLoginPassword ? (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <span className="forgot-password-link" onClick={() => navigateTo('forgot')}>
                    Forgot Password?
                  </span>

                  <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? 'Signing In...' : 'Sign In'}
                  </button>

                  <div className="form-footer-actions">
                    Don't have an account?{' '}
                    <span className="footer-link" onClick={() => navigateTo('signup')}>
                      Sign Up here
                    </span>
                  </div>
                </form>

                <LockDisclaimer />
              </div>

              {/* VIEW 2: SIGN UP FORM */}
              <div className={`form-content-wrapper ${view === 'signup' ? 'active' : ''}`}>
                <div>
                  {errorMsg && view === 'signup' && (
                    <div className="alert-banner error">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                      </svg>
                      {errorMsg}
                    </div>
                  )}
                  {successMsg && view === 'signup' && (
                    <div className="alert-banner success">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                      </svg>
                      {successMsg}
                    </div>
                  )}
                </div>

                <div className="form-header-area">
                  <h2 className="form-title">Sign up to create account</h2>
                </div>

                <form className="auth-form" onSubmit={handleSignUpSubmit}>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label" htmlFor="firstName">First Name</label>
                      <input
                        type="text"
                        id="firstName"
                        className="form-input"
                        placeholder="Juan"
                        value={signupFirstName}
                        onChange={(e) => setSignupFirstName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="lastName">Last Name</label>
                      <input
                        type="text"
                        id="lastName"
                        className="form-input"
                        placeholder="Dela Cruz"
                        value={signupLastName}
                        onChange={(e) => setSignupLastName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="signupEmail">Email Address</label>
                    <input
                      type="email"
                      id="signupEmail"
                      className="form-input"
                      placeholder="JuanDelaCruz@gmail.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="signupUsername">Username</label>
                    <input
                      type="text"
                      id="signupUsername"
                      className="form-input"
                      placeholder="Enter your username"
                      value={signupUsername}
                      onChange={(e) => setSignupUsername(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="signupPassword">Password</label>
                    <div className="input-wrapper">
                      <input
                        type={showSignupPassword ? 'text' : 'password'}
                        id="signupPassword"
                        className="form-input"
                        placeholder="••••••••••••••••"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                        aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                      >
                        {showSignupPassword ? (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="signupConfirmPassword">Confirm Password</label>
                    <div className="input-wrapper">
                      <input
                        type={showSignupConfirmPassword ? 'text' : 'password'}
                        id="signupConfirmPassword"
                        className="form-input"
                        placeholder="••••••••••••••••"
                        value={signupConfirmPassword}
                        onChange={(e) => setSignupConfirmPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)}
                        aria-label={showSignupConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showSignupConfirmPassword ? (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? 'Registering...' : 'Sign Up'}
                  </button>

                  <div className="form-footer-actions">
                    Already have an account?{' '}
                    <span className="footer-link" onClick={() => navigateTo('login')}>
                      Sign In here
                    </span>
                  </div>
                </form>

                <LockDisclaimer />
              </div>

              {/* VIEW 3: FORGOT PASSWORD FORM */}
              <div className={`form-content-wrapper ${view === 'forgot' ? 'active' : ''}`}>
                <div>
                  {errorMsg && view === 'forgot' && (
                    <div className="alert-banner error">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                      </svg>
                      {errorMsg}
                    </div>
                  )}
                  {successMsg && view === 'forgot' && (
                    <div className="alert-banner success">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                      </svg>
                      {successMsg}
                    </div>
                  )}
                </div>

                <div className="form-header-area">
                  <h2 className="form-title">Forgot Password?</h2>
                  <p className="form-subtitle">Enter your email address and we'll send you instructions to reset your password.</p>
                </div>

                <form className="auth-form" onSubmit={handleForgotSubmit}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="forgotEmail">Email Address</label>
                    <input
                      type="email"
                      id="forgotEmail"
                      className="form-input"
                      placeholder="Enter your email address"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                    />
                  </div>

                  <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? 'Sending...' : 'Send Reset Instructions'}
                  </button>

                  <div className="form-footer-actions">
                    Remember your password?{' '}
                    <span className="footer-link" onClick={() => navigateTo('login')}>
                      Sign In here
                    </span>
                  </div>
                </form>

                <LockDisclaimer />
              </div>

            </div>
          </div>

        </div>
      )}
    </>
  );
}

export default App;
