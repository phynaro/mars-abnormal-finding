import React from 'react';
import { Button } from '@/components/ui/button';

const TestDebugPage: React.FC = () => {
  const testDebugLogging = () => {
    console.log('🧪 Test debug logging function called');
    console.log('📊 Current timestamp:', new Date().toISOString());
    console.log('🔍 Browser info:', {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled
    });
    alert('Check console for debug messages!');
  };

  const testCanvasSupport = () => {
    console.log('🎨 Testing canvas support...');
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        console.log('✅ Canvas 2D context is supported');
        canvas.width = 100;
        canvas.height = 100;
        ctx.fillStyle = 'red';
        ctx.fillRect(0, 0, 100, 100);
        console.log('✅ Canvas drawing test successful');
      } else {
        console.error('❌ Canvas 2D context not supported');
      }
    } catch (error) {
      console.error('❌ Canvas test failed:', error);
    }
  };

  const testFileAPI = () => {
    console.log('📁 Testing File API support...');
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      console.log('✅ File input created successfully');
      
      // Test URL.createObjectURL
      const testBlob = new Blob(['test'], { type: 'text/plain' });
      const url = URL.createObjectURL(testBlob);
      console.log('✅ URL.createObjectURL works:', url);
      URL.revokeObjectURL(url);
      console.log('✅ URL.revokeObjectURL works');
    } catch (error) {
      console.error('❌ File API test failed:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Debug Test Page</h1>
      <p className="text-muted-foreground">
        This page helps test if debug logging and browser APIs are working correctly.
      </p>
      
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Console Logging Test</h2>
          <Button onClick={testDebugLogging}>
            Test Debug Logging
          </Button>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold">Canvas Support Test</h2>
          <Button onClick={testCanvasSupport}>
            Test Canvas Support
          </Button>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold">File API Test</h2>
          <Button onClick={testFileAPI}>
            Test File API
          </Button>
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h3 className="font-semibold">Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1 mt-2">
          <li>Open DevTools (F12) and go to Console tab</li>
          <li>Click each test button above</li>
          <li>Check if you see the debug messages in console</li>
          <li>If you see the messages, the debug system is working</li>
        </ol>
      </div>
    </div>
  );
};

export default TestDebugPage;
