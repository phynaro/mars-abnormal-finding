import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { ExternalLink, Copy, CheckCircle } from 'lucide-react';

const LiffSetupGuide = () => {
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Line LIFF Setup Required
          </CardTitle>
          <CardDescription>
            To use Line Login, you need to set up a LIFF application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Step 1: Create LIFF App</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Go to Line Developers Console and create a new LIFF application
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open('https://developers.line.biz/console/', '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Line Developers Console
              </Button>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Step 2: Configure LIFF ID</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Copy your LIFF ID and update the .env file:
              </p>
              <div className="bg-muted p-3 rounded-md">
                <code className="text-sm">VITE_LIFF_ID=your_actual_liff_id_here</code>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="ml-2"
                  onClick={() => copyToClipboard('VITE_LIFF_ID=your_actual_liff_id_here')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Step 3: Set Callback URL</h3>
              <p className="text-sm text-muted-foreground mb-2">
                In your LIFF app settings, set the callback URL to:
              </p>
              <div className="bg-muted p-3 rounded-md">
                <code className="text-sm">http://localhost:3001/api/auth/line/callback</code>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="ml-2"
                  onClick={() => copyToClipboard('http://localhost:3001/api/auth/line/callback')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Development Mode:</strong> The app is currently running with mock data. 
                Once you configure LIFF, restart the development server to use real Line Login.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LiffSetupGuide; 