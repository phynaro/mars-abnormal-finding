import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import authService, { type User, type LiffTokenVerificationResponse, type LineProfileResponse, type LineLoginData } from '../services/authService';
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
  lineLogin: (lineProfile: LineLoginData) => Promise<void>;
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
    const initializeApp = async () => {
      setLiffLoading(true);

      // Step 1: JWT first — if we have a stored token, treat as logged in immediately (desktop-friendly)
      const currentUser = authService.getCurrentUser();
      if (currentUser && authService.isAuthenticated()) {
        setUser(currentUser);
        setIsLoading(false);
        // Refresh token/user in background; if token expired, we'll clear and show login
        authService.refreshUserData().then(() => {
          setUser(authService.getCurrentUser());
        }).catch(() => {
          setUser(null);
        });
        // Init LIFF in background so liffObject/LINE state are available for LINE features (non-blocking)
        liff.init({ liffId: import.meta.env.VITE_LIFF_ID })
          .then(() => {
            setLiffObject(liff);
            setLiffError(null);
            setLiffTokenVerified(false);
            setLiffTokenVerificationResult({ success: false, message: 'Using JWT session' });
          })
          .catch((err: unknown) => {
            setLiffError(err instanceof Error ? err.toString() : String(err));
          })
          .finally(() => setLiffLoading(false));
        return;
      }

      // Step 2: No JWT — init LIFF to decide: LINE client (redirect to LINE login) or external (show login page)
      try {
        await liff.init({ liffId: import.meta.env.VITE_LIFF_ID });
        setLiffObject(liff);
        setLiffError(null);
      } catch (error) {
        console.error('LIFF initialization failed:', error);
        if (!import.meta.env.VITE_LIFF_ID) {
          console.info(
            "LIFF Starter: Please make sure that you provided `VITE_LIFF_ID` as an environmental variable."
          );
        }
        setLiffError(error instanceof Error ? error.toString() : String(error));
        setLiffLoading(false);
        setIsLoading(false);
        return;
      }

      if (!liff.isLoggedIn()) {
        if (liff.isInClient()) {
          liff.login();
          return;
        }
        setLiffTokenVerified(false);
        setLiffTokenVerificationResult({
          success: false,
          message: 'Not in LINE client - using normal login'
        });
        setLiffLoading(false);
        setIsLoading(false);
        return;
      }

      // Logged in to LINE: verify LIFF token and try LINE login
      try {
        const profile = await liff.getProfile();
        void profile; // unused, just ensure profile is available
      } catch (profileError) {
        console.warn("Could not get LIFF profile:", profileError);
      }

      const accessToken = liff.getAccessToken();
      if (accessToken) {
        try {
          const verificationResult = await authService.verifyLiffToken(accessToken);
          setLiffTokenVerificationResult(verificationResult);
          setLiffTokenVerified(verificationResult.success);

          if (verificationResult.success) {
            try {
              const profileResult = await authService.getLineProfile(accessToken);
              setLineProfile(profileResult);

              if (profileResult.success && profileResult.profile) {
                try {
                  const lineLoginData: LineLoginData = {
                    userId: profileResult.profile.userId,
                    displayName: profileResult.profile.displayName,
                    pictureUrl: profileResult.profile.pictureUrl
                  };
                  await authService.lineLogin(lineLoginData);
                  setUser(authService.getCurrentUser());
                } catch {
                  // LINE login failed — user may need to link account or use normal login
                }
              }
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
        setLiffTokenVerified(false);
      }

      // In case LINE login set user, refresh from server
      const userAfterLiff = authService.getCurrentUser();
      if (userAfterLiff && authService.isAuthenticated()) {
        setUser(userAfterLiff);
        try {
          await authService.refreshUserData();
          setUser(authService.getCurrentUser());
        } catch {
          setUser(authService.getCurrentUser());
        }
      }

      setLiffLoading(false);
      setIsLoading(false);
    };

    initializeApp();
  }, []);

  // Sliding session: periodically refresh user data so backend can issue a new JWT when in renewal window
  const REFRESH_INTERVAL_MS = 60 * 60 * 1000; // 60 minutes
  useEffect(() => {
    if (!user) return;
    const intervalId = setInterval(async () => {
      try {
        await authService.refreshUserData();
        setUser(authService.getCurrentUser());
      } catch {
        // Ignore; token may have expired, next request will redirect to login
      }
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [user]);

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

  const lineLogin = async (lineProfile: LineLoginData) => {
    try {
      setIsLoading(true);
      const response = await authService.lineLogin(lineProfile);
      if (response.success && response.user) {
        // Get the user from authService to ensure consistency
        const currentUser = authService.getCurrentUser();
        setUser(currentUser);
      } else {
        throw new Error(response.message || 'LINE login failed');
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
    lineLogin,
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
