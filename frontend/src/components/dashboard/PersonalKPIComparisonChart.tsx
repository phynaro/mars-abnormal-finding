import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { BarChart3, Download } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { PersonalKPIComparisonDataPoint } from '@/types/personalKPIComparison';

export interface PersonalKPIComparisonChartProps {
  data: PersonalKPIComparisonDataPoint[];
  selectedKPI: string;
  loading: boolean;
  error: string | null;
}

const KPI_OPTIONS = [
  { value: 'ticketCountCreated', label: 'dashboard.personalKPIComparison.ticketCountCreated', unit: '' },
  { value: 'ticketCountClosed', label: 'dashboard.personalKPIComparison.ticketCountClosed', unit: '' },
  { value: 'downtimeSavedCreated', label: 'dashboard.personalKPIComparison.downtimeSavedCreated', unit: 'h' },
  { value: 'downtimeSavedAssigned', label: 'dashboard.personalKPIComparison.downtimeSavedAssigned', unit: 'h' },
  { value: 'costSavedCreated', label: 'dashboard.personalKPIComparison.costSavedCreated', unit: '฿' },
  { value: 'costSavedAssigned', label: 'dashboard.personalKPIComparison.costSavedAssigned', unit: '฿' },
  { value: 'ontimePercentage', label: 'dashboard.personalKPIComparison.ontimePercentage', unit: '%' },
  { value: 'avgResolutionHours', label: 'dashboard.personalKPIComparison.avgResolutionHours', unit: 'h' }
];

