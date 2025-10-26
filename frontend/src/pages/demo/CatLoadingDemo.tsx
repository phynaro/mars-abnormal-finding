import React, { useState } from 'react';
import { CatLoading } from '../components/common/CatLoading';
import { Button } from '../components/ui/button';

const CatLoadingDemo: React.FC = () => {
  const [showLoading, setShowLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Initializing LINE LIFF...');

  const handleShowLoading = () => {
    setShowLoading(true);
    // Simulate loading for 3 seconds
    setTimeout(() => {
      setShowLoading(false);
    }, 3000);
  };

  if (showLoading) {
    return (
      <CatLoading 
        message={loadingMessage}
        size="lg"
        showCat={true}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Cat Loading Demo
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Click the button below to see the cute cat loading animation!
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Loading Message:
            </label>
            <input
              type="text"
              value={loadingMessage}
              onChange={(e) => setLoadingMessage(e.target.value)}
              className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              placeholder="Enter loading message..."
            />
          </div>
          
          <Button onClick={handleShowLoading} className="px-6 py-3">
            Show Cat Loading 🐱
          </Button>
        </div>
        
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Features:
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Cute cat GIF animation (different for light/dark mode)</li>
            <li>• Animated bouncing dots</li>
            <li>• Gradient background</li>
            <li>• Responsive design</li>
            <li>• Customizable message and size</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CatLoadingDemo;
