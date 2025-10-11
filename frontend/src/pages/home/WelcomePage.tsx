import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ArrowRight, User, Settings, BarChart3 } from 'lucide-react';

const WelcomePage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleGetStarted = () => {
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Welcome to MARS, {user?.firstName || 'User'}!
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Your account has been successfully created. Let's get you started with the system.
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Features Overview */}
          <div className="grid gap-4 md:grid-cols-3">
            {features.map((feature, index) => (
              <div key={index} className="flex flex-col items-center text-center p-4 rounded-lg bg-gray-50">
                <div className="mb-3 text-blue-600">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="border-t pt-6">
            <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <Button 
                variant="outline" 
                onClick={() => navigate('/profile')}
                className="justify-start"
              >
                <User className="mr-2 h-4 w-4" />
                Complete Your Profile
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/dashboard')}
                className="justify-start"
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                View Dashboard
              </Button>
            </div>
          </div>

          {/* Get Started Button */}
          <div className="flex justify-center pt-4">
            <Button 
              onClick={handleGetStarted}
              size="lg"
              className="px-8"
            >
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WelcomePage;
