// src/components/ForgotPasswordPage.js
import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase/firebase-config';
import { useNavigate } from 'react-router-dom';
import './ForgotPasswordPage.css'; // Ensure you have the CSS file for styling

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess('Password reset email sent!');
      setError('');
    } catch (error) {
      setError(error.message);
      setSuccess('');
    }
  };

  return (
    <div className="custom-forgot-password-container">
      <h1>Forgot Password</h1>
      <form onSubmit={handlePasswordReset}>
        <div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            className="custom-forgot-password-input"
          />
        </div>
        <button type="submit" className="custom-forgot-password-submit-button">
          Send Reset Email
        </button>
        {error && <p className="custom-forgot-password-error">{error}</p>}
        {success && <p className="custom-forgot-password-success">{success}</p>}
      </form>
      <button 
        onClick={() => navigate('/')} 
        className="custom-forgot-password-back-button">
        Back to Sign In
      </button>
    </div>
  );


};

export default ForgotPasswordPage;
