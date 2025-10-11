import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { workRequestService } from '@/services/workRequestService';

const WorkRequestDetailsPage: React.FC = () => {
  const { wrId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!wrId) return;
      try {
        setLoading(true);
        const res = await workRequestService.getById(Number(wrId));
        const payload = res?.data || res;
        setData(payload);
        const wrCode = payload?.wrCode || payload?.allFields?.WRCODE || `WR-${wrId}`;
        // Ensure breadcrumb shows WR code; replace state so back nav works
        navigate(location.pathname, { replace: true, state: { breadcrumbExtra: wrCode } });
      } catch (e: any) {
        setError(e.message || 'Failed to load work request');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [wrId]);
  const wrCode = data?.wrCode || data?.allFields?.WRCODE || `WR-${wrId}`;

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

  // Normalize fields from top-level or nested raw DB record at data.allFields
  const raw = (data?.allFields || {}) as any;
  const view = data ? {
    id: data.id ?? raw.WRNO,
    code: data.wrCode ?? raw.WRCODE,
    description: data.description ?? raw.WRDESC,
    date: data.date ?? raw.WRDATE,
    time: data.time ?? raw.WRTIME,
    requester: {
      name: data.requester?.name ?? raw.REQUESTERNAME,
      phone: data.requester?.phone ?? raw.REQ_PHONE,
      email: data.requester?.email ?? raw.REQ_Email,
      requestDate: data.requester?.requestDate ?? raw.DATE_REQ,
      requestTime: data.requester?.requestTime ?? raw.Time_REQ,
    },
    status: {
      name: data.status?.name ?? raw.WRSTATUSNAME,
      code: data.status?.code ?? raw.WRSTATUSCODE,
      workflow: data.status?.workflowStatus ?? raw.WFStatusCode,
    },
    urgency: {
      name: data.urgency?.name ?? raw.WRURGENTNAME,
      code: data.urgency?.code ?? raw.WRURGENTCODE,
    },
    requestType: {
      name: data.requestType?.name ?? raw.RequestTypeName,
      code: data.requestType?.code ?? raw.RequestTypeCode,
    },
    wrType: {
      name: data.wrType?.name ?? raw.WRTypeName,
      code: data.wrType?.code ?? raw.WRTypeCode,
    },
    budgetCost: data.budgetCost ?? raw.BudgetCost,
    equipment: {
      id: data.equipment?.id ?? raw.EQNO,
      code: data.equipment?.code ?? raw.EQCODE,
      name: data.equipment?.name ?? raw.EQNAME,
    },
    productionUnit: {
      id: data.productionUnit?.id ?? raw.PUNO,
      code: data.productionUnit?.code ?? raw.PUCODE,
      name: data.productionUnit?.name ?? raw.PUNAME,
    },
    site: {
      id: data.site?.id ?? raw.SiteNo,
      code: data.site?.code ?? raw.SITECODE,
      name: data.site?.name ?? raw.SITENAME,
    },
    departments: {
      requesting: { code: data.departments?.requesting?.code ?? raw.REQ_DEPTCODE, name: data.departments?.requesting?.name ?? raw.REQ_DEPTNAME },
      receiving: { code: data.departments?.receiving?.code ?? raw.REC_DEPTCODE, name: data.departments?.receiving?.name ?? raw.REC_DEPTNAME },
    },
    notes: {
      remark: data.remark ?? raw.REMARK,
      note: data.note ?? raw.Note,
      info: raw.INFONOTE,
      cancelNote: raw.CENCELNOTE || raw.CENCELNOTEM || raw.CENCELNOTEC,
    },
    safety: {
      hotWork: raw.HotWork === 'T',
      confineSpace: raw.ConfineSpace === 'T',
      workAtHeight: raw.WorkAtHeight === 'T',
      lockOutTagOut: raw.LockOutTagOut === 'T',
      safety: raw.FlagSafety === 'T',
      environment: raw.FlagEnvironment === 'T',
    },
    downtime: {
      startDate: raw.DT_Start_D,
      startTime: raw.DT_Start_T,
      finishDate: raw.DT_Finish_D,
      finishTime: raw.DT_Finish_T,
      duration: raw.DT_Duration,
    },
    schedule: {
      startDate: raw.SCH_START_D,
      startTime: raw.SCH_START_T,
      finishDate: raw.SCH_FINISH_D,
      finishTime: raw.SCH_FINISH_T,
      duration: raw.SCH_DURATION,
    },
    approvals: {
      approvedDate: raw.APPROVEDATE,
      approvedTime: raw.APPROVETIME,
      approvedBy: raw.APPROVEBY,
      approveFlags: { planner: raw.FLAGAPPROVE, manager: raw.FLAGAPPROVEM, committee: raw.FLAGAPPROVEC },
      notApproved: raw.FlagNotApproved === 'T',
    },
    flags: {
      deleted: raw.FLAGDEL === 'T',
      history: raw.FLAGHIS === 'T',
      cancel: raw.FLAGCANCEL === 'T',
      waitStatus: raw.FlagWaitStatus === 'T',
      safety: raw.FlagSafety === 'T',
      environment: raw.FlagEnvironment === 'T',
    },
    identifiers: {
      wrNo: raw.WRNO,
      woNo: raw.WONO,
      eqNo: raw.EQNO,
      puNo: raw.PUNO,
      siteNo: raw.SiteNo,
    },
    workflow: {
      stepNodeNo: raw.WFNODENO,
      eqTypeNo: raw.EQTypeNo,
    },
    image: raw.IMG,
  } : null;

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader title={wrCode} description="Work Request Details" showBackButton onBack={() => navigate('/maintenance/work-requests')} />

      {error && <div className="text-red-500 text-sm">{error}</div>}
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : data ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left column: description + notes */}
          <div className="space-y-4 lg:col-span-2">
            <Card className="p-4 space-y-2">
              <div className="text-sm text-muted-foreground">Description</div>
              <div className="text-base whitespace-pre-wrap">{view?.description || '-'}</div>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4 space-y-2">
                <div className="text-sm text-muted-foreground">Requester</div>
                <Row label="Name" value={view?.requester.name} />
                <Row label="Phone" value={view?.requester.phone} />
                <Row label="Email" value={view?.requester.email} />
                <Row label="Requested" value={fmtDateTime(view?.requester.requestDate, view?.requester.requestTime)} />
              </Card>
              <Card className="p-4 space-y-2">
                <div className="text-sm text-muted-foreground">Assets</div>
                <Row label="Equipment" value={(view?.equipment.code || view?.equipment.id) ? (<span>{view?.equipment.code || view?.equipment.id} {view?.equipment.name ? `- ${view?.equipment.name}` : ''}</span>) : '-'} />
                <Row label="PU" value={(view?.productionUnit.code || view?.productionUnit.id) ? (<span>{view?.productionUnit.code || view?.productionUnit.id} {view?.productionUnit.name ? `- ${view?.productionUnit.name}` : ''}</span>) : '-'} />
                <Row label="Site" value={(view?.site.code || view?.site.name) ? (<span>{view?.site.code || ''} {view?.site.name ? `- ${view?.site.name}` : ''}</span>) : '-'} />
              </Card>
              <Card className="p-4 space-y-2 md:col-span-2">
                <div className="text-sm text-muted-foreground">Departments</div>
                <Row label="Requesting" value={(view?.departments.requesting.code || view?.departments.requesting.name) ? (<span>{view?.departments.requesting.code || ''} {view?.departments.requesting.name ? `- ${view?.departments.requesting.name}` : ''}</span>) : '-'} />
                <Row label="Receiving" value={(view?.departments.receiving.code || view?.departments.receiving.name) ? (<span>{view?.departments.receiving.code || ''} {view?.departments.receiving.name ? `- ${view?.departments.receiving.name}` : ''}</span>) : '-'} />
              </Card>
              {view?.notes.remark || view?.notes.note || view?.notes.info ? (
                <Card className="p-4 space-y-2 md:col-span-2">
                  <div className="text-sm text-muted-foreground">Notes</div>
                  {view?.notes.remark && <Row label="Remark" value={<span className="whitespace-pre-wrap">{view?.notes.remark}</span>} />}
                  {view?.notes.note && <Row label="Note" value={<span className="whitespace-pre-wrap">{view?.notes.note}</span>} />}
                  {view?.notes.info && <Row label="Info" value={<span className="whitespace-pre-wrap">{view?.notes.info}</span>} />}
                </Card>
              ) : null}
              {data.allFields ? (
                <Card className="p-4 space-y-2 md:col-span-2">
                  <div className="text-sm text-muted-foreground">Raw Record</div>
                  <pre className="text-xs overflow-auto max-h-72 bg-muted/30 p-2 rounded">{JSON.stringify(data.allFields, null, 2)}</pre>
                </Card>
              ) : null}
            </div>
          </div>

          {/* Right column: summary and links */}
          <div className="space-y-4">
            <Card className="p-4 space-y-2">
              <div className="text-sm text-muted-foreground">Summary</div>
              <Row label="Date/Time" value={<span className="font-medium">{fmtDateTime(view?.date, view?.time)}</span>} />
              <Row label="Status" value={<span className="inline-flex items-center gap-2">{view?.status.name || view?.status.code || '-'}{(view?.status.code) && (<Badge variant="secondary">{view?.status.code}</Badge>)}{view?.status.workflow ? <span className="text-xs text-muted-foreground">• {view?.status.workflow}</span> : null}</span>} />
              <Row label="Urgency" value={view?.urgency.name || view?.urgency.code} />
              <Row label="Category" value={view?.requestType.name || view?.requestType.code} />
              <Row label="WR Type" value={view?.wrType.name || view?.wrType.code} />
              <Row label="Budget Cost" value={typeof view?.budgetCost === 'number' ? view?.budgetCost.toLocaleString() : (view?.budgetCost ?? '-')} />
            </Card>
            <Card className="p-4 space-y-2">
              <div className="text-sm text-muted-foreground">Related</div>
              <Row label="Work Order" value={(view?.identifiers.woNo && view?.identifiers.woNo !== 0) ? (
                <Button size="sm" variant="outline" onClick={() => navigate(`/maintenance/work-orders`, { state: { search: view?.identifiers.woNo } })}>WO #{view?.identifiers.woNo}</Button>
              ) : '-'} />
            </Card>
            <Card className="p-4 space-y-2">
              <div className="text-sm text-muted-foreground">Scheduling</div>
              <Row label="Planned" value={fmtDateTime(view?.schedule.startDate, view?.schedule.startTime)} />
              <Row label="Planned End" value={fmtDateTime(view?.schedule.finishDate, view?.schedule.finishTime)} />
              <Row label="Planned Duration" value={view?.schedule.duration} />
            </Card>
            <Card className="p-4 space-y-2">
              <div className="text-sm text-muted-foreground">Downtime</div>
              <Row label="Start" value={fmtDateTime(view?.downtime.startDate, view?.downtime.startTime)} />
              <Row label="Finish" value={fmtDateTime(view?.downtime.finishDate, view?.downtime.finishTime)} />
              <Row label="Duration" value={view?.downtime.duration} />
            </Card>
            <Card className="p-4 space-y-2">
              <div className="text-sm text-muted-foreground">Safety</div>
              <Row label="Hot Work" value={view?.safety.hotWork ? 'Yes' : 'No'} />
              <Row label="Confined Space" value={view?.safety.confineSpace ? 'Yes' : 'No'} />
              <Row label="Work At Height" value={view?.safety.workAtHeight ? 'Yes' : 'No'} />
              <Row label="Lock-Out Tag-Out" value={view?.safety.lockOutTagOut ? 'Yes' : 'No'} />
              <Row label="Safety Flag" value={view?.safety.safety ? 'Yes' : 'No'} />
              <Row label="Environment Flag" value={view?.safety.environment ? 'Yes' : 'No'} />
            </Card>
            <Card className="p-4 space-y-2">
              <div className="text-sm text-muted-foreground">Approvals & Flags</div>
              <Row label="Approved" value={fmtDateTime(view?.approvals.approvedDate, view?.approvals.approvedTime)} />
              <Row label="Approved By" value={view?.approvals.approvedBy} />
              <Row label="Not Approved" value={view?.approvals.notApproved ? 'Yes' : 'No'} />
              <Row label="Flags" value={<span className="text-xs">{Object.entries(view?.flags || {}).filter(([k,v]) => !!v).map(([k]) => k).join(', ') || '-'}</span>} />
            </Card>
            <Card className="p-4 space-y-2">
              <div className="text-sm text-muted-foreground">Identifiers</div>
              <Row label="WR No" value={view?.identifiers.wrNo} />
              <Row label="PU No" value={view?.identifiers.puNo} />
              <Row label="EQ No" value={view?.identifiers.eqNo} />
              <Row label="Site No" value={view?.identifiers.siteNo} />
              <Row label="WF Node" value={view?.workflow.stepNodeNo} />
              <Row label="EQ Type No" value={view?.workflow.eqTypeNo} />
            </Card>
          </div>
        </div>
      ) : (
        <Card className="p-4 text-sm text-muted-foreground">No data</Card>
      )}
    </div>
  );
};

export default WorkRequestDetailsPage;
