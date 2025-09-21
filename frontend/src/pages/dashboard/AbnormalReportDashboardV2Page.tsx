import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend,
  ComposedChart, AreaChart, Area, Line, LabelList
} from 'recharts';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import { 
  TrendingUp, TrendingDown, Clock, DollarSign, 
  AlertTriangle, CheckCircle, User, Award,
  BarChart3
} from 'lucide-react';
import dashboardService, { type AbnormalFindingKPIResponse, type AreaData } from '@/services/dashboardService';
import { KPITileSkeleton } from '@/components/ui/kpi-tile-skeleton';
import { TopPerformersSkeleton } from '@/components/ui/top-performers-skeleton';

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
}> = ({ x, y, size, user }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const clipId = `clip-avatar-${user.id}`;
  const cx = x + size / 2;
  const cy = y + size / 2;

  return (
    <g>
      {/* Define circular clip path */}
      <defs>
        <clipPath id={clipId}>
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
      
      {/* Initials text (hidden when image loads) */}
      {!imageLoaded && (
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
const AvatarLabel = ({ data, maxAvatar = 28 }: { data: any[], maxAvatar?: number }) => {
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
      />
    );
  };
};


const AbnormalReportDashboardV2Page: React.FC = () => {
  // Global Filters
  const [timeFilter, setTimeFilter] = useState<string>('this-period');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);

  // API State
  const [kpiData, setKpiData] = useState<AbnormalFindingKPIResponse['data'] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [areas, setAreas] = useState<AreaData[]>([]);
  const [areasLoading, setAreasLoading] = useState<boolean>(false);

  // Minimum loading time to prevent UI blinking (in milliseconds)
  const MIN_LOADING_TIME = 800;

  // Helper function to construct avatar URL
  const getAvatarUrl = useCallback((avatarUrl?: string) => {
    if (!avatarUrl) return undefined;
    const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');
    const uploadsBase = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;
    return `${uploadsBase}${avatarUrl}`;
  }, []);

  // Utility function to get date range based on time filter
  const getDateRange = (timeFilter: string, year?: number, period?: number) => {
    const now = new Date();
    const currentYear = year || now.getFullYear();
    
    switch (timeFilter) {
      case 'this-year':
        return {
          startDate: `${currentYear}-01-01`,
          endDate: `${currentYear}-12-31`,
          compare_startDate: `${currentYear - 1}-01-01`,
          compare_endDate: `${currentYear - 1}-12-31`
        };
      case 'last-year':
        return {
          startDate: `${currentYear - 1}-01-01`,
          endDate: `${currentYear - 1}-12-31`,
          compare_startDate: `${currentYear - 2}-01-01`,
          compare_endDate: `${currentYear - 2}-12-31`
        };
      case 'this-period':
        // For this-period, we'll use current month as a simple implementation
        const currentMonth = now.getMonth() + 1;
        const currentMonthStr = currentMonth.toString().padStart(2, '0');
        const currentYearStr = now.getFullYear().toString();
        return {
          startDate: `${currentYearStr}-${currentMonthStr}-01`,
          endDate: `${currentYearStr}-${currentMonthStr}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`,
          compare_startDate: `${currentYearStr}-${(currentMonth - 1).toString().padStart(2, '0')}-01`,
          compare_endDate: `${currentYearStr}-${(currentMonth - 1).toString().padStart(2, '0')}-${new Date(now.getFullYear(), now.getMonth(), 0).getDate()}`
        };
      case 'select-period':
        // For select-period, we'll use a simple 28-day period calculation
        const periodStart = new Date(currentYear, 0, 1);
        const firstSunday = new Date(periodStart);
        const dayOfWeek = periodStart.getDay();
        const daysToAdd = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
        firstSunday.setDate(periodStart.getDate() + daysToAdd);
        
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

  // Fetch areas data
  const fetchAreas = async () => {
    try {
      setAreasLoading(true);
      
      // Record start time for minimum loading duration
      const startTime = Date.now();
      
      const response = await dashboardService.getAllAreas();
      setAreas(response.data);
      
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
        area_id: areaFilter !== 'all' ? parseInt(areaFilter) : undefined
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
  }, [timeFilter, areaFilter, selectedYear, selectedPeriod, MIN_LOADING_TIME]);

  // Fetch areas on component mount
  useEffect(() => {
    fetchAreas();
  }, []);

  // Fetch data when filters change
  useEffect(() => {
    fetchKPIData();
  }, [timeFilter, areaFilter, selectedYear, selectedPeriod, fetchKPIData]);

  // KPI Tiles - Dynamic data from API
  const kpiTiles: KPITile[] = useMemo(() => {
    if (!kpiData) {
      // Return empty array when loading - skeleton will be shown instead
      return [];
    }

    const { kpis, summary } = kpiData;
    return [
      {
        title: 'Total Tickets (This Period)',
        value: kpis.totalTicketsThisPeriod,
        change: summary.comparisonMetrics.ticketGrowthRate.percentage,
        changeDescription: summary.comparisonMetrics.ticketGrowthRate.description,
        changeType: summary.comparisonMetrics.ticketGrowthRate.type,
        icon: <AlertTriangle className="h-4 w-4" />,
        color: 'text-blue-600 dark:text-blue-400'
      },
      {
        title: 'Closed Tickets (This Period)',
        value: kpis.closedTicketsThisPeriod,
        change: summary.comparisonMetrics.closureRateImprovement.percentage,
        changeDescription: summary.comparisonMetrics.closureRateImprovement.description,
        changeType: summary.comparisonMetrics.closureRateImprovement.type,
        icon: <CheckCircle className="h-4 w-4" />,
        color: 'text-green-600 dark:text-green-400'
      },
      {
        title: 'Pending Tickets (This Period)',
        value: kpis.pendingTicketsThisPeriod,
        change: kpis.pendingTicketsLastPeriod > 0 
          ? ((kpis.pendingTicketsThisPeriod - kpis.pendingTicketsLastPeriod) / kpis.pendingTicketsLastPeriod) * 100
          : kpis.pendingTicketsThisPeriod > 0 ? 100 : 0,
        changeDescription: kpis.pendingTicketsLastPeriod === 0 && kpis.pendingTicketsThisPeriod === 0 
          ? 'No change (both periods had 0)' 
          : kpis.pendingTicketsLastPeriod === 0 && kpis.pendingTicketsThisPeriod > 0
          ? `New activity (0 → ${kpis.pendingTicketsThisPeriod})`
          : kpis.pendingTicketsThisPeriod === 0 && kpis.pendingTicketsLastPeriod > 0
          ? `Activity stopped (${kpis.pendingTicketsLastPeriod} → 0)`
          : `${((kpis.pendingTicketsThisPeriod - kpis.pendingTicketsLastPeriod) / kpis.pendingTicketsLastPeriod * 100).toFixed(1)}% change`,
        changeType: kpis.pendingTicketsLastPeriod === 0 && kpis.pendingTicketsThisPeriod === 0 
          ? 'no_change'
          : kpis.pendingTicketsLastPeriod === 0 && kpis.pendingTicketsThisPeriod > 0
          ? 'new_activity'
          : kpis.pendingTicketsThisPeriod === 0 && kpis.pendingTicketsLastPeriod > 0
          ? 'activity_stopped'
          : kpis.pendingTicketsThisPeriod > kpis.pendingTicketsLastPeriod ? 'increase' : 'decrease',
        icon: <Clock className="h-4 w-4" />,
        color: 'text-orange-600 dark:text-orange-400'
      },
      {
        title: 'Total Downtime Avoidance',
        value: `${kpis.totalDowntimeAvoidanceThisPeriod.toFixed(1)} hrs`,
        change: summary.comparisonMetrics.downtimeAvoidanceGrowth.percentage,
        changeDescription: summary.comparisonMetrics.downtimeAvoidanceGrowth.description,
        changeType: summary.comparisonMetrics.downtimeAvoidanceGrowth.type,
        icon: <TrendingUp className="h-4 w-4" />,
        color: 'text-purple-600 dark:text-purple-400'
      },
      {
        title: 'Total Cost Avoidance',
        value: formatCurrencyDynamic(kpis.totalCostAvoidanceThisPeriod).display,
        tooltip: formatCurrencyDynamic(kpis.totalCostAvoidanceThisPeriod).tooltip,
        change: summary.comparisonMetrics.costAvoidanceGrowth.percentage,
        changeDescription: summary.comparisonMetrics.costAvoidanceGrowth.description,
        changeType: summary.comparisonMetrics.costAvoidanceGrowth.type,
        icon: <DollarSign className="h-4 w-4" />,
        color: 'text-emerald-600 dark:text-emerald-400'
      }
    ];
  }, [kpiData]);

  // Top Performers - Dynamic data from API
  const topPerformers: TopPerformer[] = useMemo(() => {
    if (!kpiData?.topPerformers) {
      // Return empty array when loading - skeleton will be shown instead
      return [];
    }

    const { topPerformers: apiTopPerformers } = kpiData;
    return [
      {
        name: apiTopPerformers.topReporter?.personName || 'No Data',
        value: apiTopPerformers.topReporter ? `${apiTopPerformers.topReporter.ticketCount} tickets` : '0 tickets',
        department: 'Reporter',
        avatar: getAvatarUrl(apiTopPerformers.topReporter?.avatarUrl)
      },
      {
        name: apiTopPerformers.topCostSaver?.personName || 'No Data',
        value: apiTopPerformers.topCostSaver ? `฿${(apiTopPerformers.topCostSaver.totalSavings! / 1000).toFixed(0)}K saved` : '฿0 saved',
        department: 'Cost Saver',
        avatar: getAvatarUrl(apiTopPerformers.topCostSaver?.avatarUrl)
      },
      {
        name: apiTopPerformers.topDowntimeSaver?.personName || 'No Data',
        value: apiTopPerformers.topDowntimeSaver ? `${apiTopPerformers.topDowntimeSaver.totalDowntimeSaved!.toFixed(1)} hrs saved` : '0 hrs saved',
        department: 'Downtime Saver',
        avatar: getAvatarUrl(apiTopPerformers.topDowntimeSaver?.avatarUrl)
      }
    ];
  }, [kpiData, getAvatarUrl]);

  // Participation Charts Mock Data
  const participationData = useMemo(() => {
    const periods = Array.from({ length: 12 }, (_, i) => `P${i + 1}`);
    return periods.map(period => ({
      period,
      tickets: Math.floor(Math.random() * 50) + 20,
      target: 30,
      uniqueReporters: Math.floor(Math.random() * 15) + 5,
      coverageRate: Math.floor(Math.random() * 40) + 60
    }));
  }, []);

  const areaActivityData = areas.map(area => ({
    area,
    tickets: Math.floor(Math.random() * 100) + 20
  })).sort((a, b) => b.tickets - a.tickets);

  const userActivityData = [
    { id: 'js', user: 'John Smith', tickets: 45, initials: 'JS', bgColor: '#3b82f6', avatar: '/avatars/john.jpg' },
    { id: 'sj', user: 'Sarah Johnson', tickets: 38, initials: 'SJ', bgColor: '#8b5cf6', avatar: '/avatars/sarah.jpeg' },
    { id: 'mc', user: 'Mike Chen', tickets: 32, initials: 'MC', bgColor: '#10b981', avatar: '/avatars/mike.jpg' },
    { id: 'lw', user: 'Lisa Wang', tickets: 28, initials: 'LW', bgColor: '#ec4899', avatar: '/avatars/lisa.jpg' },
    { id: 'dk', user: 'David Kim', tickets: 25, initials: 'DK', bgColor: '#f97316', avatar: '/avatars/david.jpg' },
    { id: 'ed', user: 'Emma Davis', tickets: 22, initials: 'ED', bgColor: '#14b8a6', avatar: '/avatars/emma.jpg' },
    { id: 'tw', user: 'Tom Wilson', tickets: 19, initials: 'TW', bgColor: '#6366f1', avatar: '/avatars/tom.jpg' },
    { id: 'ab', user: 'Anna Brown', tickets: 17, initials: 'AB', bgColor: '#ef4444', avatar: '/avatars/anna.jpg' },
    { id: 'cl', user: 'Chris Lee', tickets: 15, initials: 'CL', bgColor: '#eab308', avatar: '/avatars/chris.jpg' },
    { id: 'mg', user: 'Maria Garcia', tickets: 13, initials: 'MG', bgColor: '#06b6d4', avatar: '/avatars/maria.jpg' }
  ];

  // Impact and Value Charts Mock Data
  const downtimeTrendData = useMemo(() => {
    const periods = Array.from({ length: 12 }, (_, i) => `P${i + 1}`);
    return periods.map(period => ({
      period,
      'Line A': Math.floor(Math.random() * 200) + 100,
      'Line B': Math.floor(Math.random() * 150) + 80,
      'Warehouse': Math.floor(Math.random() * 100) + 50,
      'Utilities': Math.floor(Math.random() * 80) + 30
    }));
  }, []);

  const costAvoidanceData = useMemo(() => {
    const periods = Array.from({ length: 12 }, (_, i) => `P${i + 1}`);
    return periods.map(period => ({
      period,
      costAvoidance: Math.floor(Math.random() * 500000) + 200000,
      costPerCase: Math.floor(Math.random() * 50000) + 20000
    }));
  }, []);

  const downtimeImpactByArea = areas.map(area => ({
    area,
    hours: Math.floor(Math.random() * 500) + 100
  })).sort((a, b) => b.hours - a.hours);

  const costImpactByArea = areas.map(area => ({
    area,
    cost: Math.floor(Math.random() * 1000000) + 200000
  })).sort((a, b) => b.cost - a.cost);

  const downtimeImpactByReporter = userActivityData.slice(0, 10).map(user => ({
    id: user.id,
    reporter: user.user,
    hours: Math.floor(Math.random() * 200) + 50,
    initials: user.initials,
    bgColor: user.bgColor,
    avatar: user.avatar
  })).sort((a, b) => b.hours - a.hours);

  const costImpactByReporter = userActivityData.slice(0, 10).map(user => ({
    id: user.id,
    reporter: user.user,
    cost: Math.floor(Math.random() * 500000) + 100000,
    initials: user.initials,
    bgColor: user.bgColor,
    avatar: user.avatar
  })).sort((a, b) => b.cost - a.cost);

  const failureModes = ['Electrical', 'Mechanical', 'Hydraulic', 'Pneumatic', 'Software', 'Environmental'];
  const downtimeByFailureMode = failureModes.map(mode => ({
    mode,
    downtime: Math.floor(Math.random() * 300) + 50
  })).sort((a, b) => b.downtime - a.downtime);

  const costByFailureMode = failureModes.map(mode => ({
    mode,
    cost: Math.floor(Math.random() * 400000) + 100000
  })).sort((a, b) => b.cost - a.cost);

  // Speed Charts Mock Data
  const resolveDurationData = areas.map(area => ({
    area,
    avgHours: Math.floor(Math.random() * 48) + 8
  })).sort((a, b) => b.avgHours - a.avgHours);

  const closureRateData = areas.map(area => ({
    area,
    closureRate: Math.floor(Math.random() * 30) + 70
  })).sort((a, b) => b.closureRate - a.closureRate);

  // Calendar Heatmap Mock Data (for whole year)
  const calendarData = useMemo(() => {
    const data = [];
    const startDate = new Date(selectedYear, 0, 1); // January 1st of selected year
    const endDate = new Date(selectedYear, 11, 31); // December 31st of selected year
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      data.push({
        date: d.toISOString().split('T')[0],
        count: Math.floor(Math.random() * 20) // Random ticket count 0-19 for 10 levels
      });
    }
    return data;
  }, [selectedYear]);

  return (
    <div className="space-y-6 p-6">
      <style>{`
        .calendar-heatmap-container {
          overflow-x: auto;
        }
        .react-calendar-heatmap .color-empty {
          fill: #ebedf0;
        }
        .react-calendar-heatmap .color-scale-1 {
          fill: #EAFAF3;
        }
        .react-calendar-heatmap .color-scale-2 {
          fill: #C5F1DE;
        }
        .react-calendar-heatmap .color-scale-3 {
          fill: #A0E9C8;
        }
        .react-calendar-heatmap .color-scale-4 {
          fill: #7BE0B2;
        }
        .react-calendar-heatmap .color-scale-5 {
          fill: #56D79D;
        }
        .react-calendar-heatmap .color-scale-6 {
          fill: #30CF87;
        }
        .react-calendar-heatmap .color-scale-7 {
          fill: #28A96E;
        }
        .react-calendar-heatmap .color-scale-8 {
          fill: #1F8457;
        }
        .react-calendar-heatmap .color-scale-9 {
          fill: #165F3E;
        }
        .react-calendar-heatmap .color-scale-10 {
          fill: #0E3A26;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Abnormal Report Dashboard V2</h1>
          <p className="text-muted-foreground">
            Enhanced abnormal finding reporting and analytics dashboard
          </p>
        </div>
      </div>

      {/* Global Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Global Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Time Range</label>
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this-year">This Year</SelectItem>
                  <SelectItem value="last-year">Last Year</SelectItem>
                  <SelectItem value="this-period">This Period</SelectItem>
                  <SelectItem value="select-period">Select Period</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {timeFilter === 'select-period' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Year</label>
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
                  <label className="text-sm font-medium">Period</label>
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
              <label className="text-sm font-medium">Area</label>
              <Select value={areaFilter} onValueChange={setAreaFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={areasLoading ? "Loading areas..." : "Select area"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Areas</SelectItem>
                  {areas.map(area => (
                    <SelectItem key={area.id} value={area.id.toString()}>
                      {area.name} {area.plant_name && `(${area.plant_name})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Error loading data:</span>
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}


      {/* KPI Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {loading ? (
          <KPITileSkeleton count={5} />
        ) : (
          kpiTiles.map((kpi, index) => (
            <Card key={index}>
              <CardContent className="p-6">
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
                        {kpi.changeType === 'new_activity' ? (
                          <div className="h-3 w-3 bg-blue-500 rounded-full mr-1" />
                        ) : kpi.changeType === 'activity_stopped' ? (
                          <div className="h-3 w-3 bg-muted-foreground rounded-full mr-1" />
                        ) : kpi.changeType === 'no_change' ? (
                          <div className="h-3 w-3 bg-muted rounded-full mr-1" />
                        ) : kpi.change > 0 ? (
                          <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                        )}
                        <span className={`text-xs ${
                          kpi.changeType === 'new_activity' ? 'text-blue-500' :
                          kpi.changeType === 'activity_stopped' ? 'text-gray-500' :
                          kpi.changeType === 'no_change' ? 'text-gray-400' :
                          kpi.change > 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {kpi.changeType === 'no_change' ? 'No change' :
                           kpi.changeType === 'new_activity' ? 'New activity' :
                           kpi.changeType === 'activity_stopped' ? 'Stopped' :
                           `${Math.abs(kpi.change).toFixed(1)}%`}
                        </span>
                      </div>
                    )}
                    {kpi.changeDescription && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {kpi.changeDescription}
                      </div>
                    )}
                  </div>
                  <div className={`p-2 rounded-lg bg-muted/50 ${kpi.color}`}>
                    {kpi.icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          <TopPerformersSkeleton count={3} />
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Top Reporter
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarImage src={topPerformers[0]?.avatar} />
                    <AvatarFallback>{topPerformers[0]?.name?.split(' ').map(n => n[0]).join('') || 'N/A'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{topPerformers[0]?.name || 'No Data'}</p>
                    <p className="text-sm text-muted-foreground">{topPerformers[0]?.department || 'Reporter'}</p>
                    <p className="text-lg font-bold text-blue-600">{topPerformers[0]?.value || '0 tickets'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Top Cost Saver
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarImage src={topPerformers[1]?.avatar} />
                    <AvatarFallback>{topPerformers[1]?.name?.split(' ').map(n => n[0]).join('') || 'N/A'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{topPerformers[1]?.name || 'No Data'}</p>
                    <p className="text-sm text-muted-foreground">{topPerformers[1]?.department || 'Cost Saver'}</p>
                    <p className="text-lg font-bold text-emerald-600">{topPerformers[1]?.value || '฿0 saved'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Top Downtime Saver
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarImage src={topPerformers[2]?.avatar} />
                    <AvatarFallback>{topPerformers[2]?.name?.split(' ').map(n => n[0]).join('') || 'N/A'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{topPerformers[2]?.name || 'No Data'}</p>
                    <p className="text-sm text-muted-foreground">{topPerformers[2]?.department || 'Downtime Saver'}</p>
                    <p className="text-lg font-bold text-purple-600">{topPerformers[2]?.value || '0 hrs saved'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Participation Charts */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Participation</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Total Tickets Count Per Period */}
          <Card>
            <CardHeader>
              <CardTitle>Total Tickets Count Per Period</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={participationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="tickets" fill="#8884d8" name="Tickets" />
                  <Line type="monotone" dataKey="target" stroke="#82ca9d" name="Target" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Unique Reporter & Coverage Rate */}
          <Card>
            <CardHeader>
              <CardTitle>Unique Reporter & Coverage Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={participationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <RechartsTooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="uniqueReporters" fill="#8884d8" name="Unique Reporters" />
                  <Bar yAxisId="right" dataKey="coverageRate" fill="#82ca9d" name="Coverage Rate (%)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Who Active (Area) */}
          <Card>
            <CardHeader>
              <CardTitle>Who Active (Area)</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Method 1: Increased height from 300 to 400 */}
              <ResponsiveContainer width="100%" height={400}>
                <BarChart 
                  data={areaActivityData} 
                  layout="vertical" 
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  barCategoryGap={6} // More space between bars
                  barSize={35} // Taller bars
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="area" type="category" width={80} />
                  <RechartsTooltip />
                  <Bar dataKey="tickets" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Who Active (User) */}
          <Card>
            <CardHeader>
              <CardTitle>Who Active (User) - Top 10</CardTitle>
            </CardHeader>
            <CardContent>
              {/* SVG-based avatar implementation */}
              <ResponsiveContainer width="100%" height={Math.max(400, userActivityData.length * 48 + 40)}>
                <BarChart 
                  data={userActivityData} 
                  layout="vertical" 
                  margin={{ top: 12, right: 64, left: 20, bottom: 12 }}
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
                    fill="#82ca9d"
                    radius={[0, 8, 8, 0]} // rounded bar end
                    isAnimationActive
                    animationBegin={0}
                    animationDuration={800}
                  >
                    {/* Value label at end (before avatar) */}
                    <LabelList
                      dataKey="tickets"
                      position="right"
                      offset={36} // leave room for avatar
                      style={{ fill: "#555", fontWeight: 600 }}
                    />
                    {/* Avatar at bar end */}
                    <LabelList content={AvatarLabel({ data: userActivityData, maxAvatar: 36 })} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* When Active - Calendar Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle>When Active - Calendar Heatmap ({selectedYear})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="calendar-heatmap-container">
              <CalendarHeatmap
                startDate={new Date(selectedYear, 0, 1)}
                endDate={new Date(selectedYear, 11, 31)}
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
                titleForValue={(value) => value ? `${value.date}: ${value.count} tickets` : 'No data'}
                showWeekdayLabels={true}
                showMonthLabels={true}
                onClick={(value) => {
                  if (value) {
                    console.log(`Clicked on ${value.date}: ${value.count} tickets`);
                  }
                }}
              />
            </div>
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
        <h2 className="text-2xl font-bold">Impact and Value</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Downtime Avoidance Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Downtime Avoidance Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={downtimeTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Area type="monotone" dataKey="Line A" stackId="1" stroke="#8884d8" fill="#8884d8" />
                  <Area type="monotone" dataKey="Line B" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
                  <Area type="monotone" dataKey="Warehouse" stackId="1" stroke="#ffc658" fill="#ffc658" />
                  <Area type="monotone" dataKey="Utilities" stackId="1" stroke="#ff7300" fill="#ff7300" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Cost Avoidance */}
          <Card>
            <CardHeader>
              <CardTitle>Cost Avoidance</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={costAvoidanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <RechartsTooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="costAvoidance" fill="#8884d8" name="Cost Avoidance (THB)" />
                  <Line yAxisId="right" type="monotone" dataKey="costPerCase" stroke="#82ca9d" name="Cost per Case (THB/Case)" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Downtime Impact Leaderboard (Area) */}
          <Card>
            <CardHeader>
              <CardTitle>Downtime Impact Leaderboard (Area)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={downtimeImpactByArea} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="area" type="category" width={80} />
                  <RechartsTooltip />
                  <Bar dataKey="hours" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Cost Impact Leaderboard (Area) */}
          <Card>
            <CardHeader>
              <CardTitle>Cost Impact Leaderboard (Area)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={costImpactByArea} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="area" type="category" width={80} />
                  <RechartsTooltip />
                  <Bar dataKey="cost" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Downtime Impact Leaderboard (Reporter) */}
          <Card>
            <CardHeader>
              <CardTitle>Downtime Impact Leaderboard (Reporter) - Top 10</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(400, downtimeImpactByReporter.length * 48 + 40)}>
                <BarChart 
                  data={downtimeImpactByReporter} 
                  layout="vertical" 
                  margin={{ top: 12, right: 64, left: 20, bottom: 12 }}
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
                    fill="#8884d8"
                    radius={[0, 8, 8, 0]}
                    isAnimationActive
                    animationBegin={0}
                    animationDuration={800}
                  >
                    <LabelList
                      dataKey="hours"
                      position="right"
                      offset={36}
                      style={{ fill: "#555", fontWeight: 600 }}
                    />
                    <LabelList content={AvatarLabel({ data: downtimeImpactByReporter, maxAvatar: 28 })} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Cost Impact Leaderboard (Reporter) */}
          <Card>
            <CardHeader>
              <CardTitle>Cost Impact Leaderboard (Reporter) - Top 10</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(400, costImpactByReporter.length * 48 + 40)}>
                <BarChart 
                  data={costImpactByReporter} 
                  layout="vertical" 
                  margin={{ top: 12, right: 64, left: 20, bottom: 12 }}
                  barCategoryGap={6}
                >
                  <CartesianGrid horizontal vertical={false} strokeDasharray="3 3" />
                  <XAxis 
                    type="number" 
                    domain={[0, 'dataMax + 50000']}
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
                    fill="#82ca9d"
                    radius={[0, 8, 8, 0]}
                    isAnimationActive
                    animationBegin={0}
                    animationDuration={800}
                  >
                    <LabelList
                      dataKey="cost"
                      position="right"
                      offset={36}
                      style={{ fill: "#555", fontWeight: 600 }}
                      formatter={(value: any) => `฿${(Number(value) / 1000).toFixed(0)}K`}
                    />
                    <LabelList content={AvatarLabel({ data: costImpactByReporter, maxAvatar: 28 })} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Downtime Impact by Failure Mode */}
          <Card>
            <CardHeader>
              <CardTitle>Downtime Impact by Failure Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={downtimeByFailureMode}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mode" />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="downtime" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Cost Impact by Failure Mode */}
          <Card>
            <CardHeader>
              <CardTitle>Cost Impact by Failure Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={costByFailureMode}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mode" />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="cost" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Speed Charts */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Speed</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ticket Average Resolve Duration */}
          <Card>
            <CardHeader>
              <CardTitle>Ticket Average Resolve Duration/Case</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={resolveDurationData} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="area" type="category" width={80} />
                  <RechartsTooltip />
                  <Bar dataKey="avgHours" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Closure Rate */}
          <Card>
            <CardHeader>
              <CardTitle>Closure Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={closureRateData} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="area" type="category" width={80} />
                  <RechartsTooltip />
                  <Bar dataKey="closureRate" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AbnormalReportDashboardV2Page;
