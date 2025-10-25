import React from 'react';
import { User, Smartphone } from 'lucide-react';

interface LineProfileDisplayProps {
  profile: {
    userId: string;
    displayName: string;
    pictureUrl: string;
  };
  onConfirm: () => void;
  onSkip: () => void;
  isLoading: boolean;
  error?: string;
}

const LineProfileDisplay: React.FC<LineProfileDisplayProps> = ({
  profile,
  onConfirm,
  onSkip,
  isLoading,
  error
}) => {
  return (
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
            {profile.pictureUrl ? (
              <img
                src={profile.pictureUrl}
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
              {profile.displayName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              LINE ID: {profile.userId}
            </p>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="flex items-center p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md mb-4">
          <div className="h-4 w-4 text-red-600 dark:text-red-400 mr-2">⚠️</div>
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}
      
      <div className="flex gap-3">
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md font-medium transition-colors"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
              Linking...
            </>
          ) : (
            <>
              <Smartphone className="h-4 w-4 mr-2 inline-block" />
              Link LINE Account
            </>
          )}
        </button>
        <button
          onClick={onSkip}
          disabled={isLoading}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Skip for Now
        </button>
      </div>
    </div>
  );
};

export default LineProfileDisplay;
