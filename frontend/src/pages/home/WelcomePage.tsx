import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, ArrowRight, User, Settings, BarChart3, Smartphone, AlertCircle } from 'lucide-react';
import { getApiBaseUrl } from '@/utils/url';

const WelcomePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [lineId, setLineId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleGetStarted = () => {
    navigate('/home');
  };

  const handleLineIdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lineId.trim()) {
      setError('Please enter your Line ID');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`${getApiBaseUrl()}/users/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ lineId: lineId.trim() })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update Line ID');
      }

      // Refresh user data to get updated Line ID
      await refreshUser();
      
      // Navigate to home page
      navigate('/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update Line ID');
    } finally {
      setIsSubmitting(false);
    }
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

          {/* Line ID Registration Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="flex items-center mb-4">
              <Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Complete Your Setup</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              To receive notifications and complete your account setup, please enter your Line ID below.
            </p>
            
            <form onSubmit={handleLineIdSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="lineId" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Line ID
                </Label>
                <Input
                  id="lineId"
                  type="text"
                  placeholder="Enter your Line ID (e.g., U1234567890abcdef)"
                  value={lineId}
                  onChange={(e) => setLineId(e.target.value)}
                  className="w-full"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  You can find your Line ID from the Line Official Account Menu.
                </p>
              </div>
              
              {error && (
                <div className="flex items-center p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mr-2" />
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}
              
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={isSubmitting || !lineId.trim()}
                  className="flex-1"
                >
                  {isSubmitting ? 'Saving...' : 'Save Line ID & Continue'}
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
            </form>
          </div>


        </CardContent>
      </Card>
    </div>
  );
};

export default WelcomePage;
