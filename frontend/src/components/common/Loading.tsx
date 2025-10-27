import React, { useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface LoadingProps {
  message?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showCat?: boolean;
}

// Randomly select an animation set once - this won't change during the component's lifetime
const getRandomAnimationSet = () => {
  const animationSets = [
    {
      light: '/animations/cat-licking-light2.gif',
      dark: '/animations/cat-licking-dark2.gif'
    },
    {
      light: '/animations/dancing-cat-light2.gif',
      dark: '/animations/dancing-cat-dark2.gif'
    },
    {
      light: '/animations/running-dog-light2.gif',
      dark: '/animations/running-dog-dark2.gif'
    }
  ];

  const randomIndex = Math.floor(Math.random() * animationSets.length);
  return animationSets[randomIndex];
};

export const Loading: React.FC<LoadingProps> = ({ 
  message = 'Loading...', 
  size = 'xs',
  showCat = true
}) => {
  const { theme } = useTheme();
  
  // Select animation set once and cache it
  const selectedAnimationSet = useMemo(() => getRandomAnimationSet(), []);
  
  const sizeClasses = {
    xs: 'h-8 w-8',
    sm: 'h-16 w-16',
    md: 'h-24 w-24',
    lg: 'h-32 w-32'
  };

  const selectedAnimation = theme === 'dark' 
    ? selectedAnimationSet.dark 
    : selectedAnimationSet.light;

  return (
    <div className="fixed bottom-4 right-4">
      {showCat && (
        <img 
          src={selectedAnimation} 
          alt="Cute loading animation" 
          className={`${sizeClasses[size]} object-contain`}
        />
      )}
    </div>
  );
};

export default Loading;
