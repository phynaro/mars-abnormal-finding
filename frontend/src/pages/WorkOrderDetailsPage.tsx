import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { workOrderService } from '@/services/workOrderService';

const WorkOrderDetailsPage: React.FC = () => {
  const { woId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!woId) return;
      try {
        setLoading(true);
        const res = await workOrderService.getById(Number(woId));
        const payload = res?.data || res;
       // console.log(payload);
        setData(payload);
        const code = payload?.woCode || payload?.allFields?.WOCODE || `WO-${woId}`;
        navigate(location.pathname, { replace: true, state: { breadcrumbExtra: code } });
      } catch (e: any) {
        setError(e.message || 'Failed to load work order');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [woId]);

  const fmtDateTime = (d?: string | null, t?: string | null) => {
    if (!d && !t) return '-';
    return `${d || ''}${t ? ` ${t}` : ''}`.trim();
  };

  const Row: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
    <div className="flex text-sm">
      <div className="w-32 shrink-0 text-muted-foreground">{label}</div>
      <div className="text-foreground">{value ?? '-'}</div>
    </div>
  );

  const raw = (data?.allFields || {}) as any;
  const code = (data?.woCode || raw.WOCODE || `WO-${woId}`);
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader title={code} description="Work Order Details" showBackButton onBack={() => navigate('/maintenance/work-orders')} />

      {error && <div className="text-red-500 text-sm">{error}</div>}
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : data ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left column */}
          <div className="space-y-4 lg:col-span-2">
            <Card className="p-4 space-y-2">
              <div className="text-sm text-muted-foreground">Problem</div>
              <div className="text-base whitespace-pre-wrap">{data.problem ?? raw.WO_PROBLEM ?? '-'}</div>
            </Card>
            {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4 space-y-2">
                <div className="text-sm text-muted-foreground">Plan</div>
                <div className="text-sm whitespace-pre-wrap">{view.plan || '-'}</div>
              </Card>
              <Card className="p-4 space-y-2">
                <div className="text-sm text-muted-foreground">Cause</div>
                <div className="text-sm whitespace-pre-wrap">{view.cause || '-'}</div>
              </Card>
              <Card className="p-4 space-y-2 md:col-span-2">
                <div className="text-sm text-muted-foreground">Action</div>
                <div className="text-sm whitespace-pre-wrap">{view.action || '-'}</div>
              </Card>
              {view.taskProcedure && (
                <Card className="p-4 space-y-2 md:col-span-2">
                  <div className="text-sm text-muted-foreground">Task Procedure</div>
                  <div className="text-sm whitespace-pre-wrap">{view.taskProcedure}</div>
                </Card>
              )}
            </div> */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4 space-y-2">
                <div className="text-sm text-muted-foreground">Requester</div>
                <Row label="Name" value={data.requester?.name ?? raw.RequesterName} />
                <Row label="Phone" value={data.requester?.phone ?? raw.REQ_PHONE} />
                <Row label="Email" value={data.requester?.email ?? raw.REQ_Email} />
              </Card>
              <Card className="p-4 space-y-2">
                <div className="text-sm text-muted-foreground">Assets</div>
                <Row label="Equipment" value={(data.equipment?.code || raw.WOEQCode || raw.EQNO) ? (<span>{data.equipment?.code || raw.WOEQCode || raw.EQNO} {data.equipment?.name || raw.WOEQName ? `- ${data.equipment?.name || raw.WOEQName}` : ''}</span>) : '-'} />
                <Row label="PU" value={(data.productionUnit?.code || raw.PUCODE || raw.PUNO) ? (<span>{data.productionUnit?.code || raw.PUCODE || raw.PUNO} {data.productionUnit?.name || raw.PUNAME ? `- ${data.productionUnit?.name || raw.PUNAME}` : ''}</span>) : '-'} />
                <Row label="Site" value={(data.site?.code || raw.SITECODE || raw.SiteNo) ? (<span>{data.site?.code || raw.SITECODE || raw.SiteNo} {data.site?.name || raw.SITENAME ? `- ${data.site?.name || raw.SITENAME}` : ''}</span>) : '-'} />
              </Card>
              <Card className="p-4 space-y-2">
                <div className="text-sm text-muted-foreground">Department</div>
                <Row label="Department" value={(data.department?.code || raw.DEPTCODE || raw.DEPTNO) ? (<span>{data.department?.code || raw.DEPTCODE || raw.DEPTNO} {data.department?.name || raw.DEPTNAME ? `- ${data.department?.name || raw.DEPTNAME}` : ''}</span>) : '-'} />
              </Card>
            </div>

            <Card className="p-4 space-y-2">
              <div className="text-sm text-muted-foreground">Related</div>
              <Row label="Work Request" value={(data.related?.wrNo || raw.WRNO) ? (
                <Button size="sm" variant="outline" onClick={() => navigate(`/maintenance/work-requests/${data.related?.wrNo || raw.WRNO}`, { state: { breadcrumbExtra: data.related?.wrCode || raw.WRCODE || `WR-${data.related?.wrNo || raw.WRNO}` } })}>
                  {data.related?.wrCode || raw.WRCODE || `WR-${data.related?.wrNo || raw.WRNO}`}
                </Button>
              ) : '-'} />
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            <Card className="p-4 space-y-2">
              <div className="text-sm text-muted-foreground">Summary</div>
              <Row label="Date/Time" value={<span className="font-medium">{fmtDateTime(data.date || raw.WODATE, data.time || raw.WOTIME)}</span>} />
              <Row label="Status" value={<span className="inline-flex items-center gap-2">{data.status?.name || raw.WOSTATUSNAME || data.status?.code || raw.WOSTATUSCODE || '-'}{(data.status?.code || raw.WOSTATUSCODE) && (<Badge variant="secondary">{data.status?.code || raw.WOSTATUSCODE}</Badge>)}{(data.status?.workflowStatus || raw.WFStatusCode) ? <span className="text-xs text-muted-foreground">• {data.status?.workflowStatus || raw.WFStatusCode}</span> : null}</span>} />
              <Row label="Type" value={(data.type?.code || raw.WOTYPECODE) ? `${data.type?.code || raw.WOTYPECODE}${(data.type?.name || raw.WOTYPENAME) ? ` - ${data.type?.name || raw.WOTYPENAME}` : ''}` : (data.type?.name || raw.WOTYPENAME || '-')} />
              <Row label="Priority" value={data.priority?.name || raw.PRIORITYNAME || data.priority?.code || raw.PRIORITYCODE || '-'} />
              <Row label="Created" value={data.createdDate || raw.CREATEDATE} />
              <Row label="Updated" value={data.updatedDate || raw.UPDATEDATE} />
            </Card>
            <Card className="p-4 space-y-2">
              <div className="text-sm text-muted-foreground">Planned Schedule</div>
              <Row label="Start" value={fmtDateTime(data.schedule?.startDate || raw.SCH_START_D, data.schedule?.startTime || raw.SCH_START_T)} />
              <Row label="Finish" value={fmtDateTime(data.schedule?.finishDate || raw.SCH_FINISH_D, data.schedule?.finishTime || raw.SCH_FINISH_T)} />
              <Row label="Duration" value={data.schedule?.duration ?? raw.SCH_DURATION} />
            </Card>
            <Card className="p-4 space-y-2">
              <div className="text-sm text-muted-foreground">Actual</div>
              <Row label="Start" value={fmtDateTime(data.actual?.startDate || raw.ACT_START_D, data.actual?.startTime || raw.ACT_START_T)} />
              <Row label="Finish" value={fmtDateTime(data.actual?.finishDate || raw.ACT_FINISH_D, data.actual?.finishTime || raw.ACT_FINISH_T)} />
              <Row label="Duration" value={data.actual?.duration ?? raw.ACT_DURATION} />
            </Card>
            <Card className="p-4 space-y-2">
              <div className="text-sm text-muted-foreground">Downtime</div>
              <Row label="Start" value={fmtDateTime(raw.DT_Start_D, raw.DT_Start_T)} />
              <Row label="Finish" value={fmtDateTime(raw.DT_Finish_D, raw.DT_Finish_T)} />
              <Row label="Duration" value={raw.DT_Duration} />
            </Card>
            <Card className="p-4 space-y-2">
              <div className="text-sm text-muted-foreground">Safety</div>
              <Row label="Hot Work" value={(data.safety?.hotWork ?? (raw.HotWork === 'T')) ? 'Yes' : 'No'} />
              <Row label="Confined Space" value={(data.safety?.confineSpace ?? (raw.ConfineSpace === 'T')) ? 'Yes' : 'No'} />
              <Row label="Work At Height" value={(data.safety?.workAtHeight ?? (raw.WorkAtHeight === 'T')) ? 'Yes' : 'No'} />
              <Row label="Lock-Out Tag-Out" value={(data.safety?.lockOutTagOut ?? (raw.LockOutTagOut === 'T')) ? 'Yes' : 'No'} />
              <Row label="Safety Flag" value={(data.safety?.safety ?? (raw.FlagSafety === 'T')) ? 'Yes' : 'No'} />
              <Row label="Environment Flag" value={(data.safety?.environment ?? (raw.FlagEnvironment === 'T')) ? 'Yes' : 'No'} />
            </Card>
            <Card className="p-4 space-y-2">
              <div className="text-sm text-muted-foreground">Costs</div>
              <Row label="Planned Man-Hours" value={data.costs?.plannedManHours ?? raw.PlanMHAmountOfQtyMinute} />
              <Row label="Actual Man-Hours" value={data.costs?.actualManHours ?? raw.ActMHAmountOfQtyMinute} />
              <Row label="Planned Materials" value={data.costs?.plannedMaterials ?? raw.PlanMTAmountOfCost} />
              <Row label="Actual Materials" value={data.costs?.actualMaterials ?? raw.ActMTAmountOfCost} />
            </Card>
            {(data.evaluation || raw.HasEvaluate) && (
              <Card className="p-4 space-y-2">
                <div className="text-sm text-muted-foreground">Evaluation</div>
                <Row label="Has Evaluate" value={(data.evaluation?.hasEvaluate ?? (raw.HasEvaluate === 'T')) ? 'Yes' : 'No'} />
                <Row label="Date/Time" value={fmtDateTime(data.evaluation?.date || raw.EvaluateDate, data.evaluation?.time || raw.EvaluateTime)} />
                <Row label="Note" value={data.evaluation?.note ?? raw.EvaluateNote} />
              </Card>
            )}
          </div>
        </div>
      ) : (
        <Card className="p-4 text-sm text-muted-foreground">No data</Card>
      )}
    </div>
  );
};

export default WorkOrderDetailsPage;
