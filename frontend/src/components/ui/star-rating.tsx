import React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  className?: string;
}

export const StarRating: React.FC<StarRatingProps> = ({
  value,
  onChange,
  max = 5,
  size = "md",
  disabled = false,
  className,
}) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const handleClick = (rating: number) => {
    if (!disabled) {
      onChange(rating);
    }
  };

  const handleMouseEnter = (rating: number) => {
    if (!disabled) {
      // Optional: Add hover effect
    }
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: max }, (_, index) => {
        const rating = index + 1;
        const isFilled = rating <= value;
        
        return (
          <button
            key={index}
            type="button"
            className={cn(
              "transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 rounded-sm",
              disabled && "cursor-not-allowed opacity-50"
            )}
            onClick={() => handleClick(rating)}
            onMouseEnter={() => handleMouseEnter(rating)}
            disabled={disabled}
          >
            <Star
              className={cn(
                sizeClasses[size],
                isFilled
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300 hover:text-yellow-300",
                !disabled && "hover:scale-110 transition-transform duration-150"
              )}
            />
          </button>
        );
      })}
      {value > 0 && (
        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
          {value}/{max}
        </span>
      )}
    </div>
  );
};

interface StarRatingDisplayProps {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  className?: string;
}

export const StarRatingDisplay: React.FC<StarRatingDisplayProps> = ({
  value,
  max = 5,
  size = "md",
  showValue = false,
  className,
}) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: max }, (_, index) => {
        const rating = index + 1;
        const isFilled = rating <= value;
        
        return (
          <Star
            key={index}
            className={cn(
              sizeClasses[size],
              isFilled
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            )}
          />
        );
      })}
      {showValue && value > 0 && (
        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
          {value}/{max}
        </span>
      )}
    </div>
  );
};
