import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface TopPerformersSkeletonProps {
  count?: number;
}

export const TopPerformersSkeleton: React.FC<TopPerformersSkeletonProps> = ({ count = 3 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              <Skeleton className="h-4 w-24" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center space-x-3">
              {/* Avatar skeleton */}
              <Skeleton className="h-10 w-10 rounded-full" />
              
              <div className="flex-1">
                {/* Name skeleton */}
                <Skeleton className="h-4 w-20 mb-1" />
                
                {/* Department skeleton */}
                <Skeleton className="h-3 w-16" />
              </div>
              
              {/* Value skeleton */}
              <div className="text-right">
                <Skeleton className="h-4 w-16 mb-1" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
};

export default TopPerformersSkeleton;
