import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend,
  ComposedChart, AreaChart, Area, Line, LabelList
} from 'recharts';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import { 
  TrendingUp, TrendingDown, Clock, DollarSign, 
  AlertTriangle, CheckCircle, User, Award,
  BarChart3, Filter, X
} from 'lucide-react';
import dashboardService, { type AbnormalFindingKPIResponse, type AreaData, type TicketsCountPerPeriodResponse, type TicketsClosedPerPeriodResponse, type AreaActivityResponse, type UserActivityResponse, type CalendarHeatmapResponse, type DowntimeAvoidanceTrendResponse, type CostAvoidanceResponse, type DowntimeImpactLeaderboardResponse, type CostImpactLeaderboardResponse, type DowntimeImpactReporterLeaderboardResponse, type CostImpactReporterLeaderboardResponse, type DowntimeByFailureModeResponse, type CostByFailureModeResponse, type TicketResolveDurationByAreaResponse, type TicketResolveDurationByUserResponse, type OntimeRateByAreaResponse, type OntimeRateByUserResponse } from '@/services/dashboardService';
import { KPITileSkeleton } from '@/components/ui/kpi-tile-skeleton';
import { TopPerformersSkeleton } from '@/components/ui/top-performers-skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import authService from '@/services/authService';
import { getApiBaseUrl, getAvatarUrl } from '@/utils/url';

// Utility function for dynamic currency formatting
const formatCurrencyDynamic = (amount: number): { display: string; tooltip: string } => {
  const tooltip = `฿${amount.toLocaleString('en-US')} THB`;
  
  if (amount >= 1000000) {
    return {
      display: `฿${(amount / 1000000).toFixed(1)}M`,
      tooltip
    };
  } else if (amount >= 1000) {
    return {
      display: `฿${(amount / 1000).toFixed(0)}K`,
      tooltip
    };
  } else {
    return {
      display: `฿${amount.toFixed(0)}`,
      tooltip
    };
  }
};

// Types
interface KPITile {
  title: string;
  value: string | number;
  change?: number;
  changeDescription?: string;
  changeType?: 'no_change' | 'new_activity' | 'activity_stopped' | 'increase' | 'decrease';
  icon: React.ReactNode;
  color: string;
  tooltip?: string;
}

interface TopPerformer {
  name: string;
  value: string | number;
  avatar?: string;
  department: string;
}

// Custom tooltip component for user chart with avatar
const UserTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={data.avatar} alt={data.user} />
            <AvatarFallback style={{ backgroundColor: data.bgColor, color: 'white' }} className="font-medium">
              {data.initials}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">{data.user}</span>
        </div>
        <p className="text-sm text-gray-600">
          <span className="font-medium">{data.tickets}</span> tickets reported
        </p>
      </div>
    );
  }
  return null;
};

// Custom tooltip for downtime impact chart
const DowntimeTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={data.avatar} alt={data.reporter} />
            <AvatarFallback style={{ backgroundColor: data.bgColor, color: 'white' }} className="font-medium">
              {data.initials}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">{data.reporter}</span>
        </div>
        <p className="text-sm text-gray-600">
          <span className="font-medium">{data.hours}</span> hours saved
        </p>
      </div>
    );
  }
  return null;
};

