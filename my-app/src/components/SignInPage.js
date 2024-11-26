import React, { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, facebookProvider } from '../firebase/firebase-config';
import { useNavigate } from 'react-router-dom';
import './SignInPage.css'; // Ensure you have the CSS file for styling

const SignInPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSignIn = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard'); // Redirect to a dashboard or home page after sign-in
    } catch (error) {
      setError(error.message);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/dashboard');
    } catch (error) {
      setError(error.message);
    }
  };

  const handleFacebookSignIn = async () => {
    try {
      await signInWithPopup(auth, facebookProvider);
      navigate('/dashboard');
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className="signin-container">
      <div className="signin-left">
        <div className="logo-container">
          <img src="spclogofinal.png" alt="Logo" className="logo" />
          <div className="system-name">SIMS</div>
        </div>
      </div>
      <div className="signin-right">
        <h2>Sign In</h2>
        <form className="signin-form" onSubmit={handleSignIn}>
          <div className="form-group">
            <input
              type="email"
              id="email"
              name="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-actions">
            <a href="/forgot-password" className="forgot-password">Forgot Password?</a>
          </div>
          <button type="submit" className="login-button">Sign In</button>
          <div className="or-container">
            <span>or</span>
          </div>
            <div className="other-login-options">
              <button type="button" className="google-signin" onClick={handleGoogleSignIn}>
                <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google Logo" />
                Sign in with Google
              </button>
              <button type="button" className="facebook-signin" onClick={handleFacebookSignIn}>
                <img src="https://www.facebook.com/images/fb_icon_325x325.png" alt="Facebook Logo" />
                Sign in with Facebook
              </button>
            </div>
          <div className="new-account">
            <span>New here? </span><a href="/create-account" className="create-account">Create an account</a>
          </div>
          {error && <p className="error">{error}</p>}
        </form>
      </div>
    </div>
  );
};

export default SignInPage;
