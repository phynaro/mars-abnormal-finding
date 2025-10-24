import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import authService, { type User, type LiffTokenVerificationResponse, type LineProfileResponse } from '../services/authService';
import liff from "@line/liff";

interface AuthContextType {
  user: User | null;
  liffObject: any | null;
  liffError: any | null;
  liffLoading: boolean;
  liffTokenVerified: boolean;
  liffTokenVerificationResult: LiffTokenVerificationResponse | null;
  lineProfile: LineProfileResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  redirectUrl: string | null;
  storeRedirectUrl: (url: string) => void;
  clearRedirectUrl: () => void;
  login: (username: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  verifyLiffToken: (accessToken: string) => Promise<LiffTokenVerificationResponse>;
  getLineProfile: (accessToken: string) => Promise<LineProfileResponse>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [liffObject, setLiffObject] = useState<any | null>(null);
  const [liffError, setLiffError] = useState<any | null>(null);
  const [liffLoading, setLiffLoading] = useState(true);
  const [liffTokenVerified, setLiffTokenVerified] = useState(false);
  const [liffTokenVerificationResult, setLiffTokenVerificationResult] = useState<LiffTokenVerificationResponse | null>(null);
  const [lineProfile, setLineProfile] = useState<LineProfileResponse | null>(null);

  useEffect(() => {
    // Initialize LIFF first, then check authentication
    const initializeApp = async () => {
      try {
        // Step 1: Initialize LIFF
        console.log("Starting LIFF initialization...");
        setLiffLoading(true);
        
        await liff.init({ liffId: import.meta.env.VITE_LIFF_ID });
        
        console.log("LIFF initialization completed successfully");
        setLiffObject(liff);
        setLiffError(null);

        // Check if user is logged in to LINE
        if (!liff.isLoggedIn()) {
          console.log("User not logged in to LINE, initiating login...");
          liff.login(); // Note: login() doesn't return a Promise, it redirects
          return; // Exit early as login() will redirect the page
        }
        
        // User is logged in to LINE, log LIFF information
        console.log("LIFF is logged in:", liff.isLoggedIn());
        console.log("LIFF context:", liff.getContext());
        console.log("LIFF OS:", liff.getOS());
        console.log("LIFF version:", liff.getVersion());
        console.log("LIFF language:", liff.getLanguage());
        
        // Get profile information (this is async)
        try {
          const profile = await liff.getProfile();
          console.log("LIFF profile:", profile);
        } catch (profileError) {
          console.warn("Could not get LIFF profile:", profileError);
        }
        
        console.log("LIFF access token:", liff.getAccessToken());
        console.log("LIFF ID token:", liff.getIDToken());
        
        // Step 2: Verify LIFF access token with backend
        const accessToken = liff.getAccessToken();
        if (accessToken) {
          console.log("Verifying LIFF access token with backend...");
          try {
            const verificationResult = await authService.verifyLiffToken(accessToken);
            console.log("LIFF token verification result:", verificationResult);
            setLiffTokenVerificationResult(verificationResult);
            setLiffTokenVerified(verificationResult.success);

            // Step 2.1: Get LINE profile if token is verified
            if (verificationResult.success) {
              console.log("Getting LINE profile...");
              try {
                const profileResult = await authService.getLineProfile(accessToken);
                console.log("LINE profile result:", profileResult);
                setLineProfile(profileResult);
              } catch (profileError) {
                console.error("Failed to get LINE profile:", profileError);
                setLineProfile({
                  success: false,
                  message: profileError instanceof Error ? profileError.message : 'Failed to get LINE profile'
                });
              }
            }
          } catch (verificationError) {
            console.error("LIFF token verification failed:", verificationError);
            setLiffTokenVerified(false);
            setLiffTokenVerificationResult({
              success: false,
              message: verificationError instanceof Error ? verificationError.message : 'Token verification failed'
            });
          }
        } else {
          console.warn("No LIFF access token available for verification");
          setLiffTokenVerified(false);
        }
        
        // Step 3: Check authentication after LIFF is ready
        console.log("Checking authentication...");
        const currentUser = authService.getCurrentUser();
        if (currentUser && authService.isAuthenticated()) {
          setUser(currentUser);
          // Optionally refresh user data from server
          await authService.refreshUserData();
          setUser(authService.getCurrentUser());
        }
        
      } catch (error) {
        console.error('LIFF initialization failed:', error);
        if (!import.meta.env.VITE_LIFF_ID) {
          console.info(
            "LIFF Starter: Please make sure that you provided `VITE_LIFF_ID` as an environmental variable."
          );
        }
        setLiffError(error.toString());
        
        // Even if LIFF fails, still try to check authentication
        try {
          const currentUser = authService.getCurrentUser();
          if (currentUser && authService.isAuthenticated()) {
            setUser(currentUser);
            await authService.refreshUserData();
            setUser(authService.getCurrentUser());
          }
        } catch (authError) {
          console.error('Auth check failed:', authError);
          await authService.logout();
          setUser(null);
        }
      } finally {
        setLiffLoading(false);
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  const storeRedirectUrl = (url: string) => {
    setRedirectUrl(url);
  };

  const clearRedirectUrl = () => {
    setRedirectUrl(null);
  };

  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await authService.login({ username, password });
      if (response.success && response.user) {
        // Get the user from authService to ensure consistency
        const currentUser = authService.getCurrentUser();
        setUser(currentUser);
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: any) => {
    try {
      setIsLoading(true);
      const response = await authService.register(userData);
      if (!response.success) {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await authService.logout();
      setUser(null);
      clearRedirectUrl(); // Clear redirect URL on logout
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, clear local state
      setUser(null);
      clearRedirectUrl();
    } finally {
      setIsLoading(false);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      setIsLoading(true);
      const response = await authService.changePassword({ currentPassword, newPassword });
      if (!response.success) {
        throw new Error(response.message || 'Password change failed');
      }
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      await authService.refreshUserData();
      const currentUser = authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const verifyLiffToken = async (accessToken: string): Promise<LiffTokenVerificationResponse> => {
    try {
      const result = await authService.verifyLiffToken(accessToken);
      setLiffTokenVerificationResult(result);
      setLiffTokenVerified(result.success);
      return result;
    } catch (error) {
      const errorResult = {
        success: false,
        message: error instanceof Error ? error.message : 'Token verification failed'
      };
      setLiffTokenVerificationResult(errorResult);
      setLiffTokenVerified(false);
      throw error;
    }
  };

  const getLineProfile = async (accessToken: string): Promise<LineProfileResponse> => {
    try {
      const result = await authService.getLineProfile(accessToken);
      setLineProfile(result);
      return result;
    } catch (error) {
      const errorResult = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get LINE profile'
      };
      setLineProfile(errorResult);
      throw error;
    }
  };

  const isAuthenticated = !!user;

  const value: AuthContextType = {
    user,
    liffObject,
    liffError,
    liffLoading,
    liffTokenVerified,
    liffTokenVerificationResult,
    lineProfile,
    isAuthenticated,
    isLoading,
    redirectUrl,
    storeRedirectUrl,
    clearRedirectUrl,
    login,
    register,
    logout,
    changePassword,
    refreshUser,
    verifyLiffToken,
    getLineProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
