import React from 'react';
import { Shield } from 'lucide-react';

interface AccessDeniedProps {
  message?: string;
  title?: string;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({ 
  message = "You don't have permission to access this feature.",
  title = "Access Denied"
}) => {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
};
