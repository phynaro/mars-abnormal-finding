import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface KPITileSkeletonProps {
  count?: number;
}

export const KPITileSkeleton: React.FC<KPITileSkeletonProps> = ({ count = 5 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {/* Title skeleton */}
                <Skeleton className="h-4 w-32 mb-2" />
                
                {/* Value skeleton */}
                <Skeleton className="h-8 w-20 mb-3" />
                
                {/* Change indicator skeleton */}
                <div className="flex items-center mt-1">
                  <Skeleton className="h-3 w-3 rounded-full mr-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
                
                {/* Description skeleton */}
                <Skeleton className="h-3 w-24 mt-1" />
              </div>
              
              {/* Icon skeleton */}
              <div className="p-2 rounded-lg bg-muted/50">
                <Skeleton className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
};

export default KPITileSkeleton;
