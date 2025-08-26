import { useState, useEffect } from 'react';
import liff from '@line/liff';

const useLiff = () => {
  const [liffInitialized, setLiffInitialized] = useState(false);
  const [liffError, setLiffError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const initializeLiff = async () => {
      try {
        const liffId = import.meta.env.VITE_LIFF_ID;
        console.log("liffId", liffId);
        //const liffId = "2007697113-EWn7vw08";
        // Check if LIFF ID is properly configured
        // if (!liffId || liffId === '2007697113-EWn7vw08' || liffId === '2007697113-EWn7vw08') {
        //   throw new Error('LIFF ID not configured. Please set VITE_LIFF_ID in .env file');
        // }

        // Initialize LIFF with your LIFF ID
        await liff.init({ 
            liffId: liffId 
        });
        console.log("liff.isLoggedIn()", liff.isLoggedIn());
        setLiffInitialized(true);

        // Check if user is logged in
        if (liff.isLoggedIn()) {
          setIsLoggedIn(true);
          // Get user profile
          const userProfile = await liff.getProfile();
          console.log("liff.getProfile()", userProfile);
          setProfile(userProfile);
        } else {
          // Redirect to login if not logged in
          liff.login();
        }
      } catch (error) {
        console.error('LIFF initialization failed:', error);
        setLiffError(error);
      }
    };

    initializeLiff();
  }, []);

  const login = () => {
    if (liffInitialized) {
      liff.login();
    }
  };

  const logout = () => {
    if (liffInitialized) {
      liff.logout();
      setIsLoggedIn(false);
      setProfile(null);
    }
  };

  return {
    liffInitialized,
    liffError,
    profile,
    isLoggedIn,
    login,
    logout
  };
};

export default useLiff; 