const PersonalKPIComparisonChart: React.FC<PersonalKPIComparisonChartProps> = ({
  data,
  selectedKPI,
  loading,
  error
}) => {
  const { t } = useLanguage();

  // Get the selected KPI option
  const selectedKPIOption = KPI_OPTIONS.find(option => option.value === selectedKPI);
  const kpiLabel = selectedKPIOption ? t(selectedKPIOption.label) : selectedKPI;
  const kpiUnit = selectedKPIOption?.unit || '';

  // Sort data by selected KPI value in descending order
  const sortedData = React.useMemo(() => {
    return [...data].sort((a, b) => {
      const aValue = a[selectedKPI as keyof PersonalKPIComparisonDataPoint] as number;
      const bValue = b[selectedKPI as keyof PersonalKPIComparisonDataPoint] as number;
      return bValue - aValue;
    });
  }, [data, selectedKPI]);

  // Check if all values for the selected KPI are zero
  const hasNoData = React.useMemo(() => {
    if (sortedData.length === 0) return true;
    return sortedData.every(user => {
      const value = user[selectedKPI as keyof PersonalKPIComparisonDataPoint] as number;
      return value === 0;
    });
  }, [sortedData, selectedKPI]);

  // Format value for display
  const formatValue = (value: number): string => {
    if (selectedKPI === 'costSavedCreated' || selectedKPI === 'costSavedAssigned') {
      // Format currency
      if (value >= 1000000) {
        return `฿${(value / 1000000).toFixed(1)}M`;
      } else if (value >= 1000) {
        return `฿${(value / 1000).toFixed(0)}K`;
      } else {
        return `฿${value.toFixed(0)}`;
      }
    } else if (selectedKPI === 'ontimePercentage') {
      return `${value.toFixed(1)}%`;
    } else if (selectedKPI === 'avgResolutionHours') {
      return `${value.toFixed(1)}h`;
    } else if (selectedKPI === 'downtimeSavedCreated' || selectedKPI === 'downtimeSavedAssigned') {
      return `${value.toFixed(1)}h`;
    } else {
      return value.toString();
    }
  };

  // Export functionality
  const handleExport = () => {
    if (sortedData.length === 0) return;

    // Create CSV content
    const headers = [
      'User',
      'Ticket Count (Created)',
      'Ticket Count (Closed)',
      'Downtime Saved (Created)',
      'Downtime Saved (Assigned)',
      'Cost Saved (Created)',
      'Cost Saved (Assigned)',
      'Ontime Percentage',
      'Average Resolution (Hours)'
    ];

    const csvContent = [
      headers.join(','),
      ...sortedData.map(user => [
        `"${user.personName}"`,
        user.ticketCountCreated,
        user.ticketCountClosed,
        user.downtimeSavedCreated,
        user.downtimeSavedAssigned,
        user.costSavedCreated,
        user.costSavedAssigned,
        user.ontimePercentage,
        user.avgResolutionHours
      ].join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `personal-kpi-comparison-${kpiLabel.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as PersonalKPIComparisonDataPoint;
      const value = data[selectedKPI as keyof PersonalKPIComparisonDataPoint] as number;
      
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={data.avatarUrl} alt={data.personName} />
              <AvatarFallback style={{ backgroundColor: data.bgColor, color: 'white' }} className="font-medium">
                {data.initials}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium">{data.personName}</span>
          </div>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="font-medium">{kpiLabel}:</span> {formatValue(value)}
            </p>
            {/* Show all KPIs in tooltip for context */}
            <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
              <p>{t('dashboard.personalKPIComparison.ticketCountCreated')}: {data.ticketCountCreated}</p>
              <p>{t('dashboard.personalKPIComparison.ticketCountClosed')}: {data.ticketCountClosed}</p>
              <p>{t('dashboard.personalKPIComparison.downtimeSavedCreated')}: {data.downtimeSavedCreated.toFixed(1)}h</p>
              <p>{t('dashboard.personalKPIComparison.downtimeSavedAssigned')}: {data.downtimeSavedAssigned.toFixed(1)}h</p>
              <p>{t('dashboard.personalKPIComparison.costSavedCreated')}: ฿{data.costSavedCreated.toLocaleString()}</p>
              <p>{t('dashboard.personalKPIComparison.costSavedAssigned')}: ฿{data.costSavedAssigned.toLocaleString()}</p>
              <p>{t('dashboard.personalKPIComparison.ontimePercentage')}: {data.ontimePercentage.toFixed(1)}%</p>
              <p>{t('dashboard.personalKPIComparison.avgResolutionHours')}: {data.avgResolutionHours.toFixed(1)}h</p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom label component for values on top of bars
  const CustomLabel = (props: any) => {
    const { x, y, width, value } = props;
    const formattedValue = formatValue(value);
    
    return (
      <text
        x={x + width / 2}
        y={y - 5}
        fill="hsl(var(--foreground))"
        textAnchor="middle"
        fontSize="12"
        fontWeight="500"
      >
        {formattedValue}
      </text>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>{kpiLabel}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled
              className="flex items-center space-x-1"
            >
              <Download className="h-4 w-4" />
              <span>{t('dashboard.personalKPIComparison.export')}</span>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>{kpiLabel}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled
              className="flex items-center space-x-1"
            >
              <Download className="h-4 w-4" />
              <span>{t('dashboard.personalKPIComparison.export')}</span>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px] text-destructive">
            <div className="text-center">
              <p className="font-medium">{t('dashboard.personalKPIComparison.errorLoadingChart')}</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sortedData.length === 0 || hasNoData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>{kpiLabel}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled
              className="flex items-center space-x-1"
            >
              <Download className="h-4 w-4" />
              <span>{t('dashboard.personalKPIComparison.export')}</span>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('dashboard.personalKPIComparison.noDataAvailable')}</p>
              <p className="text-sm">{t('dashboard.personalKPIComparison.noDataDescription')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>{kpiLabel}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="flex items-center space-x-1"
          >
            <Download className="h-4 w-4" />
            <span>{t('dashboard.personalKPIComparison.export')}</span>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={sortedData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 60
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="personName"
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
              fontSize={12}
            />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey={selectedKPI}
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
            >
              <LabelList content={<CustomLabel />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default PersonalKPIComparisonChart;
