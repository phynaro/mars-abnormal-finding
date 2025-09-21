import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import backlogService, { type BacklogDetailItem, type BacklogDetailResponse } from '@/services/backlogService';

type Mode = 'department' | 'user';

const DashboardBacklogDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ deptCode?: string; personName?: string }>();

  const mode: Mode = params.deptCode ? 'department' : 'user';
  const key = params.deptCode || params.personName || '';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<BacklogDetailItem[]>([]);
  const [summary, setSummary] = useState<BacklogDetailResponse['data']['summary'] | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        if (mode === 'department') {
          const res = await backlogService.getBacklogAssignLv1({ siteNo: 3, deptCode: key });
          setDetails(res.data.details || []);
          setSummary(res.data.summary);
        } else {
          const res = await backlogService.getBacklogAssignToLv1({ siteNo: 3, personName: key });
          setDetails(res.data.details || []);
          setSummary(res.data.summary);
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load details');
        setDetails([]);
        setSummary(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [mode, key]);

  const columns = useMemo(() => {
    const first = details[0];
    if (!first) return [] as string[];
    return Object.keys(first);
  }, [details]);

  const formatValue = (v: any) => {
    if (v === null || v === undefined || v === '') return '-';
    return String(v);
  };

  const title = mode === 'department' ? `Backlog Detail - Department: ${key}` : `Backlog Detail - User: ${key}`;

  const goBack = () => {
    // Try browser back first; if it lands outside app, go to list
    if ((window.history?.length || 0) > 1) navigate(-1);
    else navigate('/dashboard/backlog');
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <PageHeader title={title} description={summary ? `Total WOs: ${summary.totalWorkOrders}` : ''} />
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={goBack}>Back</Button>
          <Button variant="ghost" onClick={() => navigate('/dashboard/backlog')}>Back to Backlog</Button>
        </div>
      </div>

      {summary && (
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Site: {summary.siteNo}</div>
          {mode === 'department' && summary.department && <div className="text-sm">Department: {summary.department}</div>}
          {mode === 'user' && summary.personName && <div className="text-sm">User: {summary.personName}</div>}
        </Card>
      )}

      {error && <div className="text-red-500 text-sm">{error}</div>}
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : (
        <>
          {/* Desktop: dynamic wide table */}
          <div className="hidden lg:block overflow-x-auto rounded border">
            <table className="min-w-full text-xs">
              <thead className="bg-muted/50 text-left">
                <tr>
                  {columns.map(col => (
                    <th key={col} className="px-3 py-2 whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {details.map((row, idx) => (
                  <tr key={idx} className="border-t">
                    {columns.map(col => (
                      <td key={col} className="px-3 py-2 whitespace-nowrap">{formatValue((row as any)[col])}</td>
                    ))}
                  </tr>
                ))}
                {!details.length && (
                  <tr><td className="px-4 py-6 text-center text-muted-foreground" colSpan={columns.length || 1}>No data</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards with key-value pairs */}
          <div className="grid grid-cols-1 gap-3 lg:hidden">
            {details.map((row, idx) => (
              <Card key={idx} className="p-4">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {columns.map(col => (
                    <React.Fragment key={col}>
                      <div className="text-[11px] text-muted-foreground">{col}</div>
                      <div className="text-[12px]">{formatValue((row as any)[col])}</div>
                    </React.Fragment>
                  ))}
                </div>
              </Card>
            ))}
            {!details.length && (
              <div className="text-sm text-muted-foreground">No data</div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardBacklogDetailPage;
