import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend,
  LabelList
} from 'recharts';
import { Download, Users, TrendingUp, Calendar, MapPin } from 'lucide-react';
import dashboardService, { type UserActivityResponse } from '@/services/dashboardService';

// Custom tooltip component for user chart with avatar
const UserTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={data.avatar} alt={data.user} />
            <AvatarFallback style={{ backgroundColor: data.bgColor, color: 'white' }} className="font-medium text-lg">
              {data.initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-lg">{data.user}</p>
            <p className="text-sm text-gray-600">User ID: {data.id}</p>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-lg font-bold text-blue-600">
            <span className="font-medium">{data.tickets}</span> tickets reported
          </p>
          <p className="text-sm text-gray-500">
            Activity level: {data.tickets > 20 ? 'High' : data.tickets > 10 ? 'Medium' : 'Low'}
          </p>
        </div>
      </div>
    );
  }
  return null;
};

// Individual avatar component that manages its own image loading state
const SVGAvatar: React.FC<{
  x: number;
  y: number;
  size: number;
  user: any;
  clipPrefix?: string;
}> = ({ x, y, size, user, clipPrefix = '' }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // Add timeout to handle slow-loading images
  useEffect(() => {
    if (user.avatar && !imageLoaded && !imageError) {
      const timeout = setTimeout(() => {
        setImageError(true);
      }, 3000); // 3 second timeout
      
      return () => clearTimeout(timeout);
    }
  }, [user.avatar, imageLoaded, imageError]);
  
  const clipId = `clip-avatar-${clipPrefix}${user.id}`;
  const cx = x + size / 2;
  const cy = y + size / 2;

  return (
    <g>
      {/* Define circular clip path */}
      <defs>
        <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
          <circle cx={cx} cy={cy} r={size / 2} />
        </clipPath>
      </defs>
      
      {/* Always show fallback first */}
      <circle
        cx={cx} cy={cy} r={size / 2}
        fill={user.bgColor}
        stroke="rgba(255,255,255,0.8)"
        strokeWidth="2"
      />
      
      {/* Initials text (show when image not loaded or on error) */}
      {(!imageLoaded || imageError) && (
        <text
          x={cx} y={cy}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize={Math.max(10, size / 3)}
          fontWeight="700"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {user.initials}
        </text>
      )}
      
      {/* Image overlay (only show when loaded) */}
      {!imageError && (
        <image
          href={user.avatar}
          x={x} y={y}
          width={size} height={size}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
          style={{ display: imageLoaded ? 'block' : 'none' }}
          onLoad={() => {
            setImageLoaded(true);
            setImageError(false);
          }}
          onError={() => {
            setImageError(true);
            setImageLoaded(false);
          }}
        />
      )}
      
      {/* Show initials text when image fails to load */}
      {imageError && (
        <text
          x={cx} y={cy}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize={Math.max(10, size / 3)}
          fontWeight="700"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {user.initials}
        </text>
      )}
      
      {/* Subtle border ring */}
      <circle
        cx={cx} cy={cy} r={size / 2}
        fill="none"
        stroke="rgba(0,0,0,0.15)"
        strokeWidth="1"
      />
    </g>
  );
};

// SVG-based avatar label component for horizontal bars
const AvatarLabel = ({ data, maxAvatar = 40, clipPrefix = '' }: { data: any[], maxAvatar?: number, clipPrefix?: string }) => {
  return (props: any) => {
    const { x, y, width, height, index } = props;
    const row = data[index];
    
    if (!row) return null;

    // Position avatar at bar end with small gap
    const endX = x + width + 8;
    
    // Size avatar based on bar height, but clamp to maxAvatar
    const size = Math.min(maxAvatar, Math.max(24, Math.floor(height * 0.8)));
    const avatarX = endX;
    const avatarY = y + height / 2 - size / 2;

    return (
      <SVGAvatar 
        x={avatarX} 
        y={avatarY} 
        size={size} 
        user={row} 
        clipPrefix={clipPrefix}
      />
    );
  };
};

