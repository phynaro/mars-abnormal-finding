import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Mail, Phone, Clock, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { accessRequestService, type AccessRequestData } from '../../services/accessRequestService';

const RequestAccessPage: React.FC = () => {
  const { liffObject, liffTokenVerified } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    telephone: ''
  });
  
  const [lineId, setLineId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [liffError, setLiffError] = useState('');

  // Initialize LIFF and get LINE profile
  useEffect(() => {
    const initializeLiff = async () => {
      try {
        setIsLoading(true);
        setError('');

        // Check if LIFF is available
        if (!liffObject) {
          setLiffError('LINE integration is not available. Please open this page through the LINE app.');
          setIsLoading(false);
          return;
        }

        // Check if user is logged in to LINE
        if (!liffObject.isLoggedIn()) {
          setLiffError('Please log in to LINE first.');
          setIsLoading(false);
          return;
        }

        // Get LINE profile
        const profile = await liffObject.getProfile();
        if (profile && profile.userId) {
          setLineId(profile.userId);
          
          // Pre-fill form with LINE profile data if available
          setFormData(prev => ({
            ...prev,
            firstName: profile.displayName?.split(' ')[0] || '',
            lastName: profile.displayName?.split(' ').slice(1).join(' ') || ''
          }));

          // Check for existing pending request
          await checkExistingRequest(profile.userId);
        } else {
          setLiffError('Failed to get LINE profile information.');
        }
      } catch (err) {
        console.error('LIFF initialization error:', err);
        setLiffError('Failed to initialize LINE integration. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    initializeLiff();
  }, [liffObject]);

  const checkExistingRequest = async (lineId: string) => {
    try {
      const result = await accessRequestService.checkStatus(lineId);
      if (result.hasPendingRequest) {
        setPendingRequest(result.request);
      }
    } catch (err) {
      console.error('Error checking existing request:', err);
      // Don't show error for status check failure, just continue with form
    }
  };

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

    if (!formData.firstName || !formData.lastName || !formData.email) {
      setError('First name, last name, and email are required.');
      return;
    }

    if (!lineId) {
      setError('LINE ID is required. Please ensure you are logged in to LINE.');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const requestData: AccessRequestData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        telephone: formData.telephone.trim(),
        lineId: lineId
      };

      await accessRequestService.submitRequest(requestData);
      setSuccess(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit access request';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3">Loading...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (liffError) {
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
            <CardTitle className="text-2xl font-bold">Request Access</CardTitle>
            <CardDescription>
              Access request through LINE
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md mb-4">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-3" />
              <p className="text-sm text-red-800 dark:text-red-200">{liffError}</p>
            </div>
            <Button
              onClick={handleBackToLogin}
              className="w-full"
              variant="outline"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
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
            <CardTitle className="text-2xl font-bold">Request Submitted</CardTitle>
            <CardDescription>
              Your access request has been submitted successfully
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md mb-4">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  Access Request Submitted
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Your request has been submitted and is pending approval. You will be notified once it's reviewed.
                </p>
              </div>
            </div>
            <Button
              onClick={handleBackToLogin}
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (pendingRequest) {
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
            <CardTitle className="text-2xl font-bold">Request Status</CardTitle>
            <CardDescription>
              Your access request status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md mb-4">
              <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Pending Approval
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Your request is currently under review.
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center">
                <User className="h-4 w-4 text-muted-foreground mr-2" />
                <span className="text-sm font-medium">Name:</span>
                <span className="text-sm ml-2">{pendingRequest.firstName} {pendingRequest.lastName}</span>
              </div>
              <div className="flex items-center">
                <Mail className="h-4 w-4 text-muted-foreground mr-2" />
                <span className="text-sm font-medium">Email:</span>
                <span className="text-sm ml-2">{pendingRequest.email}</span>
              </div>
              {pendingRequest.telephone && (
                <div className="flex items-center">
                  <Phone className="h-4 w-4 text-muted-foreground mr-2" />
                  <span className="text-sm font-medium">Phone:</span>
                  <span className="text-sm ml-2">{pendingRequest.telephone}</span>
                </div>
              )}
              <div className="flex items-center">
                <Clock className="h-4 w-4 text-muted-foreground mr-2" />
                <span className="text-sm font-medium">Submitted:</span>
                <span className="text-sm ml-2">
                  {new Date(pendingRequest.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            <Button
              onClick={handleBackToLogin}
              className="w-full"
              variant="outline"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <CardTitle className="text-2xl font-bold">Request Access</CardTitle>
          <CardDescription>
            Submit your access request through LINE
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* First Name Field */}
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="pl-10"
                    placeholder="Enter your first name"
                  />
                </div>
              </div>

              {/* Last Name Field */}
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="pl-10"
                    placeholder="Enter your last name"
                  />
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="pl-10"
                    placeholder="Enter your email address"
                  />
                </div>
              </div>

              {/* Telephone Field */}
              <div className="space-y-2">
                <Label htmlFor="telephone">Telephone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="telephone"
                    name="telephone"
                    type="tel"
                    value={formData.telephone}
                    onChange={handleInputChange}
                    className="pl-10"
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mr-2" />
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </div>
              ) : (
                'Submit Request'
              )}
            </Button>

            {/* Back Button */}
            <Button
              type="button"
              variant="outline"
              onClick={handleBackToLogin}
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default RequestAccessPage;
