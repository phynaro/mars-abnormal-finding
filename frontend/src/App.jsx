import React, { useState, useEffect } from 'react';
import useLiff from './hooks/useLiff';
import { authAPI } from './lib/api';
import HomePage from './pages/HomePage';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorMessage from './components/ErrorMessage';

function App() {
  const { liffInitialized, liffError, profile, isLoggedIn } = useLiff();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const authenticateUser = async () => {
      if (!liffInitialized) return;

      try {
        setLoading(true);
        setError(null);

        if (isLoggedIn && profile) {
          // Send user profile directly to backend (no token needed)
          const response = await authAPI.authenticateUser(profile);
          
          if (response.data.success) {
            // Store token and user data
            localStorage.setItem('token', response.data.token);
            setUser(response.data.user);
            
            // Show welcome message for new users
            if (response.data.isNewUser) {
              console.log('Welcome new user!', response.data.user.displayName);
            }
          }
        }
      } catch (err) {
        console.error('Authentication error:', err);
        setError('Authentication failed. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    authenticateUser();
  }, [liffInitialized, isLoggedIn, profile]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (liffError || error) {
    return <ErrorMessage error={liffError || error} />;
  }

  if (!user) {
    return <LoadingSpinner message="Redirecting to login..." />;
  }

  return (
    <div className="min-h-screen bg-background">
      <HomePage user={user} />
    </div>
  );
}

export default App; 