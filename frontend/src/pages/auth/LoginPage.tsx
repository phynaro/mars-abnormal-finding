import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [isResending, setIsResending] = useState(false);

  // LoginPage now only handles the login form - PublicRoute handles redirects

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.username || !formData.password) {
      setError(t('validation.required'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await login(formData.username, formData.password);
      // Redirect will be handled by the auth context
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('error.serverError');
      setError(errorMessage);

      // Check if it's an email verification error
      if (errorMessage.includes('verify your email') || errorMessage.includes('email verification')) {
        setShowResendVerification(true);
        setResendEmail(formData.username); // Assuming username might be email
      }

      // Log the error for debugging purposes (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.error('Login error:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!resendEmail) {
      setError('Please enter your email address');
      return;
    }

    setIsResending(true);
    setError('');

    try {
      const response = await fetch('http://localhost:3001/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: resendEmail }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setError('');
        setShowResendVerification(false);
        // Show success message
        setError('Verification email sent successfully! Please check your inbox.');
        setTimeout(() => setError(''), 5000);
      } else {
        setError(data.message || 'Failed to resend verification email');
      }
    } catch (error) {
      if (error instanceof Error && (
        error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError') ||
        error.message.includes('ERR_NETWORK')
      )) {
        setError('Unable to send verification email. Please check your internet connection and try again.');
      } else {
        setError('Unable to send verification email. Please try again later.');
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-28 w-56 rounded-lg items-left">


            <img
              src="/Mars_Petcare_Logo.png"
              alt="MARS Logo"
              className="object-contain"
            />
          </div>
          <CardTitle className="text-3xl font-extrabold">
            {t('auth.login')}
          </CardTitle>
          <CardDescription>
            Sign in using your Mars Cedar account
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Username Field */}
              <div className="space-y-2">
                <Label htmlFor="username">{t('auth.username')}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={formData.username}
                    onChange={handleInputChange}
                    className="pl-10"
                    placeholder={t('auth.username')}
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="pl-10 pr-10"
                    placeholder={t('auth.password')}
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className={`rounded-md p-4 ${error.includes('successfully') ? 'bg-green-50 dark:bg-green-900/20' : 'bg-destructive/10'}`}>
                <div className="flex">
                  <div className="ml-3">
                    <h3 className={`text-sm font-medium ${error.includes('successfully') ? 'text-green-800 dark:text-green-200' : 'text-destructive'}`}>
                      {error}
                    </h3>
                  </div>
                </div>
              </div>
            )}

            {/* Resend Verification Section */}
            {showResendVerification && (
              <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Email verification required
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Please verify your email address before logging in. Enter your email below to resend the verification email.
                    </p>
                    <div className="flex space-x-2">
                      <Input
                        type="email"
                        value={resendEmail}
                        onChange={(e) => setResendEmail(e.target.value)}
                        placeholder="Enter your email address"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        onClick={handleResendVerification}
                        disabled={isResending}
                        size="sm"
                      >
                        {isResending ? 'Sending...' : 'Resend'}
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={() => setShowResendVerification(false)}
                      className="text-blue-600 dark:text-blue-400 p-0 h-auto"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {t('common.loading')}
                </div>
              ) : (
                t('auth.login')
              )}
            </Button>

            {/* Additional Links */}
            <div className="flex items-center justify-between text-sm">
              <Button type="button" variant="link" className="p-0 h-auto text-sm" onClick={() => navigate('/verify-email')}>
                {t('auth.forgotPassword')}
              </Button>
              {/* <div>
                <span className="text-muted-foreground">
                  Don't have an account?{' '}
                </span>
                <Button type="button" variant="link" className="p-0 h-auto text-sm" onClick={() => navigate('/register')}>
                  {t('auth.register')}
                </Button>
              </div> */}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
