import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const VerifyEmailPage: React.FC = () => {
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Get token from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    
    if (!tokenParam) {
      setVerificationStatus('error');
      setMessage('No verification token found in the URL.');
      return;
    }

    verifyEmail(tokenParam);
  }, []);

  const verifyEmail = async (verificationToken: string) => {
    try {
      const response = await fetch('http://localhost:3001/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: verificationToken }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setVerificationStatus('success');
        setMessage(data.message || 'Email verified successfully! You can now log in to your account.');
      } else {
        setVerificationStatus('error');
        setMessage(data.message || 'Email verification failed. The token may be invalid or expired.');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationStatus('error');
      setMessage('Network error. Please check your connection and try again.');
    }
  };

  const handleResendVerification = async () => {
    // This would typically require the user's email, but for now we'll show a message
    setMessage('To resend verification email, please use the "Resend Verification" option on the login page.');
  };

  const getStatusIcon = () => {
    switch (verificationStatus) {
      case 'loading':
        return <Loader2 className="h-16 w-16 text-blue-600 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-16 w-16 text-green-600" />;
      case 'error':
      case 'expired':
        return <XCircle className="h-16 w-16 text-red-600" />;
      default:
        return <Mail className="h-16 w-16 text-gray-600" />;
    }
  };

  const getStatusColor = () => {
    switch (verificationStatus) {
      case 'loading':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
      case 'expired':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">M</span>
            </div>
          </div>
          <CardTitle className="text-3xl font-extrabold">
            Email Verification
          </CardTitle>
          <CardDescription>
            Verifying your email address...
          </CardDescription>
        </CardHeader>

        <CardContent className="text-center">
          <div className="flex justify-center mb-6">
            {getStatusIcon()}
          </div>
          
          <h3 className={`text-lg font-medium mb-4 ${getStatusColor()}`}>
            {verificationStatus === 'loading' && 'Verifying your email...'}
            {verificationStatus === 'success' && 'Email Verified Successfully!'}
            {verificationStatus === 'error' && 'Verification Failed'}
            {verificationStatus === 'expired' && 'Verification Expired'}
          </h3>

          <p className="text-sm text-muted-foreground mb-6">
            {message}
          </p>

          {verificationStatus === 'success' && (
            <div className="space-y-4">
              <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <CardContent className="p-4">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    🎉 Your email has been successfully verified! You can now log in to your account.
                  </p>
                </CardContent>
              </Card>
              <Button
                onClick={() => window.location.href = '/login'}
                className="w-full"
              >
                Go to Login
              </Button>
            </div>
          )}

          {verificationStatus === 'error' && (
            <div className="space-y-4">
              <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                <CardContent className="p-4">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    The verification link is invalid or has expired. This could happen if:
                  </p>
                  <ul className="text-sm text-red-700 dark:text-red-300 mt-2 list-disc list-inside">
                    <li>The link has already been used</li>
                    <li>The link has expired (24 hours)</li>
                    <li>The link is malformed</li>
                  </ul>
                </CardContent>
              </Card>
              
              <div className="space-y-3">
                <Button
                  onClick={handleResendVerification}
                  variant="outline"
                  className="w-full"
                >
                  Resend Verification Email
                </Button>
                
                <Button
                  onClick={() => window.location.href = '/login'}
                  variant="secondary"
                  className="w-full"
                >
                  Back to Login
                </Button>
              </div>
            </div>
          )}

          {verificationStatus === 'loading' && (
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Please wait while we verify your email address...
                </p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <div className="text-center mt-6">
        <p className="text-xs text-muted-foreground">
          Need help? Contact your system administrator.
        </p>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
