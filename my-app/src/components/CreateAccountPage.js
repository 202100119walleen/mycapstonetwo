// src/components/CreateAccountPage.js
import React, { useState } from 'react';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth } from '../firebase/firebase-config';
import { useNavigate } from 'react-router-dom';
import './CreateAccountPage.css'; // Ensure you have the CSS file for styling

const CreateAccountPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSignUp = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Send a verification email
      await sendEmailVerification(user);

      setSuccess('Account created successfully! Please check your email to verify your account.');
      setError('');
      setTimeout(() => {
        navigate('/'); // Redirect to Sign In page after successful sign-up
      }, 2000); // Delay for user feedback
    } catch (error) {
      setError(error.message);
      setSuccess('');
    }
  };

  return (
    <div className="create-account-container">
      <h1>Create Account</h1>
      <form onSubmit={handleSignUp}>
        <div>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Sign Up</button>
        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
      </form>
      <div className="links">
        <button onClick={() => navigate('/')} className="back-button">Already signed in? Sign In</button>
      </div>
    </div>
  );
};

export default CreateAccountPage;
