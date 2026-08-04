import { createContext } from 'react';
import type { User, LiffTokenVerificationResponse, LineProfileResponse, LineLoginData, RegisterData } from '../services/authService';
import liff from '@line/liff';

export interface AuthContextType {
  user: User | null;
  liffObject: typeof liff | null;
  liffError: string | null;
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
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  verifyLiffToken: (accessToken: string) => Promise<LiffTokenVerificationResponse>;
  getLineProfile: (accessToken: string) => Promise<LineProfileResponse>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
