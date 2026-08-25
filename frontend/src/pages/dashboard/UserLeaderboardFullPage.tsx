import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  LabelList,
} from 'recharts';
import { AlertTriangle } from 'lucide-react';
import dashboardService, { type UserActivityDataPoint } from '@/services/dashboardService';
import { useLanguage } from '@/contexts/LanguageContext';
import { getAvatarUrl } from '@/utils/url';

type LeaderboardType = 'reporter' | 'closer';

type FilterSummary = {
  startDate: string;
  endDate: string;
  plant: string | null;
  area: string | null;
};

type AvatarUser = {
  id: string | number;
  avatar?: string;
  bgColor?: string;
  initials?: string;
};

type BarLabelProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  index?: number;
};

type ChartTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload: UserActivityDataPoint }>;
};

const UserTooltip = ({
  active,
  payload,
  ticketLabel,
}: ChartTooltipProps & { ticketLabel: string }) => {
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
          <span className="font-medium">{data.tickets}</span> {ticketLabel}
        </p>
      </div>
    );
  }
  return null;
};

const SVGAvatar: React.FC<{
  x: number;
  y: number;
  size: number;
  user: AvatarUser;
  clipPrefix?: string;
}> = ({ x, y, size, user, clipPrefix = '' }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (user.avatar && !imageLoaded && !imageError) {
      const timeout = setTimeout(() => {
        setImageError(true);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [user.avatar, imageLoaded, imageError]);

  const clipId = `clip-avatar-${clipPrefix}${user.id}`;
  const cx = x + size / 2;
  const cy = y + size / 2;

  return (
    <g>
      <defs>
        <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
          <circle cx={cx} cy={cy} r={size / 2} />
        </clipPath>
      </defs>
      <circle
        cx={cx}
        cy={cy}
        r={size / 2}
        fill={user.bgColor}
        stroke="rgba(255,255,255,0.8)"
        strokeWidth="1"
      />
      {(!imageLoaded || imageError) && (
        <text
          x={cx}
          y={cy}
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
      {!imageError && (
        <image
          href={user.avatar}
          x={x}
          y={y}
          width={size}
          height={size}
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
      <circle
        cx={cx}
        cy={cy}
        r={size / 2}
        fill="none"
        stroke="rgba(0,0,0,0.15)"
        strokeWidth="1"
      />
    </g>
  );
};

const AvatarLabel = ({ data, maxAvatar = 36, clipPrefix = '' }: { data: AvatarUser[]; maxAvatar?: number; clipPrefix?: string }) => {
  return (props: BarLabelProps) => {
    const { x = 0, y = 0, width = 0, height = 0, index = 0 } = props;
    const row = data[index];
    if (!row) return null;

    const size = Math.min(maxAvatar, Math.max(18, Math.floor(height * 0.8)));
    const avatarX = x + width + 6;
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

const parseLeaderboardType = (value: string | null): LeaderboardType | null => {
  if (value === 'reporter' || value === 'closer') return value;
  return null;
};

const UserLeaderboardFullPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const [data, setData] = useState<UserActivityDataPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterSummary, setFilterSummary] = useState<FilterSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const leaderboardType = parseLeaderboardType(searchParams.get('type'));

  const fetchData = useCallback(async () => {
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const plant = searchParams.get('plant') || undefined;
    const area = searchParams.get('area') || undefined;
    const type = parseLeaderboardType(searchParams.get('type'));

    if (!type) {
      setError('Missing chart type. Open this page from the dashboard "See more" button.');
      setLoading(false);
      setData([]);
      return;
    }

    if (!startDate || !endDate) {
      setError('Missing date range. Open this page from the dashboard "See more" button.');
      setLoading(false);
      setData([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const params = {
        startDate,
        endDate,
        plant: plant && plant !== 'all' ? plant : undefined,
        area: area && area !== 'all' ? area : undefined,
        limit: 'all' as const,
      };

      if (type === 'reporter') {
        const response = await dashboardService.getUserActivityData(params);
        if (response.success) {
          setData(response.data.userActivityData);
          setFilterSummary(response.data.summary.appliedFilters);
        } else {
          setData([]);
        }
      } else {
        const response = await dashboardService.getUserCloserActivity(params);
        if (response.success) {
          setData(response.data.userCloserActivityData);
          setFilterSummary(response.data.summary.appliedFilters);
        } else {
          setData([]);
        }
      }
    } catch (err) {
      console.error('Error fetching user leaderboard data:', err);
      setData([]);
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const chartData = useMemo(
    () => data.map((item) => ({ ...item, avatar: getAvatarUrl(item.avatar) })),
    [data]
  );

  const formatFilterLabel = () => {
    if (!filterSummary) return null;
    const parts: string[] = [];
    parts.push(`${filterSummary.startDate} – ${filterSummary.endDate}`);
    if (filterSummary.plant && filterSummary.plant !== 'all') {
      parts.push(`${t('dashboard.plant')}: ${filterSummary.plant}`);
    } else {
      parts.push(`${t('dashboard.plant')}: ${t('dashboard.allPlants')}`);
    }
    if (filterSummary.area && filterSummary.area !== 'all') {
      parts.push(`${t('dashboard.area')}: ${filterSummary.area}`);
    } else {
      parts.push(`${t('dashboard.area')}: ${t('dashboard.allAreas')}`);
    }
    return parts.join(' · ');
  };

  const titleKey = leaderboardType === 'closer'
    ? 'dashboard.whoCloseTicketsFull'
    : 'dashboard.whoOpenTicketsFull';
  const ticketLabel = leaderboardType === 'closer'
    ? t('dashboard.ticketsFinished')
    : t('dashboard.ticketsReported');

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        {filterSummary && (
          <p className="text-sm text-muted-foreground" data-testid="user-leaderboard-filter-summary">
            {formatFilterLabel()}
          </p>
        )}
        <Card>
          <CardHeader>
            <CardTitle>{t(titleKey)}</CardTitle>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mb-2" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mb-2" />
                <p className="text-sm font-medium">No Data Available</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(450, chartData.length * 48 + 60)}>
                <BarChart
                  data={chartData}
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
                    content={<UserTooltip ticketLabel={ticketLabel} />}
                    cursor={{ fillOpacity: 0.06 }}
                  />
                  <Bar
                    dataKey="tickets"
                    fill="hsl(var(--accent))"
                    radius={[0, 8, 8, 0]}
                    isAnimationActive
                    animationBegin={0}
                    animationDuration={800}
                  >
                    <LabelList
                      dataKey="tickets"
                      position="right"
                      offset={50}
                      style={{ fill: '#555', fontWeight: 600 }}
                    />
                    <LabelList content={AvatarLabel({ data: chartData, maxAvatar: 36, clipPrefix: 'user-leaderboard-' })} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserLeaderboardFullPage;
