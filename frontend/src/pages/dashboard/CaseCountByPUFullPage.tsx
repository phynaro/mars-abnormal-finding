import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell,
} from 'recharts';
import { AlertTriangle } from 'lucide-react';
import dashboardService from '@/services/dashboardService';
import { useLanguage } from '@/contexts/LanguageContext';

const CaseCountByPUFullPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const [data, setData] = useState<Array<{ puno: number; puName: string; caseCount: number }>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterSummary, setFilterSummary] = useState<{ startDate: string; endDate: string; plant: string | null; area: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const plant = searchParams.get('plant') || undefined;
    const area = searchParams.get('area') || undefined;

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
      };
      const response = await dashboardService.getCaseCountByPU(params);
      if (response.success) {
        setData(response.data.caseCountByPUData);
        setFilterSummary(response.data.summary.appliedFilters);
      } else {
        setData([]);
      }
    } catch (err) {
      console.error('Error fetching case count by PU data:', err);
      setData([]);
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBarClick = (payload: { puno: number }) => {
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    if (startDate && endDate) {
      const params = new URLSearchParams({
        startDate,
        endDate,
        puno: payload.puno.toString(),
      });
      window.open(`/tickets?${params.toString()}`, '_blank');
    }
  };

  const formatFilterLabel = () => {
    if (!filterSummary) return null;
    const parts: string[] = [];
    parts.push(`${filterSummary.startDate} – ${filterSummary.endDate}`);
    if (filterSummary.plant) parts.push(`Plant: ${filterSummary.plant}`);
    else parts.push('Plant: All');
    if (filterSummary.area) parts.push(`Area: ${filterSummary.area}`);
    else parts.push('Area: All');
    return parts.join(' · ');
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        {filterSummary && (
          <p className="text-sm text-muted-foreground" data-testid="case-count-by-pu-filter-summary">
            {formatFilterLabel()}
          </p>
        )}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.caseCountByPU')}</CardTitle>
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
            ) : data.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mb-2" />
                <p className="text-sm font-medium">No Data Available</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(450, data.length * 30 + 60)}>
                <BarChart
                  data={data}
                  layout="vertical"
                  margin={{ top: 20, right: 30, left: 20, bottom: 15 }}
                  barCategoryGap={0}
                  barSize={18}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    label={{ value: t('dashboard.caseCount'), position: 'insideBottom', offset: -10 }}
                  />
                  <YAxis dataKey="puName" type="category" width={300} />
                  <RechartsTooltip
                    formatter={(value) => [`${value} ${t('dashboard.tickets')}`, t('dashboard.caseCount')]}
                    labelFormatter={(label) => `PU: ${label}`}
                  />
                  <Bar
                    dataKey="caseCount"
                    fill="hsl(var(--primary))"
                    shape={(props: any) => {
                      const { payload, ...barProps } = props;
                      return (
                        <g>
                          <rect
                            {...barProps}
                            style={{ cursor: 'pointer' }}
                            onClick={() => payload && handleBarClick(payload)}
                          />
                        </g>
                      );
                    }}
                  >
                    {data.map((_, index) => (
                      <Cell key={`cell-${index}`} style={{ cursor: 'pointer' }} />
                    ))}
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

export default CaseCountByPUFullPage;
