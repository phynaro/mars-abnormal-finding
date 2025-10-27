import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ArrowRight, User, Settings, BarChart3, Smartphone, AlertCircle, Link, X } from 'lucide-react';
import { getApiBaseUrl } from '@/utils/url';
import LineProfileDisplay from '@/components/LineProfileDisplay';

const WelcomePage: React.FC = () => {
  const { user, refreshUser, lineProfile, liffTokenVerified, liffObject, lineLogin } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showLineLinking, setShowLineLinking] = useState(false);
  const [isLineLoginLoading, setIsLineLoginLoading] = useState(false);
  const [externalLineProfile, setExternalLineProfile] = useState<{
    userId: string;
    displayName: string;
    pictureUrl: string;
  } | null>(null);

  // Detect when user returns from LINE login in external browser
  useEffect(() => {
    // If we're in external browser, user is logged in to LINE, and profile is available but not yet confirmed
    if (!liffObject?.isInClient() && liffObject?.isLoggedIn() && lineProfile?.success && lineProfile.profile && !user?.lineId && !externalLineProfile) {
      setExternalLineProfile({
        userId: lineProfile.profile.userId,
        displayName: lineProfile.profile.displayName,
        pictureUrl: lineProfile.profile.pictureUrl
      });
    }
  }, [liffObject, lineProfile, user, externalLineProfile]);

  const handleGetStarted = () => {
    navigate('/home');
  };

  const handleLinkLineAccount = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      let profileToLink = lineProfile?.profile;

      // If profile is not available, try to get it from LIFF
      if (!profileToLink && liffObject && liffObject.isInClient()) {
        const accessToken = liffObject.getAccessToken();
        if (accessToken) {
          try {
            const profileResult = await fetch(`${getApiBaseUrl()}/auth/get-line-profile`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ accessToken }),
            });

            const result = await profileResult.json();
            if (result.success && result.profile) {
              profileToLink = result.profile;
            }
          } catch (profileError) {
            console.error('Failed to get LINE profile:', profileError);
          }
        }
      }

      if (!profileToLink) {
        throw new Error('LINE profile information not available. Please ensure you are logged in to LINE.');
      }

      // Use the new link-line-account endpoint that downloads and saves the avatar
      const response = await fetch(`${getApiBaseUrl()}/auth/link-line-account`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          lineProfile: profileToLink
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to link LINE account');
      }

      const result = await response.json();
      console.log('LINE account linked successfully:', result);

      // Refresh user data to get updated Line ID and avatar
      await refreshUser();
      
      // Navigate to home page
      navigate('/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link LINE account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExternalLineLink = async () => {
    setIsLineLoginLoading(true);
    setError('');

    try {
      // For external browsers, we need to redirect to LINE login
      // This should only be called when NOT in LINE client
      if (!liffObject) {
        throw new Error('LINE integration not available. Please open this page from LINE app.');
      }

      // Check if already in LINE client (this shouldn't happen with current UI logic)
      if (liffObject.isInClient()) {
        throw new Error('You are already in LINE app. Please use the LINE linking option above.');
      }

      if (!liffObject.isLoggedIn()) {
        // Redirect to LINE login
        liffObject.login();
        return;
      }

      // Get LINE profile
      const accessToken = liffObject.getAccessToken();
      if (!accessToken) {
        throw new Error('No LINE access token available');
      }

      // Get LINE profile from backend
      const profileResponse = await fetch(`${getApiBaseUrl()}/auth/get-line-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessToken }),
      });

      const profileResult = await profileResponse.json();
      if (!profileResult.success || !profileResult.profile) {
        throw new Error('Failed to get LINE profile');
      }

      // Store LINE profile for manual confirmation
      setExternalLineProfile({
        userId: profileResult.profile.userId,
        displayName: profileResult.profile.displayName,
        pictureUrl: profileResult.profile.pictureUrl
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get LINE profile');
    } finally {
      setIsLineLoginLoading(false);
    }
  };

  const handleConfirmLineBinding = async () => {
    if (!externalLineProfile) return;

    setIsSubmitting(true);
    setError('');

    try {
      // Use the new link-line-account endpoint that downloads and saves the avatar
      const updateResponse = await fetch(`${getApiBaseUrl()}/auth/link-line-account`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          lineProfile: externalLineProfile
        })
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.message || 'Failed to link LINE account');
      }

      const result = await updateResponse.json();
      console.log('LINE account linked successfully:', result);

      // Refresh user data to get updated Line ID and avatar
      await refreshUser();
      
      // Navigate to home page
      navigate('/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link LINE account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipLineBinding = () => {
    setExternalLineProfile(null);
    navigate('/home');
  };

  const features = [
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: 'Dashboard',
      description: 'View your maintenance KPIs and reports'
    },
    {
      icon: <Settings className="h-6 w-6" />,
      title: 'Ticket Management',
      description: 'Create and manage maintenance tickets'
    },
    {
      icon: <User className="h-6 w-6" />,
      title: 'Profile',
      description: 'Update your profile and preferences'
    }
  ];

  return (
    <div className="min-h-screen bg-background from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Welcome to MARS, {user?.firstName || 'User'}!
          </CardTitle>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Your account has been successfully created. Let's get you started with the system.
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">

          {/* LINE Account Linking Section */}
          {liffObject?.isInClient() && liffTokenVerified && lineProfile?.success && lineProfile.profile && !user?.lineId && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="flex items-center mb-4">
                <Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Link Your LINE Account</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                We found your LINE account. Would you like to link it to your MARS account for notifications and easier access?
              </p>
              
              {/* LINE Profile Display */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {lineProfile.profile.pictureUrl ? (
                      <img
                        src={lineProfile.profile.pictureUrl}
                        alt="LINE Profile"
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
                        <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {lineProfile.profile.displayName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      LINE ID: {lineProfile.profile.userId}
                    </p>
                  </div>
                </div>
              </div>
              
              {error && (
                <div className="flex items-center p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md mb-4">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mr-2" />
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}
              
              <div className="flex gap-3">
                <Button
                  onClick={handleLinkLineAccount}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? 'Linking...' : (
                    <>
                      <Link className="h-4 w-4 mr-2" />
                      Link LINE Account
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGetStarted}
                  disabled={isSubmitting}
                >
                  Skip for Now
                </Button>
              </div>
            </div>
          )}

          {/* Alternative LINE Linking - In app but conditions not met */}
          {liffObject?.isInClient() && !liffTokenVerified && !user?.lineId && !externalLineProfile && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="flex items-center mb-4">
                <Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Link Your LINE Account</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                We couldn't automatically verify your LINE account. Click below to link it manually.
              </p>
              
              {error && (
                <div className="flex items-center p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md mb-4">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mr-2" />
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}
              
              <div className="flex gap-3">
                <Button
                  onClick={handleLinkLineAccount}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? 'Linking...' : (
                    <>
                      <Link className="h-4 w-4 mr-2" />
                      Link LINE Account
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGetStarted}
                  disabled={isSubmitting}
                >
                  Skip for Now
                </Button>
              </div>
            </div>
          )}

          {/* External Browser LINE Profile Display */}
          {!liffObject?.isInClient() && !user?.lineId && externalLineProfile && (
            <LineProfileDisplay
              profile={externalLineProfile}
              onConfirm={handleConfirmLineBinding}
              onSkip={handleSkipLineBinding}
              isLoading={isSubmitting}
              error={error}
            />
          )}

          {/* External Browser LINE Login Button */}
          {!liffObject?.isInClient() && !user?.lineId && !externalLineProfile && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="flex items-center mb-4">
                <Smartphone className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Connect with LINE</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Link your LINE account to receive notifications and enjoy seamless access across devices.
              </p>
              
              {error && (
                <div className="flex items-center p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md mb-4">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mr-2" />
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}
              
              <div className="flex gap-3">
                <Button
                  onClick={handleExternalLineLink}
                  disabled={isLineLoginLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  {isLineLoginLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Smartphone className="h-4 w-4 mr-2" />
                      Connect LINE Account
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGetStarted}
                  disabled={isLineLoginLoading}
                >
                  Skip for Now
                </Button>
              </div>
            </div>
          )}

          {/* Features Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">What you can do:</h3>
            <div className="grid gap-4">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                      <div className="text-blue-600 dark:text-blue-400">
                        {feature.icon}
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {feature.title}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
};

export default WelcomePage;
