import React, { useState } from 'react';
import { updateProfile, deleteUser , sendPasswordResetEmail, signOut } from 'firebase/auth';
import { auth } from '../firebase/firebase-config'; // Adjust the import path as needed
import { useNavigate } from 'react-router-dom';
import emailjs from 'emailjs-com'; // Import EmailJS
import './Settings.css'; // Import the CSS file

const Settings = () => {
  const [newName, setNewName] = useState('');
  const [emailForPasswordReset, setEmailForPasswordReset] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [password, setPassword] = useState(''); // State for password input
  const [confirmationVisible, setConfirmationVisible] = useState(false); // State to control visibility of confirmation
  const navigate = useNavigate(); // Hook to navigate programmatically

  const handleChangeName = async () => {
    try {
      await updateProfile(auth.currentUser , { displayName: newName });
      setSuccess('Name updated successfully');
      setError('');
    } catch (error) {
      setError('Error updating name');
      setSuccess('');
    }
  };

  const handleResetPassword = async () => {
    try {
      await sendPasswordResetEmail(auth, emailForPasswordReset);
      setSuccess('Password reset email sent');
      setError('');
    } catch (error) {
      setError('Error sending password reset email');
      setSuccess('');
    }
  };

  const handleDeleteAccount = async () => {
    // Replace this with your actual password validation logic
    const isValidPassword = password === "your-actual-password"; // This is for demonstration

    if (isValidPassword) {
      if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        try {
          // Send notification email
          await emailjs.send("service_qyi761q", "template_y26mfw8", {
            user_email: auth.currentUser.email, // Send the user's email
            message: "Your account has been deleted successfully."
          }, "dXV00-Wj5L1tjyQCC");

          // Delete the user account
          await deleteUser (auth.currentUser );

          // Sign out the user
          await signOut(auth);

          // Redirect to the sign-in page
          navigate('/sign-in');
        } catch (error) {
          setError('Error deleting account');
          setSuccess('');
        }
      }
    } else {
      alert('Invalid password. Please try again.');
    }
  };

  const handleShowConfirmation = () => {
    setConfirmationVisible(true);
  };

  const handleCancel = () => {
    setConfirmationVisible(false);
    setPassword('');
  };

  return (
    <div className="settings">
      <h2>Account Setting</h2>
      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}
      
      <div className="setting-section">
        <h3>Change Name</h3>
        <input
          type="text"
          placeholder="New Name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button onClick={handleChangeName}>Change Name</button>
      </div>

      <div className="setting-section">
        <h3>Reset Password</h3>
        <input
          type="email"
          placeholder="Enter email for password reset"
          value={emailForPasswordReset}
          onChange={(e) => setEmailForPasswordReset(e.target.value)}
        />
        <button onClick={handleResetPassword}>Send Reset Email</button>
      </div>

      <div className="setting-section">
        <h3>Delete Account</h3>
        <button onClick={handleShowConfirmation}>Delete Account</button>
        {confirmationVisible && (
          <div className="confirmation-dialog">
            <p>Please enter your password to confirm deletion:</p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
            <button onClick={handleDeleteAccount}>Confirm</button>
            <button onClick={handleCancel}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;