// Custom tooltip for cost impact chart
const CostTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={data.avatar} alt={data.reporter} />
            <AvatarFallback style={{ backgroundColor: data.bgColor, color: 'white' }} className="font-medium">
              {data.initials}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">{data.reporter}</span>
        </div>
        <p className="text-sm text-gray-600">
          <span className="font-medium">฿{data.cost.toLocaleString()}</span> cost avoided
        </p>
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
        strokeWidth="1"
      />
      
      {/* Initials text (show when image not loaded or on error) */}
      {(!imageLoaded || imageError) && (
        <text
          x={cx} y={cy}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize={Math.max(8, size / 3)}
          fontWeight="600"
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
          fontSize={Math.max(8, size / 3)}
          fontWeight="600"
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
const AvatarLabel = ({ data, maxAvatar = 28, clipPrefix = '' }: { data: any[], maxAvatar?: number, clipPrefix?: string }) => {
  return (props: any) => {
    const { x, y, width, height, index } = props;
    const row = data[index];
    
    if (!row) return null;

    // Position avatar at bar end with small gap
    const endX = x + width + 6;
    
    // Size avatar based on bar height, but clamp to maxAvatar
    const size = Math.min(maxAvatar, Math.max(18, Math.floor(height * 0.8)));
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


const AbnormalReportDashboardV2Page: React.FC = () => {
  const { t } = useLanguage();
  
  // Global Filters
  const [timeFilter, setTimeFilter] = useState<string>('this-period');
  const [plantFilter, setPlantFilter] = useState<string>('all');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);

  // API State
  const [kpiData, setKpiData] = useState<AbnormalFindingKPIResponse['data'] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [plants, setPlants] = useState<Array<{code: string; name: string}>>([]);
  const [plantsLoading, setPlantsLoading] = useState<boolean>(false);
  const [areas, setAreas] = useState<AreaData[]>([]);
  const [areasLoading, setAreasLoading] = useState<boolean>(false);
  const [participationData, setParticipationData] = useState<TicketsCountPerPeriodResponse['data']['participationData']>([]);
  const [participationLoading, setParticipationLoading] = useState<boolean>(false);
  const [areaActivityData, setAreaActivityData] = useState<AreaActivityResponse['data']['areaActivityData']>([]);
  const [areaActivityLoading, setAreaActivityLoading] = useState<boolean>(false);
  const [userActivityData, setUserActivityData] = useState<UserActivityResponse['data']['userActivityData']>([]);
  const [userActivityLoading, setUserActivityLoading] = useState<boolean>(false);
  const [calendarHeatmapData, setCalendarHeatmapData] = useState<CalendarHeatmapResponse['data']['calendarData']>([]);
  const [calendarHeatmapLoading, setCalendarHeatmapLoading] = useState<boolean>(false);
  const [downtimeTrendData, setDowntimeTrendData] = useState<DowntimeAvoidanceTrendResponse['data']['downtimeTrendData']>([]);
  const [downtimeTrendLoading, setDowntimeTrendLoading] = useState<boolean>(false);
  const [downtimeTrendAreas, setDowntimeTrendAreas] = useState<string[]>([]);
  const [costAvoidanceData, setCostAvoidanceData] = useState<CostAvoidanceResponse['data']['costAvoidanceData']>([]);
  const [costAvoidanceLoading, setCostAvoidanceLoading] = useState<boolean>(false);
  const [downtimeImpactData, setDowntimeImpactData] = useState<DowntimeImpactLeaderboardResponse['data']['downtimeImpactData']>([]);
  const [downtimeImpactLoading, setDowntimeImpactLoading] = useState<boolean>(false);
  const [costImpactData, setCostImpactData] = useState<CostImpactLeaderboardResponse['data']['costImpactData']>([]);
  const [costImpactLoading, setCostImpactLoading] = useState<boolean>(false);
  const [downtimeImpactReporterData, setDowntimeImpactReporterData] = useState<DowntimeImpactReporterLeaderboardResponse['data']['downtimeImpactReporterData']>([]);
  const [downtimeImpactReporterLoading, setDowntimeImpactReporterLoading] = useState<boolean>(false);

  const [costImpactReporterData, setCostImpactReporterData] = useState<CostImpactReporterLeaderboardResponse['data']['costImpactReporterData']>([]);
  const [costImpactReporterLoading, setCostImpactReporterLoading] = useState<boolean>(false);

  const [downtimeByFailureModeData, setDowntimeByFailureModeData] = useState<DowntimeByFailureModeResponse['data']['downtimeByFailureModeData']>([]);
  const [downtimeByFailureModeLoading, setDowntimeByFailureModeLoading] = useState<boolean>(false);

  const [costByFailureModeData, setCostByFailureModeData] = useState<CostByFailureModeResponse['data']['costByFailureModeData']>([]);
  const [costByFailureModeLoading, setCostByFailureModeLoading] = useState<boolean>(false);

  const [resolveDurationByAreaData, setResolveDurationByAreaData] = useState<TicketResolveDurationByAreaResponse['data']['resolveDurationByAreaData']>([]);
  const [resolveDurationByAreaLoading, setResolveDurationByAreaLoading] = useState<boolean>(false);

  const [resolveDurationByUserData, setResolveDurationByUserData] = useState<TicketResolveDurationByUserResponse['data']['resolveDurationByUserData']>([]);
  const [resolveDurationByUserLoading, setResolveDurationByUserLoading] = useState<boolean>(false);

  const [ontimeRateByAreaData, setOntimeRateByAreaData] = useState<OntimeRateByAreaResponse['data']['ontimeRateByAreaData']>([]);
  const [ontimeRateByAreaLoading, setOntimeRateByAreaLoading] = useState<boolean>(false);

  const [ontimeRateByUserData, setOntimeRateByUserData] = useState<OntimeRateByUserResponse['data']['ontimeRateByUserData']>([]);
  const [ontimeRateByUserLoading, setOntimeRateByUserLoading] = useState<boolean>(false);

  // Tickets Closed Per Period Data
  const [ticketsClosedData, setTicketsClosedData] = useState<TicketsClosedPerPeriodResponse['data']['ticketsClosedData']>([]);
  const [ticketsClosedLoading, setTicketsClosedLoading] = useState<boolean>(false);

  // Minimum loading time to prevent UI blinking (in milliseconds)
  const MIN_LOADING_TIME = 800;

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

  // Utility function to format date as YYYY-MM-DD in local timezone
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Utility function to calculate period for a specific date (based on backend logic)
  const calculatePeriodForDate = (date: Date, year: number) => {
    const firstDayOfYear = new Date(year, 0, 1, 0, 0, 0, 0);
    const firstSunday = new Date(firstDayOfYear);
    
    // Adjust to first Sunday
    const dayOfWeek = firstDayOfYear.getDay();
    const daysToAdd = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    firstSunday.setDate(firstDayOfYear.getDate() + daysToAdd);
    
    // Calculate period number (1-based)
    const daysSinceFirstSunday = Math.floor((date.getTime() - firstSunday.getTime()) / (1000 * 60 * 60 * 24));
    const periodNumber = Math.floor(daysSinceFirstSunday / 28) + 1;
    
    return {
      period: periodNumber,
      firstSunday
    };
  };

  // Utility function to get date range based on time filter
  const getDateRange = (timeFilter: string, year?: number, period?: number) => {
    const now = new Date();
    const currentYear = year || now.getFullYear();
    
    switch (timeFilter) {
      case 'this-year':
        // For this-year, we need to find the first Sunday of the week containing New Year's Day
        const newYearDay = new Date(currentYear, 0, 1); // January 1st
        const firstSundayOfYear = new Date(newYearDay);
        const dayOfWeek = newYearDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const daysToSubtract = dayOfWeek === 0 ? 0 : dayOfWeek; // Go back to Sunday
        firstSundayOfYear.setDate(newYearDay.getDate() - daysToSubtract);
        
        // Calculate the end date (13 periods * 28 days = 364 days)
        const yearEndDate = new Date(firstSundayOfYear);
        yearEndDate.setDate(firstSundayOfYear.getDate() + 363); // 364 days - 1 (inclusive)
        
        return {
          startDate: formatLocalDate(firstSundayOfYear),
          endDate: formatLocalDate(yearEndDate),
          compare_startDate: `${currentYear - 1}-01-01`,
          compare_endDate: `${currentYear - 1}-12-31`
        };
      case 'last-year':
        // For last-year, we need to find the first Sunday of the week containing New Year's Day of the previous year
        const lastYearNewYearDay = new Date(currentYear - 1, 0, 1); // January 1st of last year
        const lastYearFirstSunday = new Date(lastYearNewYearDay);
        const lastYearDayOfWeek = lastYearNewYearDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const lastYearDaysToSubtract = lastYearDayOfWeek === 0 ? 0 : lastYearDayOfWeek; // Go back to Sunday
        lastYearFirstSunday.setDate(lastYearNewYearDay.getDate() - lastYearDaysToSubtract);
        
        // Calculate the end date (13 periods * 28 days = 364 days)
        const lastYearEndDate = new Date(lastYearFirstSunday);
        lastYearEndDate.setDate(lastYearFirstSunday.getDate() + 363); // 364 days - 1 (inclusive)
        
        return {
          startDate: formatLocalDate(lastYearFirstSunday),
          endDate: formatLocalDate(lastYearEndDate),
          compare_startDate: `${currentYear - 2}-01-01`,
          compare_endDate: `${currentYear - 2}-12-31`
        };
      case 'this-period':
        // Calculate current 28-day period based on first Sunday of the year
        const currentPeriodInfo = calculatePeriodForDate(now, currentYear);
        const currentPeriod = currentPeriodInfo.period;
        
        // Calculate current period start and end dates
        const currentPeriodStartDate = new Date(currentPeriodInfo.firstSunday);
        currentPeriodStartDate.setDate(currentPeriodInfo.firstSunday.getDate() + (currentPeriod - 1) * 28);
        
        const currentPeriodEndDate = new Date(currentPeriodStartDate);
        currentPeriodEndDate.setDate(currentPeriodStartDate.getDate() + 27); // 28 days - 1
        
        // Calculate previous period for comparison
        const currentPrevPeriodStartDate = new Date(currentPeriodStartDate);
        currentPrevPeriodStartDate.setDate(currentPeriodStartDate.getDate() - 28);
        
        const currentPrevPeriodEndDate = new Date(currentPrevPeriodStartDate);
        currentPrevPeriodEndDate.setDate(currentPrevPeriodStartDate.getDate() + 27);
        
        return {
          startDate: formatLocalDate(currentPeriodStartDate),
          endDate: formatLocalDate(currentPeriodEndDate),
          compare_startDate: formatLocalDate(currentPrevPeriodStartDate),
          compare_endDate: formatLocalDate(currentPrevPeriodEndDate)
        };
      case 'select-period':
        // For select-period, we'll use a simple 28-day period calculation
        const periodStart = new Date(currentYear, 0, 1);
        const firstSunday = new Date(periodStart);
        const selectPeriodDayOfWeek = periodStart.getDay();
        const selectPeriodDaysToAdd = selectPeriodDayOfWeek === 0 ? 0 : 7 - selectPeriodDayOfWeek;
        firstSunday.setDate(periodStart.getDate() + selectPeriodDaysToAdd);
        
        const periodStartDate = new Date(firstSunday);
        periodStartDate.setDate(firstSunday.getDate() + (period! - 1) * 28);
        
        const periodEndDate = new Date(periodStartDate);
        periodEndDate.setDate(periodStartDate.getDate() + 27);
        
        const prevPeriodStartDate = new Date(periodStartDate);
        prevPeriodStartDate.setDate(periodStartDate.getDate() - 28);
        
        const prevPeriodEndDate = new Date(prevPeriodStartDate);
        prevPeriodEndDate.setDate(prevPeriodStartDate.getDate() + 27);
        
        return {
          startDate: periodStartDate.toISOString().split('T')[0],
          endDate: periodEndDate.toISOString().split('T')[0],
          compare_startDate: prevPeriodStartDate.toISOString().split('T')[0],
          compare_endDate: prevPeriodEndDate.toISOString().split('T')[0]
        };
      default:
        return {
          startDate: `${currentYear}-01-01`,
          endDate: `${currentYear}-12-31`,
          compare_startDate: `${currentYear - 1}-01-01`,
          compare_endDate: `${currentYear - 1}-12-31`
        };
    }
  };

  // Helper functions for active filters
  const hasActiveFilters = () => {
    return plantFilter !== 'all' || areaFilter !== 'all';
  };

  const clearFilter = (filterType: 'plant' | 'area') => {
    if (filterType === 'plant') {
      setPlantFilter('all');
      setAreaFilter('all'); // Also reset area when plant is cleared
    } else if (filterType === 'area') {
      setAreaFilter('all');
    }
  };

  const clearAllFilters = () => {
    setPlantFilter('all');
    setAreaFilter('all');
  };

  // Fetch plants data
  const fetchPlants = async () => {
    try {
      setPlantsLoading(true);
      
      const response = await fetch(`${API_BASE_URL}/hierarchy/distinct/plants`, {
        headers: authService.getAuthHeaders()
      });
      const result = await response.json();
      if (result.success) {
        setPlants(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch plants:', error);
      // Set fallback plants if API fails
      setPlants([
        { code: 'PLANT1', name: 'Plant 1' },
        { code: 'PLANT2', name: 'Plant 2' }
      ]);
    } finally {
      setPlantsLoading(false);
    }
  };

  // Fetch areas data
  const fetchAreas = async (plantCode?: string) => {
    try {
      setAreasLoading(true);
      
      // Record start time for minimum loading duration
      const startTime = Date.now();
      
      const url = plantCode 
        ? `${API_BASE_URL}/hierarchy/distinct/areas?plant=${plantCode}`
        : `${API_BASE_URL}/hierarchy/distinct/areas`;
      const response = await fetch(url, {
        headers: authService.getAuthHeaders()
      });
      const result = await response.json();
      if (result.success) {
        setAreas(result.data);
      }
      
      // Calculate elapsed time and ensure minimum loading duration
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsedTime);
      
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
      
    } catch (err: any) {
      console.error('Error fetching areas:', err);
      // Set fallback areas if API fails
      setAreas([
        { id: 1, name: 'Line A', code: 'LINE-A', plant_id: 1, is_active: true },
        { id: 2, name: 'Line B', code: 'LINE-B', plant_id: 1, is_active: true },
        { id: 3, name: 'Warehouse', code: 'WH', plant_id: 1, is_active: true },
        { id: 4, name: 'Utilities', code: 'UTIL', plant_id: 1, is_active: true },
        { id: 5, name: 'Office', code: 'OFF', plant_id: 1, is_active: true }
      ]);
    } finally {
      setAreasLoading(false);
    }
  };


  // Fetch KPI data
  const fetchKPIData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Record start time for minimum loading duration
      const startTime = Date.now();
      
      const dateRange = getDateRange(timeFilter, selectedYear, selectedPeriod);
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        compare_startDate: dateRange.compare_startDate,
        compare_endDate: dateRange.compare_endDate,
        plant: plantFilter !== 'all' ? plantFilter : undefined,
        area: areaFilter !== 'all' ? areaFilter : undefined
      };
      
      const response = await dashboardService.getAbnormalFindingKPIs(params);
      setKpiData(response.data);
      console.log(response.data);
      
      // Calculate elapsed time and ensure minimum loading duration
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsedTime);
      
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
      
    } catch (err: any) {
      setError(err.message || 'Failed to fetch KPI data');
      console.error('Error fetching KPI data:', err);
    } finally {
      setLoading(false);
    }
  }, [timeFilter, plantFilter, areaFilter, selectedYear, selectedPeriod, MIN_LOADING_TIME]);

  // Fetch participation data
  const fetchParticipationData = useCallback(async () => {
    try {
      setParticipationLoading(true);
      
      const params = {
        year: selectedYear,
        plant: plantFilter !== 'all' ? plantFilter : undefined,
        area: areaFilter !== 'all' ? areaFilter : undefined
      };
      
      const response = await dashboardService.getTicketsCountPerPeriod(params);
      
      setParticipationData(response.data.participationData);
      
    } catch (err: any) {
      console.error('Error fetching participation data:', err);
      // Set fallback data if API fails
      setParticipationData([]);
    } finally {
      setParticipationLoading(false);
    }
  }, [selectedYear, plantFilter, areaFilter]);

  // Fetch area activity data
  const fetchAreaActivityData = useCallback(async () => {
    try {
      setAreaActivityLoading(true);
      
      const params = {
        year: selectedYear,
        plant: plantFilter !== 'all' ? plantFilter : undefined,
        area: areaFilter !== 'all' ? areaFilter : undefined
      };
      
      const response = await dashboardService.getAreaActivityData(params);
      setAreaActivityData(response.data.areaActivityData);
      
    } catch (err: any) {
      console.error('Error fetching area activity data:', err);
      // Set fallback data if API fails
      setAreaActivityData([]);
    } finally {
      setAreaActivityLoading(false);
    }
  }, [selectedYear, plantFilter, areaFilter]);

  // Fetch user activity data
  const fetchUserActivityData = useCallback(async () => {
    try {
      setUserActivityLoading(true);
      
      const dateRange = getDateRange(timeFilter, selectedYear, selectedPeriod);
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        plant: plantFilter !== 'all' ? plantFilter : undefined,
        area: areaFilter !== 'all' ? areaFilter : undefined
      };
      
      const response = await dashboardService.getUserActivityData(params);
      setUserActivityData(response.data.userActivityData);
      
    } catch (err: any) {
      console.error('Error fetching user activity data:', err);
      // Set fallback data if API fails
      setUserActivityData([]);
    } finally {
      setUserActivityLoading(false);
    }
  }, [timeFilter, plantFilter, areaFilter, selectedYear, selectedPeriod]);

  // Fetch calendar heatmap data
  const fetchCalendarHeatmapData = useCallback(async () => {
    try {
      setCalendarHeatmapLoading(true);
      
      // Calculate the year based on time filter
      const dateRange = getDateRange(timeFilter, selectedYear, selectedPeriod);
      const yearFromDateRange = parseInt(dateRange.startDate.split('-')[0]);
      
      
      const params = {
        year: yearFromDateRange,
        plant: plantFilter !== 'all' ? plantFilter : undefined,
        area: areaFilter !== 'all' ? areaFilter : undefined
      };

      const response = await dashboardService.getCalendarHeatmapData(params);
      
      if (response.success) {
        setCalendarHeatmapData(response.data.calendarData);
      }
    } catch (error) {
      console.error('Error fetching calendar heatmap data:', error);
      setCalendarHeatmapData([]);
    } finally {
      setCalendarHeatmapLoading(false);
    }
  }, [timeFilter, selectedYear, selectedPeriod, plantFilter, areaFilter]);

  // Fetch downtime avoidance trend data
  const fetchDowntimeTrendData = useCallback(async () => {
    try {
      setDowntimeTrendLoading(true);
      
      // Calculate the year based on time filter
      const dateRange = getDateRange(timeFilter, selectedYear, selectedPeriod);
      const yearFromDateRange = parseInt(dateRange.startDate.split('-')[0]);
      
      const params = {
        year: yearFromDateRange,
        plant: plantFilter !== 'all' ? plantFilter : undefined,
        area: areaFilter !== 'all' ? areaFilter : undefined
      };

      const response = await dashboardService.getDowntimeAvoidanceTrend(params);
      
      if (response.success) {
        setDowntimeTrendData(response.data.downtimeTrendData);
        setDowntimeTrendAreas(response.data.summary.items);
      }
    } catch (error) {
      console.error('Error fetching downtime trend data:', error);
      setDowntimeTrendData([]);
    } finally {
      setDowntimeTrendLoading(false);
    }
  }, [timeFilter, selectedYear, selectedPeriod, plantFilter, areaFilter]);

  // Fetch cost avoidance data
  const fetchCostAvoidanceData = useCallback(async () => {
    try {
      setCostAvoidanceLoading(true);
      
      // Calculate the year based on time filter
      const dateRange = getDateRange(timeFilter, selectedYear, selectedPeriod);
      const yearFromDateRange = parseInt(dateRange.startDate.split('-')[0]);
      
      const params = {
        year: yearFromDateRange,
        plant: plantFilter !== 'all' ? plantFilter : undefined,
        area: areaFilter !== 'all' ? areaFilter : undefined
      };

      const response = await dashboardService.getCostAvoidanceData(params);
      
      if (response.success) {
        setCostAvoidanceData(response.data.costAvoidanceData);
      }
    } catch (error) {
      console.error('Error fetching cost avoidance data:', error);
      setCostAvoidanceData([]);
    } finally {
      setCostAvoidanceLoading(false);
    }
  }, [timeFilter, selectedYear, selectedPeriod, plantFilter, areaFilter]);

  // Fetch downtime impact leaderboard data
  const fetchDowntimeImpactData = useCallback(async () => {
    try {
      setDowntimeImpactLoading(true);
      
      // Calculate the date range based on time filter
      const dateRange = getDateRange(timeFilter, selectedYear, selectedPeriod);
      
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        plant: plantFilter !== 'all' ? plantFilter : undefined,
        area: areaFilter !== 'all' ? areaFilter : undefined
      };

      const response = await dashboardService.getDowntimeImpactLeaderboard(params);
      
      if (response.success) {
        console.log('Downtime Impact Data:', response.data);
        setDowntimeImpactData(response.data.downtimeImpactData);
      }
    } catch (error) {
      console.error('Error fetching downtime impact data:', error);
      setDowntimeImpactData([]);
    } finally {
      setDowntimeImpactLoading(false);
    }
  }, [timeFilter, selectedYear, selectedPeriod, plantFilter, areaFilter]);

  // Fetch cost impact leaderboard data
  const fetchCostImpactData = useCallback(async () => {
    try {
      setCostImpactLoading(true);
      
      // Calculate the date range based on time filter
      const dateRange = getDateRange(timeFilter, selectedYear, selectedPeriod);
      
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        plant: plantFilter !== 'all' ? plantFilter : undefined,
        area: areaFilter !== 'all' ? areaFilter : undefined
      };

      const response = await dashboardService.getCostImpactLeaderboard(params);
      
      if (response.success) {
        setCostImpactData(response.data.costImpactData);
      }
    } catch (error) {
      console.error('Error fetching cost impact data:', error);
      setCostImpactData([]);
    } finally {
      setCostImpactLoading(false);
    }
  }, [timeFilter, selectedYear, selectedPeriod, plantFilter, areaFilter]);

  // Fetch Ontime Rate by Area Data
  const fetchOntimeRateByAreaData = useCallback(async () => {
    try {
      setOntimeRateByAreaLoading(true);
      
      // Calculate the date range based on time filter
      const dateRange = getDateRange(timeFilter, selectedYear, selectedPeriod);
      
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        plant: plantFilter !== 'all' ? plantFilter : undefined,
        area: areaFilter !== 'all' ? areaFilter : undefined
      };

      const response = await dashboardService.getOntimeRateByArea(params);
      
      if (response.success) {
        setOntimeRateByAreaData(response.data.ontimeRateByAreaData);
      }
    } catch (error) {
      console.error('Error fetching ontime rate by area data:', error);
      setOntimeRateByAreaData([]);
    } finally {
      setOntimeRateByAreaLoading(false);
    }
  }, [timeFilter, selectedYear, selectedPeriod, plantFilter, areaFilter]);

  // Fetch Ontime Rate by User Data
  const fetchOntimeRateByUserData = useCallback(async () => {
    try {
      setOntimeRateByUserLoading(true);
      
      // Validate areaFilter is a valid number
      const areaId = parseInt(areaFilter);
      if (isNaN(areaId) || areaFilter === 'all') {
        setOntimeRateByUserData([]);
        return;
      }
      
      // Calculate the date range based on time filter
      const dateRange = getDateRange(timeFilter, selectedYear, selectedPeriod);
      
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        area_id: areaId
      };

      const response = await dashboardService.getOntimeRateByUser(params);
      
      if (response.success) {
        setOntimeRateByUserData(response.data.ontimeRateByUserData);
      }
    } catch (error) {
      console.error('Error fetching ontime rate by user data:', error);
      setOntimeRateByUserData([]);
    } finally {
      setOntimeRateByUserLoading(false);
    }
  }, [timeFilter, selectedYear, selectedPeriod, plantFilter, areaFilter]);

  // Fetch Ticket Resolve Duration by User Data
  const fetchResolveDurationByUserData = useCallback(async () => {
    try {
      setResolveDurationByUserLoading(true);
      
      // Validate areaFilter is a valid number
      const areaId = parseInt(areaFilter);
      if (isNaN(areaId) || areaFilter === 'all') {
        setResolveDurationByUserData([]);
        return;
      }
      
      // Calculate the date range based on time filter
      const dateRange = getDateRange(timeFilter, selectedYear, selectedPeriod);
      
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        area_id: areaId
      };

      const response = await dashboardService.getTicketResolveDurationByUser(params);
      
      if (response.success) {
        setResolveDurationByUserData(response.data.resolveDurationByUserData);
      }
    } catch (error) {
      console.error('Error fetching resolve duration by user data:', error);
      setResolveDurationByUserData([]);
    } finally {
      setResolveDurationByUserLoading(false);
    }
  }, [timeFilter, selectedYear, selectedPeriod, plantFilter, areaFilter]);

  // Fetch Ticket Resolve Duration by Area Data
  const fetchResolveDurationByAreaData = useCallback(async () => {
    try {
      setResolveDurationByAreaLoading(true);
      
      // Calculate the date range based on time filter
      const dateRange = getDateRange(timeFilter, selectedYear, selectedPeriod);
      
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        plant: plantFilter !== 'all' ? plantFilter : undefined,
        area: areaFilter !== 'all' ? areaFilter : undefined
      };

      const response = await dashboardService.getTicketResolveDurationByArea(params);
      
      if (response.success) {
        setResolveDurationByAreaData(response.data.resolveDurationByAreaData);
      }
    } catch (error) {
      console.error('Error fetching resolve duration by area data:', error);
      setResolveDurationByAreaData([]);
    } finally {
      setResolveDurationByAreaLoading(false);
    }
  }, [timeFilter, selectedYear, selectedPeriod, plantFilter, areaFilter]);

  // Fetch Tickets Closed Per Period Data
  const fetchTicketsClosedData = useCallback(async () => {
    try {
      setTicketsClosedLoading(true);
      
      const params = {
        year: selectedYear,
        plant: plantFilter !== 'all' ? plantFilter : undefined,
        area: areaFilter !== 'all' ? areaFilter : undefined
      };

      const response = await dashboardService.getTicketsClosedPerPeriod(params);
      
      if (response.success) {
        setTicketsClosedData(response.data.ticketsClosedData);
      }
    } catch (error) {
      console.error('Error fetching tickets closed per period data:', error);
      setTicketsClosedData([]);
    } finally {
      setTicketsClosedLoading(false);
    }
  }, [selectedYear, plantFilter, areaFilter]);

  // Fetch Cost Impact by Failure Mode Data
  const fetchCostByFailureModeData = useCallback(async () => {
    try {
      setCostByFailureModeLoading(true);
      
      // Calculate the date range based on time filter
      const dateRange = getDateRange(timeFilter, selectedYear, selectedPeriod);
      
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        plant: plantFilter !== 'all' ? plantFilter : undefined,
        area: areaFilter !== 'all' ? areaFilter : undefined
      };

      const response = await dashboardService.getCostImpactByFailureMode(params);
      
      if (response.success) {
        setCostByFailureModeData(response.data.costByFailureModeData);
      }
    } catch (error) {
      console.error('Error fetching cost by failure mode data:', error);
      setCostByFailureModeData([]);
    } finally {
      setCostByFailureModeLoading(false);
    }
  }, [timeFilter, selectedYear, selectedPeriod, plantFilter, areaFilter]);

  // Fetch Downtime Impact by Failure Mode Data
  const fetchDowntimeByFailureModeData = useCallback(async () => {
    try {
      setDowntimeByFailureModeLoading(true);
      
      // Calculate the date range based on time filter
      const dateRange = getDateRange(timeFilter, selectedYear, selectedPeriod);
      
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        plant: plantFilter !== 'all' ? plantFilter : undefined,
        area: areaFilter !== 'all' ? areaFilter : undefined
      };

      const response = await dashboardService.getDowntimeImpactByFailureMode(params);
      
      if (response.success) {
        setDowntimeByFailureModeData(response.data.downtimeByFailureModeData);
      }
    } catch (error) {
      console.error('Error fetching downtime by failure mode data:', error);
      setDowntimeByFailureModeData([]);
    } finally {
      setDowntimeByFailureModeLoading(false);
    }
  }, [timeFilter, selectedYear, selectedPeriod, plantFilter, areaFilter]);

  // Fetch Cost Impact Reporter Data
  const fetchCostImpactReporterData = useCallback(async () => {
    try {
      setCostImpactReporterLoading(true);
      
      // Calculate the date range based on time filter
      const dateRange = getDateRange(timeFilter, selectedYear, selectedPeriod);
      
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        plant: plantFilter !== 'all' ? plantFilter : undefined,
        area: areaFilter !== 'all' ? areaFilter : undefined
      };

      const response = await dashboardService.getCostImpactReporterLeaderboard(params);
      
      if (response.success) {
        setCostImpactReporterData(response.data.costImpactReporterData);
      }
    } catch (error) {
      console.error('Error fetching cost impact reporter data:', error);
      setCostImpactReporterData([]);
    } finally {
      setCostImpactReporterLoading(false);
    }
  }, [timeFilter, selectedYear, selectedPeriod, plantFilter, areaFilter]);

  // Fetch downtime impact reporter leaderboard data
  const fetchDowntimeImpactReporterData = useCallback(async () => {
    try {
      setDowntimeImpactReporterLoading(true);
      
      // Calculate the date range based on time filter
      const dateRange = getDateRange(timeFilter, selectedYear, selectedPeriod);
      
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        plant: plantFilter !== 'all' ? plantFilter : undefined,
        area: areaFilter !== 'all' ? areaFilter : undefined
      };

      const response = await dashboardService.getDowntimeImpactReporterLeaderboard(params);
      
      if (response.success) {
        setDowntimeImpactReporterData(response.data.downtimeImpactReporterData);
      }
    } catch (error) {
      console.error('Error fetching downtime impact reporter data:', error);
      setDowntimeImpactReporterData([]);
    } finally {
      setDowntimeImpactReporterLoading(false);
    }
  }, [timeFilter, selectedYear, selectedPeriod, plantFilter, areaFilter]);

  // Fetch areas on component mount
  useEffect(() => {
    fetchPlants();
    fetchAreas();
    fetchParticipationData();
    fetchAreaActivityData();
    fetchUserActivityData();
    fetchCalendarHeatmapData();
    fetchDowntimeTrendData();
    fetchCostAvoidanceData();
    fetchDowntimeImpactData();
    fetchCostImpactData();
    fetchDowntimeImpactReporterData();
    fetchCostImpactReporterData();
    fetchDowntimeByFailureModeData();
    fetchCostByFailureModeData();
    fetchResolveDurationByAreaData();
    fetchResolveDurationByUserData();
    fetchOntimeRateByAreaData();
    fetchOntimeRateByUserData();
    fetchTicketsClosedData();
  }, []);

  // Fetch data when filters change
  useEffect(() => {
    fetchKPIData();
    fetchUserActivityData();
  }, [timeFilter, plantFilter, areaFilter, selectedYear, selectedPeriod, fetchKPIData, fetchUserActivityData]);

  // Fetch calendar heatmap data when time filter, year, or area changes
  useEffect(() => {
    fetchCalendarHeatmapData();
  }, [timeFilter, selectedYear, selectedPeriod, plantFilter, areaFilter, fetchCalendarHeatmapData]);

  // Fetch downtime trend data when time filter, year, or filters change
  useEffect(() => {
    fetchDowntimeTrendData();
  }, [timeFilter, selectedYear, selectedPeriod, plantFilter, areaFilter, fetchDowntimeTrendData]);

  // Fetch cost avoidance data when time filter, year, or area changes
  useEffect(() => {
    fetchCostAvoidanceData();
  }, [timeFilter, selectedYear, selectedPeriod, plantFilter, areaFilter, fetchCostAvoidanceData]);

  // Fetch downtime impact data when time filter, period, or filters change
  useEffect(() => {
    fetchDowntimeImpactData();
  }, [timeFilter, selectedYear, selectedPeriod, plantFilter, areaFilter, fetchDowntimeImpactData]);

  // Fetch cost impact data when time filter or period changes (not affected by area filter)
  useEffect(() => {
    fetchCostImpactData();
  }, [timeFilter, selectedYear, selectedPeriod, fetchCostImpactData]);

  // Fetch downtime impact reporter data when time filter, period, or area changes
  useEffect(() => {
    fetchDowntimeImpactReporterData();
  }, [timeFilter, selectedYear, selectedPeriod, plantFilter, areaFilter, fetchDowntimeImpactReporterData]);

  // Fetch cost impact reporter data when time filter, period, or area changes
  useEffect(() => {
    fetchCostImpactReporterData();
  }, [timeFilter, selectedYear, selectedPeriod, plantFilter, areaFilter, fetchCostImpactReporterData]);

  // Fetch downtime by failure mode data when time filter, period, or area changes
  useEffect(() => {
    fetchDowntimeByFailureModeData();
  }, [timeFilter, selectedYear, selectedPeriod, plantFilter, areaFilter, fetchDowntimeByFailureModeData]);

  // Fetch cost by failure mode data when time filter, period, or area changes
  useEffect(() => {
    fetchCostByFailureModeData();
  }, [timeFilter, selectedYear, selectedPeriod, plantFilter, areaFilter, fetchCostByFailureModeData]);

  // Fetch resolve duration by area data when time filter or period changes (only when "All Area" is selected)
  useEffect(() => {
    if (areaFilter === 'all') {
      fetchResolveDurationByAreaData();
    } else {
      setResolveDurationByAreaData([]);
    }
  }, [timeFilter, selectedYear, selectedPeriod, plantFilter, areaFilter, fetchResolveDurationByAreaData]);

  // Fetch resolve duration by user data when time filter, period, or area changes (only when specific area is selected)
  useEffect(() => {
    if (areaFilter !== 'all') {
      fetchResolveDurationByUserData();
    } else {
      setResolveDurationByUserData([]);
    }
  }, [timeFilter, selectedYear, selectedPeriod, plantFilter, areaFilter, fetchResolveDurationByUserData]);

  // Fetch ontime rate by area data when time filter or period changes (only when "All Area" is selected)
  useEffect(() => {
    if (areaFilter === 'all') {
      fetchOntimeRateByAreaData();
    } else {
      setOntimeRateByAreaData([]);
    }
  }, [timeFilter, selectedYear, selectedPeriod, plantFilter, areaFilter, fetchOntimeRateByAreaData]);

  // Fetch ontime rate by user data when time filter, period, or area changes (only when specific area is selected)
  useEffect(() => {
    if (areaFilter !== 'all') {
      fetchOntimeRateByUserData();
    } else {
      setOntimeRateByUserData([]);
    }
  }, [timeFilter, selectedYear, selectedPeriod, plantFilter, areaFilter, fetchOntimeRateByUserData]);

  // Fetch tickets closed per period data when year or filters change
  useEffect(() => {
    fetchTicketsClosedData();
  }, [selectedYear, plantFilter, areaFilter, fetchTicketsClosedData]);

  // Fetch participation data when year or area changes
  useEffect(() => {
    fetchParticipationData();
  }, [selectedYear, plantFilter, areaFilter, fetchParticipationData]);

  // Refetch areas when plant filter changes
  useEffect(() => {
    if (plantFilter !== 'all') {
      fetchAreas(plantFilter);
    } else {
      fetchAreas();
    }
  }, [plantFilter]);

  // Fetch area activity data when year or filters change
  useEffect(() => {
    fetchAreaActivityData();
  }, [selectedYear, plantFilter, areaFilter, fetchAreaActivityData]);

  // KPI Tiles - Dynamic data from API
  const kpiTiles: KPITile[] = useMemo(() => {
    if (!kpiData) {
      // Return empty array when loading - skeleton will be shown instead
      return [];
    }

    const { kpis, summary } = kpiData;
    return [
      {
        title: t('dashboard.totalTickets'),
        value: kpis.totalTicketsThisPeriod,
        change: summary.comparisonMetrics.ticketGrowthRate.percentage,
        changeDescription: summary.comparisonMetrics.ticketGrowthRate.description,
        changeType: summary.comparisonMetrics.ticketGrowthRate.type,
        icon: <AlertTriangle className="h-4 w-4" />,
        color: 'text-brand'
      },
      {
        title: t('dashboard.closedTickets'),
        value: kpis.closedTicketsThisPeriod,
        change: summary.comparisonMetrics.closureRateImprovement.percentage,
        changeDescription: summary.comparisonMetrics.closureRateImprovement.description,
        changeType: summary.comparisonMetrics.closureRateImprovement.type,
        icon: <CheckCircle className="h-4 w-4" />,
        color: 'text-success'
      },
      {
        title: t('dashboard.waitingTickets'),
        value: kpis.waitingTicketsThisPeriod,
        icon: <Clock className="h-4 w-4" />,
        color: 'text-orange-500'
      },
      {
        title: t('dashboard.pendingTickets'),
        value: kpis.pendingTicketsThisPeriod,
        icon: <Clock className="h-4 w-4" />,
        color: 'text-warning'
      },
      {
        title: t('dashboard.totalDowntimeAvoidance'),
        value: `${kpis.totalDowntimeAvoidanceThisPeriod.toFixed(1)} ${t('dashboard.hours')}`,
        change: summary.comparisonMetrics.downtimeAvoidanceGrowth.percentage,
        changeDescription: summary.comparisonMetrics.downtimeAvoidanceGrowth.description,
        changeType: summary.comparisonMetrics.downtimeAvoidanceGrowth.type,
        icon: <TrendingUp className="h-4 w-4" />,
        color: 'text-accent'
      },
      {
        title: t('dashboard.totalCostAvoidance'),
        value: formatCurrencyDynamic(kpis.totalCostAvoidanceThisPeriod).display,
        tooltip: formatCurrencyDynamic(kpis.totalCostAvoidanceThisPeriod).tooltip,
        change: summary.comparisonMetrics.costAvoidanceGrowth.percentage,
        changeDescription: summary.comparisonMetrics.costAvoidanceGrowth.description,
        changeType: summary.comparisonMetrics.costAvoidanceGrowth.type,
        icon: <DollarSign className="h-4 w-4" />,
        color: 'text-info'
      }
    ];
  }, [kpiData, t]);

  // Top Performers - Dynamic data from API
  const topPerformers: TopPerformer[] = useMemo(() => {
    if (!kpiData?.topPerformers) {
      // Return empty array when loading - skeleton will be shown instead
      return [];
    }

    const { topPerformers: apiTopPerformers } = kpiData;
    return [
      {
        name: apiTopPerformers.topReporter?.personName || t('dashboard.noData'),
        value: apiTopPerformers.topReporter ? `${apiTopPerformers.topReporter.ticketCount} ${t('dashboard.tickets')}` : `0 ${t('dashboard.tickets')}`,
        department: t('dashboard.topReporter'),
        avatar: getAvatarUrl(apiTopPerformers.topReporter?.avatarUrl)
      },
      {
        name: apiTopPerformers.topCostSaver?.personName || t('dashboard.noData'),
        value: apiTopPerformers.topCostSaver ? `฿${(apiTopPerformers.topCostSaver.totalSavings! / 1000).toFixed(0)}K ${t('dashboard.costAvoided')}` : `฿0 ${t('dashboard.costAvoided')}`,
        department: t('dashboard.topCostSaver'),
        avatar: getAvatarUrl(apiTopPerformers.topCostSaver?.avatarUrl)
      },
      {
        name: apiTopPerformers.topDowntimeSaver?.personName || t('dashboard.noData'),
        value: apiTopPerformers.topDowntimeSaver ? `${apiTopPerformers.topDowntimeSaver.totalDowntimeSaved!.toFixed(1)} ${t('dashboard.hoursSaved')}` : `0 ${t('dashboard.hoursSaved')}`,
        department: t('dashboard.topDowntimeSaver'),
        avatar: getAvatarUrl(apiTopPerformers.topDowntimeSaver?.avatarUrl)
      }
    ];
  }, [kpiData, getAvatarUrl, t]);

  // Participation Charts - Use real API data
  const participationChartData = useMemo(() => {
    // If we have API data, use it; otherwise return empty array for loading state
    if (participationData.length > 0) {
      return participationData;
    }
    
    // Fallback: create empty data structure for loading state
    return Array.from({ length: 13 }, (_, i) => ({
      period: `P${i + 1}`,
      tickets: 0,
      target: 30,
      uniqueReporters: 0,
      coverageRate: 0
    }));
  }, [participationData]);

  // Tickets Closed Per Period Data - Use real API data
  const ticketsClosedChartData = useMemo(() => {
    // If we have API data, use it; otherwise return empty array for loading state
    if (ticketsClosedData.length > 0) {
      return ticketsClosedData;
    }
    
    // Fallback: create empty data structure for loading state
    return Array.from({ length: 13 }, (_, i) => ({
      period: `P${i + 1}`,
      ticketsClosed: 0
    }));
  }, [ticketsClosedData]);

  // Area Activity Data - Use real API data with dynamic grouping
  const areaActivityChartData = useMemo(() => {
    // If we have API data, transform it for the chart; otherwise return empty array for loading state
    if (areaActivityData.length > 0) {
      return areaActivityData.map(item => ({
        display_name: item.display_name,
        tickets: item.tickets
      })).sort((a, b) => b.tickets - a.tickets);
    }
    
    // Fallback: return empty array for loading state
    return [];
  }, [areaActivityData]);

  // Dynamic chart title based on filter conditions
  const areaActivityChartTitle = useMemo(() => {
    if (!plantFilter || plantFilter === 'all') {
      return t('dashboard.whoActivePlant');
    } else if (!areaFilter || areaFilter === 'all') {
      return t('dashboard.whoActiveArea');
    } else {
      return t('dashboard.whoActiveEquipment');
    }
  }, [plantFilter, areaFilter, t]);

  // Dynamic chart title for downtime trend based on filter conditions
  const downtimeTrendChartTitle = useMemo(() => {
    if (!plantFilter || plantFilter === 'all') {
      return t('dashboard.downtimeAvoidanceTrendByPlant');
    } else if (!areaFilter || areaFilter === 'all') {
      return t('dashboard.downtimeAvoidanceTrendByArea');
    } else {
      return t('dashboard.downtimeAvoidanceTrendByEquipment');
    }
  }, [plantFilter, areaFilter, t]);

  // Dynamic chart title for downtime impact leaderboard based on filter conditions
  const downtimeImpactChartTitle = useMemo(() => {
    if (!plantFilter || plantFilter === 'all') {
      return t('dashboard.downtimeImpactLeaderboardByPlant');
    } else if (!areaFilter || areaFilter === 'all') {
      return t('dashboard.downtimeImpactLeaderboardByArea');
    } else {
      return t('dashboard.downtimeImpactLeaderboardByEquipment');
    }
  }, [plantFilter, areaFilter, t]);

  // User Activity Data - Use real API data
  const userActivityChartData = useMemo(() => {
    // If we have API data, transform it for the chart; otherwise return empty array for loading state
    if (userActivityData.length > 0) {
      return userActivityData.map(item => ({
        ...item,
        avatar: getAvatarUrl(item.avatar)
      }));
    }
    
    // Fallback: return empty array for loading state
    return [];
  }, [userActivityData, getAvatarUrl]);

  // Impact and Value Charts Data (from API)
  const downtimeTrendChartData = useMemo(() => {
    return downtimeTrendData;
  }, [downtimeTrendData]);

  const costAvoidanceChartData = useMemo(() => {
    return costAvoidanceData;
  }, [costAvoidanceData]);

  const downtimeImpactChartData = useMemo(() => {
    console.log('Downtime Impact Chart Data:', downtimeImpactData);
    return downtimeImpactData;
  }, [downtimeImpactData]);

  const costImpactChartData = useMemo(() => {
    return costImpactData;
  }, [costImpactData]);

  const downtimeImpactReporterChartData = useMemo(() => {
    // If we have API data, transform it for the chart; otherwise return empty array for loading state
    if (downtimeImpactReporterData.length > 0) {
      return downtimeImpactReporterData.map(item => ({
        ...item,
        avatar: item.avatar ? getAvatarUrl(item.avatar) : undefined
      }));
    }
    
    // Fallback: return empty array for loading state
    return [];
  }, [downtimeImpactReporterData, getAvatarUrl]);

  const costImpactReporterChartData = useMemo(() => {
    // If we have API data, transform it for the chart; otherwise return empty array for loading state
    if (costImpactReporterData.length > 0) {
      return costImpactReporterData.map(item => ({
        ...item,
        avatar: item.avatar ? getAvatarUrl(item.avatar) : undefined
      }));
    }
    
    // Fallback: return empty array for loading state
    return [];
  }, [costImpactReporterData, getAvatarUrl]);

  const downtimeByFailureModeChartData = useMemo(() => {
    return downtimeByFailureModeData;
  }, [downtimeByFailureModeData]);

  const costByFailureModeChartData = useMemo(() => {
    return costByFailureModeData;
  }, [costByFailureModeData]);

  const resolveDurationByAreaChartData = useMemo(() => {
    return resolveDurationByAreaData;
  }, [resolveDurationByAreaData]);

  const resolveDurationByUserChartData = useMemo(() => {
    // If we have API data, transform it for the chart; otherwise return empty array for loading state
    if (resolveDurationByUserData.length > 0) {
      return resolveDurationByUserData.map(item => ({
        ...item,
        avatar: item.avatar ? getAvatarUrl(item.avatar) : undefined
      }));
    }
    
    // Fallback: return empty array for loading state
    return [];
  }, [resolveDurationByUserData, getAvatarUrl]);

  const ontimeRateByAreaChartData = useMemo(() => {
    return ontimeRateByAreaData;
  }, [ontimeRateByAreaData]);

  const ontimeRateByUserChartData = useMemo(() => {
    // If we have API data, transform it for the chart; otherwise return empty array for loading state
    if (ontimeRateByUserData.length > 0) {
      return ontimeRateByUserData.map(item => ({
        ...item,
        avatar: item.avatar ? getAvatarUrl(item.avatar) : undefined
      }));
    }
    
    // Fallback: return empty array for loading state
    return [];
  }, [ontimeRateByUserData, getAvatarUrl]);

  // Pad the axis domain so avatars rendered as labels have enough room and are not clipped
  const downtimeImpactReporterXAxisDomain = useMemo<[number | 'auto', number | 'auto']>(() => {
    if (downtimeImpactReporterChartData.length === 0) {
      return [0, 'auto'];
    }

    const maxHours = Math.max(
      ...downtimeImpactReporterChartData.map(item => (typeof item.hours === 'number' ? item.hours : 0))
    );

    if (!Number.isFinite(maxHours) || maxHours <= 0) {
      return [0, 'auto'];
    }

    const buffer = Math.max(5, Math.ceil(maxHours * 0.2));
    return [0, maxHours + buffer];
  }, [downtimeImpactReporterChartData]);

  // Pad the axis domain for cost impact reporter chart to provide more room for cost values
  const costImpactReporterXAxisDomain = useMemo<[number | 'auto', number | 'auto']>(() => {
    if (costImpactReporterChartData.length === 0) {
      return [0, 'auto'];
    }

    const maxCost = Math.max(
      ...costImpactReporterChartData.map(item => (typeof item.cost === 'number' ? item.cost : 0))
    );

    if (!Number.isFinite(maxCost) || maxCost <= 0) {
      return [0, 'auto'];
    }

    const buffer = Math.max(50000, Math.ceil(maxCost * 0.3)); // Larger buffer for cost values
    return [0, maxCost + buffer];
  }, [costImpactReporterChartData]);

  // Remove mock data - now using real API data via costImpactReporterChartData

  // Remove mock data - now using real API data via downtimeByFailureModeChartData

  // Remove mock data - now using real API data via downtimeByFailureModeChartData

  // Remove mock data - now using real API data via costByFailureModeChartData

  // Remove mock data - now using real API data via resolveDurationByAreaChartData

  // Remove mock data - now using real API data via ontimeRateByAreaChartData and ontimeRateByUserChartData

  // Calendar Heatmap Data (from API)
  const calendarData = useMemo(() => {
    return calendarHeatmapData;
  }, [calendarHeatmapData]);

  // Calculate the year for calendar heatmap title based on time filter
  const calendarHeatmapYear = useMemo(() => {
    const dateRange = getDateRange(timeFilter, selectedYear, selectedPeriod);
    return parseInt(dateRange.startDate.split('-')[0]);
  }, [timeFilter, selectedYear, selectedPeriod]);

  return (
    <div className="space-y-4 p-4">
      <style>{`
        .calendar-heatmap-container {
          overflow-x: auto;
        }
        .react-calendar-heatmap .color-empty {
          fill: hsl(var(--muted));
        }
        .react-calendar-heatmap .color-scale-1 {
          fill: hsl(var(--primary) / 0.1);
        }
        .react-calendar-heatmap .color-scale-2 {
          fill: hsl(var(--primary) / 0.2);
        }
        .react-calendar-heatmap .color-scale-3 {
          fill: hsl(var(--primary) / 0.3);
        }
        .react-calendar-heatmap .color-scale-4 {
          fill: hsl(var(--primary) / 0.4);
        }
        .react-calendar-heatmap .color-scale-5 {
          fill: hsl(var(--primary) / 0.5);
        }
        .react-calendar-heatmap .color-scale-6 {
          fill: hsl(var(--primary) / 0.6);
        }
        .react-calendar-heatmap .color-scale-7 {
          fill: hsl(var(--primary) / 0.7);
        }
        .react-calendar-heatmap .color-scale-8 {
          fill: hsl(var(--primary) / 0.8);
        }
        .react-calendar-heatmap .color-scale-9 {
          fill: hsl(var(--primary) / 0.9);
        }
        .react-calendar-heatmap .color-scale-10 {
          fill: hsl(var(--primary));
        }
        .react-calendar-heatmap rect:hover {
          stroke: #000;
          stroke-width: 1px;
        }
        .react-calendar-heatmap .month-label {
          font-size: 10px;
          fill: #767676;
        }
        .react-calendar-heatmap .wday-label {
          font-size: 9px;
          fill: #767676;
        }
      `}</style>
      {/* Header */}
      <div className="space-y-3">
        {/* First Row - Title */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('dashboard.abnormalReport')}</h1>
        </div>
        
        {/* Second Row - Date Range and Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Left side - Date Range */}
          <div className="text-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-muted-foreground">{t('dashboard.range')}:</span>
              <span className="text-foreground font-medium">
                {(() => {
                  const dateRange = getDateRange(timeFilter, selectedYear, selectedPeriod);
                  return `${dateRange.startDate} - ${dateRange.endDate}`;
                })()}
              </span>
              {(timeFilter === 'this-period' || timeFilter === 'select-period') && (
                <span className="text-xs text-muted-foreground">
                  {timeFilter === 'this-period' 
                    ? (() => {
                        const currentPeriodInfo = calculatePeriodForDate(new Date(), selectedYear);
                        return `P${currentPeriodInfo.period}`;
                      })()
                    : `P${selectedPeriod}`
                  }
                </span>
              )}
            </div>
          </div>
          
          {/* Right side - Filters */}
          <div className="flex items-center gap-3">
            {/* Compact Active Filters Display */}
            {hasActiveFilters() && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Filters:</span>
                <div className="flex items-center gap-1 flex-wrap">
                  {plantFilter !== 'all' && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      Plant: {plants.find(p => p.code === plantFilter)?.name || plantFilter}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-destructive"
                        onClick={() => clearFilter("plant")}
                      />
                    </Badge>
                  )}
                  {areaFilter !== 'all' && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      Area: {areas.find(a => a.code === areaFilter)?.name || areaFilter}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-destructive"
                        onClick={() => clearFilter("area")}
                      />
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="h-5 text-xs px-2"
                  >
                    Clear All
                  </Button>
                </div>
              </div>
            )}
            
            <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  {t('dashboard.filters')}
                </Button>
              </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {t('dashboard.globalFilters')}
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('dashboard.timeRange')}</label>
                <Select value={timeFilter} onValueChange={setTimeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('dashboard.selectPeriod')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="this-year">{t('dashboard.thisYear')}</SelectItem>
                    <SelectItem value="last-year">{t('dashboard.lastYear')}</SelectItem>
                    <SelectItem value="this-period">{t('dashboard.thisPeriod')}</SelectItem>
                    <SelectItem value="select-period">{t('dashboard.selectPeriod')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {timeFilter === 'select-period' && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('dashboard.year')}</label>
                    <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2022">2022</SelectItem>
                        <SelectItem value="2023">2023</SelectItem>
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2025">2025</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('dashboard.period')}</label>
                    <Select value={selectedPeriod.toString()} onValueChange={(value) => setSelectedPeriod(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 13 }, (_, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()}>P{i + 1}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Plant</label>
                <Select value={plantFilter} onValueChange={(value) => {
                  setPlantFilter(value);
                  setAreaFilter('all'); // Reset area when plant changes
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder={plantsLoading ? 'Loading Plants...' : 'Plant'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Plants</SelectItem>
                    {plants.map(plant => (
                      <SelectItem key={plant.code} value={plant.code}>
                        {plant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('dashboard.area')}</label>
                <Select value={areaFilter} onValueChange={setAreaFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={areasLoading ? t('dashboard.loadingAreas') : t('dashboard.area')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('dashboard.allAreas')}</SelectItem>
                    {areas.map(area => (
                      <SelectItem key={area.code} value={area.code}>
                        {area.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsFilterModalOpen(false)}>
                {t('dashboard.close')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">{t('dashboard.errorLoadingData')}</span>
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}


      {/* KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {loading ? (
          <KPITileSkeleton count={6} />
        ) : (
          kpiTiles.map((kpi, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                    {kpi.tooltip ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="text-2xl font-bold cursor-help">{kpi.value}</p>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{kpi.tooltip}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <p className="text-2xl font-bold">{kpi.value}</p>
                    )}
                    {kpi.change !== undefined && (
                      <div className="flex items-center mt-1">
                        {kpi.change > 0 ? (
                          <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                        )}
                        <span className={`text-xs ${kpi.change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {`${Math.abs(kpi.change).toFixed(1)}%`}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className={`p-2 rounded-lg ${kpi.color}`}>
                    {kpi.icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {loading ? (
          <TopPerformersSkeleton count={3} />
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {t('dashboard.topReporter')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarImage src={topPerformers[0]?.avatar} />
                    <AvatarFallback>{topPerformers[0]?.name?.split(' ').map(n => n[0]).join('') || 'N/A'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{topPerformers[0]?.name || t('dashboard.noData')}</p>
                    <p className="text-lg font-bold text-brand">{topPerformers[0]?.value || `0 ${t('dashboard.tickets')}`}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  {t('dashboard.topCostSaver')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarImage src={topPerformers[1]?.avatar} />
                    <AvatarFallback>{topPerformers[1]?.name?.split(' ').map(n => n[0]).join('') || 'N/A'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{topPerformers[1]?.name || t('dashboard.noData')}</p>
                    <p className="text-lg font-bold text-success">{topPerformers[1]?.value || `฿0 ${t('dashboard.costAvoided')}`}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  {t('dashboard.topDowntimeSaver')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarImage src={topPerformers[2]?.avatar} />
                    <AvatarFallback>{topPerformers[2]?.name?.split(' ').map(n => n[0]).join('') || 'N/A'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{topPerformers[2]?.name || t('dashboard.noData')}</p>
                    <p className="text-lg font-bold text-accent">{topPerformers[2]?.value || `0 ${t('dashboard.hoursSaved')}`}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Participation Charts */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">{t('dashboard.participation')}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Total Tickets Count Per Period */}
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.totalTicketsCountPerPeriod')}</CardTitle>
            </CardHeader>
            <CardContent>
              {participationLoading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={participationChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="tickets" fill="hsl(var(--primary))" name={t('dashboard.tickets')} />
                    <Line type="monotone" dataKey="target" stroke="hsl(var(--accent))" name={t('dashboard.target')} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Total Tickets Closed Per Period */}
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.totalTicketsClosedPerPeriod')}</CardTitle>
            </CardHeader>
            <CardContent>
              {ticketsClosedLoading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={ticketsClosedChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="ticketsClosed" fill="hsl(var(--primary))" name={t('dashboard.ticketsClosed')} />
                    <Line
                      type="monotone"
                      dataKey="target"
                      stroke="hsl(var(--accent))"
                      strokeWidth={2}
                      name={t('dashboard.target')}
                      dot={{ fill: 'hsl(var(--accent))', strokeWidth: 2, r: 4 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Who Active (Dynamic Grouping) */}
          <Card>
            <CardHeader>
              <CardTitle>{areaActivityChartTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              {areaActivityLoading ? (
                <div className="flex items-center justify-center h-[400px]">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(300, areaActivityChartData.length * 40 + 60)}>
                  <BarChart 
                    data={areaActivityChartData} 
                    layout="vertical" 
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    barCategoryGap={6} // More space between bars
                    barSize={35} // Taller bars
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="display_name" type="category" width={80} />
                    <RechartsTooltip />
                    <Bar dataKey="tickets" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Who Active (User) */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => {
            const dateRange = getDateRange(timeFilter, selectedYear, selectedPeriod);
            const params = new URLSearchParams({
              startDate: dateRange.startDate,
              endDate: dateRange.endDate,
              plant: plantFilter,
              area: areaFilter
            });
            window.open(`/charts/user-activity?${params.toString()}`, '_blank');
          }}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{t('dashboard.whoActiveUser')}</span>
                <div className="text-sm text-muted-foreground hover:text-blue-600 transition-colors">
                  {t('dashboard.clickToExpand')}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userActivityLoading ? (
                <div className="flex items-center justify-center h-[400px]">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(400, userActivityChartData.length * 48 + 40)}>
                  <BarChart 
                    data={userActivityChartData} 
                    layout="vertical" 
                    margin={{ top: 12, right: 80, left: 20, bottom: 12 }}
                    barCategoryGap={6}
                  >
                    <CartesianGrid horizontal vertical={false} strokeDasharray="3 3" />
                    <XAxis 
                      type="number" 
                      domain={[0, 'dataMax + 5']}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false} 
                    />
                    <YAxis 
                      dataKey="user" 
                      type="category" 
                      width={110}
                      tickLine={false}
                      axisLine={false}
                    />
                    <RechartsTooltip 
                      content={<UserTooltip />}
                      cursor={{ fillOpacity: 0.06 }}
                    />
                    <Bar 
                      dataKey="tickets" 
                      fill="hsl(var(--accent))"
                      radius={[0, 8, 8, 0]} // rounded bar end
                      isAnimationActive
                      animationBegin={0}
                      animationDuration={800}
                    >
                      {/* Value label at end (before avatar) */}
                      <LabelList
                        dataKey="tickets"
                        position="right"
                        offset={50} // Increased offset to prevent overlap with avatar
                        style={{ fill: "#555", fontWeight: 600 }}
                      />
                      {/* Avatar at bar end */}
                      <LabelList content={AvatarLabel({ data: userActivityChartData, maxAvatar: 36, clipPrefix: 'user-activity-' })} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* When Active - Calendar Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.whenActive')} ({calendarHeatmapYear})</CardTitle>
          </CardHeader>
          <CardContent>
            {calendarHeatmapLoading ? (
              <div className="flex items-center justify-center h-[200px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="calendar-heatmap-container">
                <CalendarHeatmap
                  startDate={new Date(calendarHeatmapYear, 0, 1)}
                  endDate={new Date(calendarHeatmapYear, 11, 31)}
                  values={calendarData}
                  classForValue={(value) => {
                    if (!value) {
                      return 'color-empty';
                    }
                    if (value.count <= 1) return 'color-scale-1';
                    if (value.count <= 3) return 'color-scale-2';
                    if (value.count <= 5) return 'color-scale-3';
                    if (value.count <= 7) return 'color-scale-4';
                    if (value.count <= 9) return 'color-scale-5';
                    if (value.count <= 11) return 'color-scale-6';
                    if (value.count <= 13) return 'color-scale-7';
                    if (value.count <= 15) return 'color-scale-8';
                    if (value.count <= 17) return 'color-scale-9';
                    return 'color-scale-10';
                  }}
                  titleForValue={(value) => value ? `${value.date}: ${value.count} ${t('dashboard.ticketsOnDate')}` : t('dashboard.noDataAvailable')}
                  showWeekdayLabels={true}
                  showMonthLabels={true}
                  onClick={(value) => {
                    if (value) {
                      console.log(`${t('dashboard.clickedOn')} ${value.date}: ${value.count} ${t('dashboard.ticketsOnDate')}`);
                    }
                  }}
                />
              </div>
            )}
            {/* <div className="flex items-center justify-center mt-4 space-x-4 text-sm">
              <span>Less</span>
              <div className="flex space-x-1">
                <div className="w-3 h-3 bg-muted rounded"></div>
                <div className="w-3 h-3 rounded" style={{backgroundColor: '#EAFAF3'}}></div>
                <div className="w-3 h-3 rounded" style={{backgroundColor: '#C5F1DE'}}></div>
                <div className="w-3 h-3 rounded" style={{backgroundColor: '#A0E9C8'}}></div>
                <div className="w-3 h-3 rounded" style={{backgroundColor: '#7BE0B2'}}></div>
                <div className="w-3 h-3 rounded" style={{backgroundColor: '#56D79D'}}></div>
                <div className="w-3 h-3 rounded" style={{backgroundColor: '#30CF87'}}></div>
                <div className="w-3 h-3 rounded" style={{backgroundColor: '#28A96E'}}></div>
                <div className="w-3 h-3 rounded" style={{backgroundColor: '#1F8457'}}></div>
                <div className="w-3 h-3 rounded" style={{backgroundColor: '#165F3E'}}></div>
                <div className="w-3 h-3 rounded" style={{backgroundColor: '#0E3A26'}}></div>
              </div>
              <span>More</span>
            </div> */}
          </CardContent>
        </Card>
      </div>

      {/* Impact and Value Charts */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">{t('dashboard.impactAndValue')}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Downtime Avoidance Trend (Dynamic Grouping) */}
          <Card>
            <CardHeader>
              <CardTitle>{downtimeTrendChartTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              {downtimeTrendLoading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={downtimeTrendChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    {downtimeTrendAreas.map((area, index) => {
                      const colors = [
                        'hsl(var(--primary))', 
                        'hsl(var(--accent))', 
                        'hsl(var(--warning))', 
                        'hsl(var(--info))', 
                        'hsl(var(--success))', 
                        'hsl(var(--destructive))',
                        'hsl(var(--primary) / 0.7)', 
                        'hsl(var(--accent) / 0.7)'
                      ];
                      const color = colors[index % colors.length];
                      return (
                        <Area 
                          key={area}
                          type="monotone" 
                          dataKey={area} 
                          stackId="1" 
                          stroke={color} 
                          fill={color} 
                        />
                      );
                    })}
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Cost Avoidance */}
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.costAvoidance')}</CardTitle>
            </CardHeader>
            <CardContent>
              {costAvoidanceLoading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={costAvoidanceChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <RechartsTooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="costAvoidance" fill="hsl(var(--primary))" name={t('dashboard.costAvoidanceTHB')} />
                    <Line yAxisId="right" type="monotone" dataKey="costPerCase" stroke="hsl(var(--accent))" name={t('dashboard.costPerCase')} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Downtime Impact Leaderboard (Dynamic Grouping) */}
          <Card>
            <CardHeader>
              <CardTitle>{downtimeImpactChartTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              {downtimeImpactLoading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
                </div>
              ) : downtimeImpactChartData.length === 0 ? (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  {t('dashboard.noDataAvailable')}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={downtimeImpactChartData} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="display_name" type="category" width={80} />
                    <RechartsTooltip />
                    <Bar dataKey="hours" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Cost Impact Leaderboard (Area) */}
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.costImpactLeaderboardArea')}</CardTitle>
            </CardHeader>
            <CardContent>
              {costImpactLoading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
                </div>
              ) : costImpactChartData.length === 0 ? (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  {t('dashboard.noDataAvailable')}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={costImpactChartData} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="display_name" type="category" width={80} />
                    <RechartsTooltip />
                    <Bar dataKey="cost" fill="hsl(var(--accent))" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Downtime Impact Leaderboard (Reporter) */}
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.downtimeImpactLeaderboardReporter')}</CardTitle>
            </CardHeader>
            <CardContent>
              {downtimeImpactReporterLoading ? (
                <div className="flex items-center justify-center h-[400px]">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(400, downtimeImpactReporterChartData.length * 48 + 40)}>
                  <BarChart 
                    data={downtimeImpactReporterChartData} 
                    layout="vertical" 
                    margin={{ top: 12, right: 80, left: 20, bottom: 12 }}
                    barCategoryGap={6}
                  >
                    <CartesianGrid horizontal vertical={false} strokeDasharray="3 3" />
                    <XAxis 
                      type="number" 
                      domain={downtimeImpactReporterXAxisDomain}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false} 
                    />
                    <YAxis 
                      dataKey="reporter" 
                      type="category" 
                      width={110}
                      tickLine={false}
                      axisLine={false}
                    />
                    <RechartsTooltip 
                      content={<DowntimeTooltip />}
                      cursor={{ fillOpacity: 0.06 }}
                    />
                    <Bar 
                      dataKey="hours" 
                      fill="hsl(var(--primary))"
                      radius={[0, 8, 8, 0]}
                      isAnimationActive
                      animationBegin={0}
                      animationDuration={800}
                    >
                      <LabelList
                        dataKey="hours"
                        position="right"
                        offset={50}
                        style={{ fill: "#555", fontWeight: 600 }}
                      />
                      <LabelList content={AvatarLabel({ data: downtimeImpactReporterChartData, maxAvatar: 36, clipPrefix: 'downtime-impact-' })} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Cost Impact Leaderboard (Reporter) */}
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.costImpactLeaderboardReporter')}</CardTitle>
            </CardHeader>
            <CardContent>
              {costImpactReporterLoading ? (
                <div className="flex items-center justify-center h-[400px]">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(400, costImpactReporterChartData.length * 48 + 40)}>
                  <BarChart 
                    data={costImpactReporterChartData} 
                    layout="vertical" 
                    margin={{ top: 12, right: 120, left: 20, bottom: 12 }}
                    barCategoryGap={6}
                  >
                  <CartesianGrid horizontal vertical={false} strokeDasharray="3 3" />
                  <XAxis 
                    type="number" 
                    domain={costImpactReporterXAxisDomain}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    tickFormatter={(value) => `฿${(value / 1000).toFixed(0)}K`}
                  />
                  <YAxis 
                    dataKey="reporter" 
                    type="category" 
                    width={110}
                    tickLine={false}
                    axisLine={false}
                  />
                  <RechartsTooltip 
                    content={<CostTooltip />}
                    cursor={{ fillOpacity: 0.06 }}
                  />
                  <Bar 
                    dataKey="cost" 
                    fill="hsl(var(--accent))"
                    radius={[0, 8, 8, 0]}
                    isAnimationActive
                    animationBegin={0}
                    animationDuration={800}
                  >
                    <LabelList 
                      dataKey="cost"
                      position="right"
                      offset={70}
                      style={{ fill: "#555", fontWeight: 600 }}
                      formatter={(value: any) => `฿${(Number(value) / 1000).toFixed(0)}K`}
                    />
                    <LabelList content={AvatarLabel({ data: costImpactReporterChartData, maxAvatar: 28, clipPrefix: 'cost-impact-reporter-' })} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Downtime Impact by Failure Mode */}
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.downtimeImpactByFailureMode')}</CardTitle>
            </CardHeader>
            <CardContent>
              {downtimeByFailureModeLoading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={downtimeByFailureModeChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="failureModeCode" 
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      interval={0}
                    />
                    <YAxis 
                      yAxisId="downtime"
                      orientation="left"
                      label={{ value: t('dashboard.downtimeHours'), angle: -90, position: 'insideLeft' }}
                    />
                    <YAxis 
                      yAxisId="cases"
                      orientation="right"
                      label={{ value: t('dashboard.caseCount'), angle: 90, position: 'insideRight' }}
                    />
                    <RechartsTooltip 
                      formatter={(value, name) => {
                        if (name === 'downtime') {
                          return [`${value} ${t('dashboard.hours')}`, t('dashboard.downtimeHours')];
                        } else if (name === 'caseCount') {
                          return [`${value} ${t('dashboard.caseCount')}`, t('dashboard.caseCount')];
                        }
                        return [value, name];
                      }}
                      labelFormatter={(label, payload) => {
                        if (payload && payload[0] && payload[0].payload) {
                          return payload[0].payload.failureModeName;
                        }
                        return label;
                      }}
                    />
                    <Legend />
                    <Bar 
                      yAxisId="downtime"
                      dataKey="downtime" 
                      fill="hsl(var(--primary))" 
                      name={t('dashboard.downtimeHours')}
                    />
                    <Line 
                      yAxisId="cases"
                      type="monotone" 
                      dataKey="caseCount" 
                      stroke="hsl(var(--accent))" 
                      strokeWidth={3}
                      name={t('dashboard.caseCount')}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Cost Impact by Failure Mode */}
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.costImpactByFailureMode')}</CardTitle>
            </CardHeader>
            <CardContent>
              {costByFailureModeLoading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={costByFailureModeChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="failureModeCode" 
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      interval={0}
                    />
                    <YAxis 
                      yAxisId="cost"
                      orientation="left"
                      label={{ value: t('dashboard.costAvoidanceTHB'), angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                      tickFormatter={(value) => `฿${(value / 1000).toFixed(0)}K`}
                      width={80}
                    />
                    <YAxis 
                      yAxisId="cases"
                      orientation="right"
                      label={{ value: t('dashboard.caseCount'), angle: 90, position: 'insideRight', style: { textAnchor: 'middle' } }}
                      width={60}
                    />
                    <RechartsTooltip 
                      formatter={(value, name) => {
                        if (name === 'cost') {
                          return [`฿${Number(value).toLocaleString()}`, t('dashboard.costAvoidance')];
                        } else if (name === 'caseCount') {
                          return [`${value} ${t('dashboard.caseCount')}`, t('dashboard.caseCount')];
                        }
                        return [value, name];
                      }}
                      labelFormatter={(label, payload) => {
                        if (payload && payload[0] && payload[0].payload) {
                          return payload[0].payload.failureModeName;
                        }
                        return label;
                      }}
                    />
                    <Legend />
                    <Bar 
                      yAxisId="cost"
                      dataKey="cost" 
                      fill="hsl(var(--accent))" 
                      name={t('dashboard.costAvoidance')}
                    />
                    <Line 
                      yAxisId="cases"
                      type="monotone" 
                      dataKey="caseCount" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      name={t('dashboard.caseCount')}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Speed Charts */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">{t('dashboard.speed')}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Ticket Average Resolve Duration */}
          {areaFilter === 'all' && (
            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.ticketAverageResolveDuration')}</CardTitle>
              </CardHeader>
              <CardContent>
                {resolveDurationByAreaLoading ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={resolveDurationByAreaChartData} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        type="number" 
                        allowDecimals={false}
                        label={{ value: t('dashboard.hours'), position: 'insideBottom', offset: -10 }}
                        tickFormatter={(value) => `${value}h`}
                        tick={{ dy: 5 }}
                      />
                      <YAxis 
                        dataKey="display_name" 
                        type="category" 
                        width={80}
                      />
                      <RechartsTooltip 
                        formatter={(value, name) => {
                          if (name === 'avgResolveHours') {
                            return [`${value} ${t('dashboard.hours')}`, t('dashboard.averageResolveTime')];
                          } else if (name === 'ticketCount') {
                            return [`${value} ${t('dashboard.tickets')}`, t('dashboard.ticketCount')];
                          }
                          return [value, name];
                        }}
                        labelFormatter={(label) => `Area: ${label}`}
                      />
                      <Legend />
                      <Bar 
                        dataKey="avgResolveHours" 
                        fill="hsl(var(--primary))" 
                        name={t('dashboard.averageResolveTime')}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          )}

          {/* Ticket Average Resolve Duration by User */}
          {areaFilter !== 'all' && (
            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.ticketAverageResolveDurationByUser')}</CardTitle>
              </CardHeader>
              <CardContent>
                {resolveDurationByUserLoading ? (
                  <div className="flex items-center justify-center h-[400px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(400, resolveDurationByUserChartData.length * 48 + 40)}>
                    <BarChart 
                      data={resolveDurationByUserChartData} 
                      layout="vertical" 
                      margin={{ top: 20, right: 120, left: 20, bottom: 5 }}
                      barCategoryGap={6}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        type="number" 
                        allowDecimals={false}
                        label={{ value: 'Hours', position: 'insideBottom', offset: -10 }}
                        tickFormatter={(value) => `${value}h`}
                        tick={{ dy: 5 }}
                      />
                      <YAxis 
                        dataKey="userName" 
                        type="category" 
                        width={80}
                      />
                      <RechartsTooltip 
                        formatter={(value, name) => {
                          if (name === 'avgResolveHours') {
                            return [`${value} hours`, 'Average Resolve Time'];
                          } else if (name === 'ticketCount') {
                            return [`${value} tickets`, 'Ticket Count'];
                          }
                          return [value, name];
                        }}
                        labelFormatter={(label) => `User: ${label}`}
                      />
                      <Legend />
                      <Bar 
                        dataKey="avgResolveHours" 
                        fill="hsl(var(--accent))" 
                        name="Average Resolve Time"
                      >
                        <LabelList content={AvatarLabel({ data: resolveDurationByUserChartData, maxAvatar: 28, clipPrefix: "resolve-duration-user-" })} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          )}

          {/* Ontime Rate by Area */}
          {areaFilter === 'all' && (
            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.ontimeRateByArea')}</CardTitle>
              </CardHeader>
              <CardContent>
                {ontimeRateByAreaLoading ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={ontimeRateByAreaChartData} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        type="number" 
                        allowDecimals={false}
                        label={{ value: t('dashboard.percentage'), position: 'insideBottom', offset: -10 }}
                        tickFormatter={(value) => `${value}%`}
                        domain={[0, 100]}
                        tick={{ dy: 5 }}
                      />
                      <YAxis 
                        dataKey="display_name" 
                        type="category" 
                        width={80}
                      />
                      <RechartsTooltip 
                        formatter={(value, name) => {
                          if (name === 'ontimeRate') {
                            return [`${value}%`, t('dashboard.ontimeRate')];
                          } else if (name === 'totalFinished') {
                            return [`${value} ${t('dashboard.tickets')}`, t('dashboard.totalFinished')];
                          } else if (name === 'ontimeFinished') {
                            return [`${value} ${t('dashboard.tickets')}`, t('dashboard.ontimeFinished')];
                          }
                          return [value, name];
                        }}
                        labelFormatter={(label) => `Area: ${label}`}
                      />
                      <Legend />
                      <Bar 
                        dataKey="ontimeRate" 
                        fill="hsl(var(--success))" 
                        name={t('dashboard.ontimeRate')}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          )}

          {/* Ontime Rate by User */}
          {areaFilter !== 'all' && (
            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.ontimeRateByUser')}</CardTitle>
              </CardHeader>
              <CardContent>
                {ontimeRateByUserLoading ? (
                  <div className="flex items-center justify-center h-[400px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(400, ontimeRateByUserChartData.length * 48 + 40)}>
                    <BarChart 
                      data={ontimeRateByUserChartData} 
                      layout="vertical" 
                      margin={{ top: 20, right: 120, left: 20, bottom: 5 }}
                      barCategoryGap={6}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        type="number" 
                        allowDecimals={false}
                        label={{ value: 'Percentage (%)', position: 'insideBottom', offset: -10 }}
                        tickFormatter={(value) => `${value}%`}
                        domain={[0, 100]}
                        tick={{ dy: 5 }}
                      />
                      <YAxis 
                        dataKey="userName" 
                        type="category" 
                        width={80}
                      />
                      <RechartsTooltip 
                        formatter={(value, name) => {
                          if (name === 'ontimeRate') {
                            return [`${value}%`, 'Ontime Rate'];
                          } else if (name === 'totalFinished') {
                            return [`${value} tickets`, 'Total Finished'];
                          } else if (name === 'ontimeFinished') {
                            return [`${value} tickets`, 'Ontime Finished'];
                          }
                          return [value, name];
                        }}
                        labelFormatter={(label) => `User: ${label}`}
                      />
                      <Legend />
                      <Bar 
                        dataKey="ontimeRate" 
                        fill="hsl(var(--success))" 
                        name="Ontime Rate"
                      >
                        <LabelList content={AvatarLabel({ data: ontimeRateByUserChartData, maxAvatar: 28, clipPrefix: "ontime-rate-user-" })} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AbnormalReportDashboardV2Page;