const UserActivityChartPage: React.FC = () => {
  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const startDate = urlParams.get('startDate') || '';
  const endDate = urlParams.get('endDate') || '';
  const areaId = urlParams.get('area_id') || '';

  // State
  const [userActivityData, setUserActivityData] = useState<UserActivityResponse['data']['userActivityData']>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Helper function to construct avatar URL
  const getAvatarUrl = useCallback((avatarUrl?: string) => {
    if (!avatarUrl) return undefined;
    
    // If it's already an absolute URL, return as is
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
      return avatarUrl;
    }
    
    // If it's a relative URL, construct the full URL
    const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');
    const uploadsBase = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;
    return `${uploadsBase}${avatarUrl}`;
  }, []);

  // Fetch user activity data
  const fetchUserActivityData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        startDate,
        endDate,
        area_id: areaId !== 'all' && areaId ? parseInt(areaId) : undefined
      };
      
      const response = await dashboardService.getUserActivityData(params);
      setUserActivityData(response.data.userActivityData);
      
    } catch (err: any) {
      setError(err.message || 'Failed to fetch user activity data');
      console.error('Error fetching user activity data:', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, areaId]);

  // Fetch data on component mount
  useEffect(() => {
    fetchUserActivityData();
  }, [fetchUserActivityData]);

  // Transform data for chart
  const userActivityChartData = useMemo(() => {
    if (userActivityData.length > 0) {
      return userActivityData.map(item => ({
        ...item,
        avatar: getAvatarUrl(item.avatar)
      }));
    }
    return [];
  }, [userActivityData, getAvatarUrl]);

  // Export data to CSV
  const exportToCSV = () => {
    if (userActivityChartData.length === 0) return;

    const headers = ['User ID', 'User Name', 'Tickets Count', 'Initials', 'Background Color', 'Avatar URL'];
    const csvContent = [
      headers.join(','),
      ...userActivityChartData.map(item => [
        item.id,
        `"${item.user}"`,
        item.tickets,
        item.initials,
        item.bgColor,
        item.avatar || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `user-activity-${startDate}-to-${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    if (userActivityChartData.length === 0) {
      return { totalUsers: 0, totalTickets: 0, avgTicketsPerUser: 0, topUser: null };
    }

    const totalTickets = userActivityChartData.reduce((sum, item) => sum + item.tickets, 0);
    const avgTicketsPerUser = totalTickets / userActivityChartData.length;
    const topUser = userActivityChartData.reduce((max, item) => 
      item.tickets > max.tickets ? item : max, userActivityChartData[0]
    );

    return {
      totalUsers: userActivityChartData.length,
      totalTickets,
      avgTicketsPerUser: Math.round(avgTicketsPerUser * 10) / 10,
      topUser
    };
  }, [userActivityChartData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-semibold text-gray-700">Loading User Activity Data...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-semibold text-red-700 mb-2">Error Loading Data</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex overflow-hidden">
      {/* Left Pane - Summary Stats */}
      <div className="w-80 bg-white/20 backdrop-blur-sm border-r border-white/30 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/30">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">User Activity Leaderboard</h1>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{startDate} to {endDate}</span>
            </div>
            {areaId && areaId !== 'all' && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>Area ID: {areaId}</span>
              </div>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="flex-1 p-4 space-y-4">
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-gray-800">{summaryStats.totalUsers}</div>
              <div className="text-sm text-gray-600">Total Users</div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-gray-800">{summaryStats.totalTickets}</div>
              <div className="text-sm text-gray-600">Total Tickets</div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <div className="h-8 w-8 bg-purple-600 rounded-full mx-auto mb-2 flex items-center justify-center">
                <span className="text-white font-bold text-sm">AVG</span>
              </div>
              <div className="text-3xl font-bold text-gray-800">{summaryStats.avgTicketsPerUser}</div>
              <div className="text-sm text-gray-600">Avg per User</div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <div className="h-8 w-8 bg-yellow-500 rounded-full mx-auto mb-2 flex items-center justify-center">
                <span className="text-white font-bold text-sm">🏆</span>
              </div>
              <div className="text-xl font-bold text-gray-800 truncate" title={summaryStats.topUser?.user || 'N/A'}>
                {summaryStats.topUser?.user || 'N/A'}
              </div>
              <div className="text-sm text-gray-600">Top Performer</div>
            </CardContent>
          </Card>
        </div>

        {/* Export Button */}
        <div className="p-4 border-t border-white/30">
          <Button 
            onClick={exportToCSV} 
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-sm font-semibold"
            disabled={userActivityChartData.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Right Pane - Main Chart */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 p-4">
          <Card className="bg-white/90 backdrop-blur-sm shadow-xl h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-bold text-gray-800 text-center">
                User Activity Ranking - All Users
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 h-full">
              {userActivityChartData.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-1">No Data Available</h3>
                    <p className="text-gray-500 text-sm">No user activity data found for the selected criteria.</p>
                  </div>
                </div>
              ) : (
                <div className="h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={userActivityChartData} 
                      layout="vertical" 
                      margin={{ top: 10, right: 80, left: 15, bottom: 50 }}
                      barCategoryGap={6}
                    >
                      <CartesianGrid horizontal vertical={false} strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        type="number" 
                        domain={[0, 'dataMax + 5']}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                      />
                      <YAxis 
                        dataKey="user" 
                        type="category" 
                        width={120}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12, fill: '#374151' }}
                      />
                      <RechartsTooltip 
                        content={<UserTooltip />}
                        cursor={{ fillOpacity: 0.1 }}
                      />
                      <Bar 
                        dataKey="tickets" 
                        fill="#3b82f6"
                        radius={[0, 6, 6, 0]}
                        isAnimationActive
                        animationBegin={0}
                        animationDuration={1000}
                      >
                        {/* Value label at end (before avatar) */}
                        <LabelList
                          dataKey="tickets"
                          position="right"
                          offset={50}
                          style={{ fill: "#374151", fontWeight: 700, fontSize: 12 }}
                        />
                        {/* Avatar at bar end */}
                        <LabelList content={AvatarLabel({ data: userActivityChartData, maxAvatar: 32, clipPrefix: 'user-activity-detailed-' })} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UserActivityChartPage;
