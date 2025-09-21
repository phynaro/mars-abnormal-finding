import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { workRequestService } from '@/services/workRequestService';
import { useToast } from '@/hooks/useToast';

interface Option { id: number | string; code?: string | null; name: string | null; }

const StatusPill: React.FC<{ name?: string | null; code?: string | null }>
  = ({ name, code }) => {
  const color = (code || '').toString();
  const cls = color === '80' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    : color === '95' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    : color === '10' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
    : 'bg-muted text-foreground';
  return <span className={`text-xs px-2 py-0.5 rounded ${cls}`}>{name || code || 'N/A'}</span>;
};

const WorkRequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    status: '',
    urgency: '',
    requestType: '',
    search: '',
    startDate: '',
    endDate: '',
  });

  const [statusOptions, setStatusOptions] = useState<Option[]>([]);
  const [urgencyOptions, setUrgencyOptions] = useState<Option[]>([]);
  const [typeOptions, setTypeOptions] = useState<Option[]>([]);

  const [rows, setRows] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;
  const { toast } = useToast();
  const [createForm, setCreateForm] = useState({
    description: '',
    urgencyId: '' as string | number,
    requestTypeId: '' as string | number,
    phoneNumber: '',
    remark: '',
    note: '',
    budgetCost: '',
    meterNumber: '',
    meterReading: '',
    requestDate: '',
    requestTime: '',
    scheduledStartDate: '',
    scheduledStartTime: '',
    // Safety flags
    hotWork: false,
    confineSpace: false,
    workAtHeight: false,
    lockOutTagOut: false,
    flagSafety: false,
    flagEnvironment: false,
    // Additional flags
    flagPU: false,
    flagTPM: false,
    flagEQ: false,
    // Additional fields
    text1: '',
    equipmentCode: '',
    productionUnitId: '',
    equipmentId: '',
    costCenterId: '',
    failureModeId: '',
    symptomId: '',
    tpmId: '',
    sjId: '',
    taskId: '',
    eqCompNo: '',
    requestor: ''
  });
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [st, ur, ct] = await Promise.all([
          workRequestService.getStatuses(),
          workRequestService.getUrgencies(),
          workRequestService.getCategories(),
        ]);
        const extractArray = (res: any) => Array.isArray(res)
          ? res
          : Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res?.data?.data)
              ? res.data.data
              : [];
        setStatusOptions(extractArray(st));
        setUrgencyOptions(extractArray(ur));
        setTypeOptions(extractArray(ct));
      } catch (e) {
        // ignore lookup errors for now
      }
    };
    loadLookups();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await workRequestService.getAll({
          page: filters.page,
          limit: filters.limit,
          status: filters.status || undefined,
          urgency: filters.urgency || undefined,
          requestType: filters.requestType || undefined,
          search: filters.search || undefined,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
        });
        const extractPayload = (r: any) => {
          if (r?.data?.workRequests) return r.data;
          if (r?.data?.data?.workRequests) return r.data.data;
          if (r?.workRequests) return r;
          return { workRequests: [], pagination: r?.data?.pagination || r?.pagination || { page: 1, totalPages: 1 } };
        };
        const payload = extractPayload(res);
        const list = Array.isArray(payload.workRequests)
          ? payload.workRequests
          : (payload.workRequests && typeof payload.workRequests === 'object')
            ? Object.values(payload.workRequests)
            : Array.isArray(payload.data)
              ? payload.data
              : [];
        setRows(list);
        const pgn = payload.pagination || res?.data?.pagination || {};
        setPage(Number(pgn.page) || 1);
        setPages(Number(pgn.totalPages || pgn.pages) || 1);
      } catch (e: any) {
        setError(e.message || 'Failed to load work requests');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [filters.page, filters.limit, filters.status, filters.urgency, filters.requestType, filters.search, filters.startDate, filters.endDate]);

  const onFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const onPageChange = (next: number) => setFilters(prev => ({ ...prev, page: next }));

  // Wizard navigation functions
  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const resetWizard = () => {
    setCurrentStep(1);
    setCreateForm({
      description: '',
      urgencyId: '' as string | number,
      requestTypeId: '' as string | number,
      phoneNumber: '',
      remark: '',
      note: '',
      budgetCost: '',
      meterNumber: '',
      meterReading: '',
      requestDate: '',
      requestTime: '',
      scheduledStartDate: '',
      scheduledStartTime: '',
      hotWork: false,
      confineSpace: false,
      workAtHeight: false,
      lockOutTagOut: false,
      flagSafety: false,
      flagEnvironment: false,
      flagPU: false,
      flagTPM: false,
      flagEQ: false,
      text1: '',
      equipmentCode: '',
      productionUnitId: '',
      equipmentId: '',
      costCenterId: '',
      failureModeId: '',
      symptomId: '',
      tpmId: '',
      sjId: '',
      taskId: '',
      eqCompNo: '',
      requestor: ''
    });
    setCreateErrors({});
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader 
        title="Work Requests" 
        description="Browse and filter maintenance work requests"
        actionButton={{
          label: 'Create Work Request',
          icon: 'Plus',
          onClick: () => setCreateOpen(true),
        }}
      />

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <Input placeholder="Search code/description/requester" value={filters.search} onChange={(e) => onFilterChange('search', e.target.value)} />

        <Select value={filters.status || 'all'} onValueChange={(v) => onFilterChange('status', v === 'all' ? '' : v)}>
          <SelectTrigger>
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statusOptions.map(o => (
              <SelectItem key={String(o.id)} value={String(o.id)}>{o.name || o.code}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.urgency || 'all'} onValueChange={(v) => onFilterChange('urgency', v === 'all' ? '' : v)}>
          <SelectTrigger>
            <SelectValue placeholder="All Urgencies" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Urgencies</SelectItem>
            {urgencyOptions.map(o => (
              <SelectItem key={String(o.id)} value={String(o.id)}>{o.name || o.code}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.requestType || 'all'} onValueChange={(v) => onFilterChange('requestType', v === 'all' ? '' : v)}>
          <SelectTrigger>
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {typeOptions.map(o => (
              <SelectItem key={String(o.id)} value={String(o.id)}>{o.name || o.code}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Input type="date" value={filters.startDate} onChange={(e) => onFilterChange('startDate', e.target.value)} />
          <span className="text-xs text-muted-foreground">to</span>
          <Input type="date" value={filters.endDate} onChange={(e) => onFilterChange('endDate', e.target.value)} />
        </div>
      </div>

      {error && <div className="text-red-500 text-sm">{error}</div>}
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto rounded border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-2">WR Code</th>
                  <th className="px-4 py-2">Date/Time</th>
                  <th className="px-4 py-2">Description</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Urgency</th>
                  <th className="px-4 py-2">Category</th>
                  <th className="px-4 py-2">Requester</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t align-top cursor-pointer hover:bg-accent"
                    onClick={() => navigate(`/maintenance/work-requests/${row.id}`, { state: { breadcrumbExtra: row.wrCode } })}
                  >
                    <td className="px-4 py-2 whitespace-nowrap font-medium">{row.wrCode}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{row.date || '-'} {row.time || ''}</td>
                    <td className="px-4 py-2 max-w-[420px] truncate" title={row.description || ''}>{row.description || '-'}</td>
                    <td className="px-4 py-2"><StatusPill name={row.status?.name} code={row.status?.code} /></td>
                    <td className="px-4 py-2">{row.urgency?.name || row.urgency?.code || '-'}</td>
                    <td className="px-4 py-2">{row.requestType?.name || row.requestType?.code || '-'}</td>
                    <td className="px-4 py-2">{row.requester?.name || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-3 lg:hidden">
            {rows.map(row => (
              <Card key={row.id} className="p-4 space-y-2 cursor-pointer hover:bg-accent" onClick={() => navigate(`/maintenance/work-requests/${row.id}`, { state: { breadcrumbExtra: row.wrCode } })}>
                <div className="flex items-center justify-between">
                  <div className="font-medium">{row.wrCode}</div>
                  <StatusPill name={row.status?.name} code={row.status?.code} />
                </div>
                <div className="text-xs text-muted-foreground">{row.date || '-'} {row.time || ''}</div>
                <div className="text-sm">{row.description || '-'}</div>
                <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
                  {row.urgency?.name && <Badge variant="secondary">{row.urgency?.name}</Badge>}
                  {row.requestType?.name && <Badge variant="secondary">{row.requestType?.name}</Badge>}
                  {row.requester?.name && <span>By {row.requester?.name}</span>}
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Prev</Button>
            <span className="text-sm">Page {page} / {pages}</span>
            <Button variant="outline" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>Next</Button>
          </div>
        </>
      )}

      {/* Full-page Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-none w-screen h-screen sm:rounded-none p-0">
          <div className="flex flex-col h-full">
            <div className="border-b px-4 sm:px-6 py-3">
              <DialogHeader>
                <DialogTitle>Create Work Request</DialogTitle>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center space-x-2">
                    {Array.from({ length: totalSteps }, (_, i) => (
                      <div
                        key={i + 1}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          i + 1 <= currentStep
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {i + 1}
                      </div>
                    ))}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Step {currentStep} of {totalSteps}
                  </div>
                </div>
              </DialogHeader>
            </div>
            <div className="px-4 sm:px-6 py-3 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {currentStep > 1 && (
                    <Button variant="outline" onClick={prevStep} disabled={creating}>
                      Previous
                    </Button>
                  )}
                  {currentStep < totalSteps ? (
                    <Button onClick={nextStep} disabled={creating}>
                      Next
                    </Button>
                  ) : (
                    <Button 
                      onClick={async () => {
                        const errs: Record<string, string> = {};
                        if (!createForm.description.trim()) errs.description = 'Description is required';
                        if (!createForm.urgencyId) errs.urgencyId = 'Select urgency';
                        if (!createForm.requestTypeId) errs.requestTypeId = 'Select category';
                        setCreateErrors(errs);
                        if (Object.keys(errs).length > 0) return;

                        try {
                          setCreating(true);
                          const payload: any = {
                            description: createForm.description.trim(),
                            urgencyId: Number(createForm.urgencyId),
                            requestTypeId: Number(createForm.requestTypeId),
                            phoneNumber: createForm.phoneNumber || undefined,
                            remark: createForm.remark || undefined,
                            note: createForm.note || undefined,
                            budgetCost: createForm.budgetCost ? Number(createForm.budgetCost) : undefined,
                            meterNumber: createForm.meterNumber ? Number(createForm.meterNumber) : undefined,
                            meterReading: createForm.meterReading ? Number(createForm.meterReading) : undefined,
                            requestDate: createForm.requestDate || undefined,
                            requestTime: createForm.requestTime || undefined,
                            scheduledStartDate: createForm.scheduledStartDate || undefined,
                            scheduledStartTime: createForm.scheduledStartTime || undefined,
                            // Safety flags
                            hotWork: createForm.hotWork,
                            confineSpace: createForm.confineSpace,
                            workAtHeight: createForm.workAtHeight,
                            lockOutTagOut: createForm.lockOutTagOut,
                            flagSafety: createForm.flagSafety,
                            flagEnvironment: createForm.flagEnvironment,
                            // Additional flags
                            flagPU: createForm.flagPU,
                            flagTPM: createForm.flagTPM,
                            flagEQ: createForm.flagEQ,
                            // Additional fields
                            text1: createForm.text1 || undefined,
                            equipmentCode: createForm.equipmentCode || undefined,
                            productionUnitId: createForm.productionUnitId ? Number(createForm.productionUnitId) : undefined,
                            equipmentId: createForm.equipmentId ? Number(createForm.equipmentId) : undefined,
                            costCenterId: createForm.costCenterId ? Number(createForm.costCenterId) : undefined,
                            failureModeId: createForm.failureModeId ? Number(createForm.failureModeId) : undefined,
                            symptomId: createForm.symptomId ? Number(createForm.symptomId) : undefined,
                            tpmId: createForm.tpmId ? Number(createForm.tpmId) : undefined,
                            sjId: createForm.sjId ? Number(createForm.sjId) : undefined,
                            taskId: createForm.taskId ? Number(createForm.taskId) : undefined,
                            eqCompNo: createForm.eqCompNo ? Number(createForm.eqCompNo) : undefined,
                            requestor: createForm.requestor ? Number(createForm.requestor) : undefined,
                          };
                          const res = await workRequestService.create(payload);
                          const created = res?.data || res;
                          toast({ title: 'Created', description: 'Work request created successfully', variant: 'success' });
                          setCreateOpen(false);
                          resetWizard();
                          // Navigate to detail if id is returned
                          if (created?.id) {
                            navigate(`/maintenance/work-requests/${created.id}`, { state: { breadcrumbExtra: created.wrCode } });
                          }
                        } catch (e: any) {
                          toast({ title: 'Error', description: e.message || 'Failed to create work request', variant: 'destructive' });
                        } finally {
                          setCreating(false);
                        }
                      }}
                      disabled={creating}
                    >
                      {creating ? 'Saving...' : 'Save'}
                    </Button>
                  )}
                </div>
                <Button variant="outline" onClick={() => { setCreateOpen(false); resetWizard(); }} disabled={creating}>
                  Cancel
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-auto px-4 sm:px-6 py-4">
              <div className="max-w-4xl space-y-6">
                {/* Step 1: Basic Information */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Basic Information</h3>
                    
                    <div className="space-y-2">
                      <Label>Description *</Label>
                      <Textarea
                        value={createForm.description}
                        onChange={(e) => {
                          setCreateForm(prev => ({ ...prev, description: e.target.value }));
                          if (createErrors.description) setCreateErrors(prev => ({ ...prev, description: '' }));
                        }}
                        rows={4}
                        placeholder="Describe the issue or request"
                        className={createErrors.description ? 'border-red-500' : ''}
                      />
                      {createErrors.description && <p className="text-xs text-red-500">{createErrors.description}</p>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Urgency *</Label>
                        <Select
                          value={String(createForm.urgencyId || '')}
                          onValueChange={(v) => {
                            setCreateForm(prev => ({ ...prev, urgencyId: v }));
                            if (createErrors.urgencyId) setCreateErrors(prev => ({ ...prev, urgencyId: '' }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select urgency" />
                          </SelectTrigger>
                          <SelectContent>
                            {urgencyOptions.map(o => (
                              <SelectItem key={String(o.id)} value={String(o.id)}>{o.name || o.code}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {createErrors.urgencyId && <p className="text-xs text-red-500">{createErrors.urgencyId}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label>Category *</Label>
                        <Select
                          value={String(createForm.requestTypeId || '')}
                          onValueChange={(v) => {
                            setCreateForm(prev => ({ ...prev, requestTypeId: v }));
                            if (createErrors.requestTypeId) setCreateErrors(prev => ({ ...prev, requestTypeId: '' }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {typeOptions.map(o => (
                              <SelectItem key={String(o.id)} value={String(o.id)}>{o.name || o.code}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {createErrors.requestTypeId && <p className="text-xs text-red-500">{createErrors.requestTypeId}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Requester Phone</Label>
                        <Input
                          value={createForm.phoneNumber}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                          placeholder="e.g. 0812345678"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Budget Cost</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={createForm.budgetCost}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, budgetCost: e.target.value }))}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Equipment & Location */}
                {currentStep === 2 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Equipment & Location</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Equipment Code</Label>
                        <Input
                          value={createForm.equipmentCode}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, equipmentCode: e.target.value }))}
                          placeholder="e.g. PUMP-001"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Equipment ID</Label>
                        <Input
                          type="number"
                          value={createForm.equipmentId}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, equipmentId: e.target.value }))}
                          placeholder="Equipment ID"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Production Unit ID</Label>
                        <Input
                          type="number"
                          value={createForm.productionUnitId}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, productionUnitId: e.target.value }))}
                          placeholder="Production Unit ID"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Cost Center ID</Label>
                        <Input
                          type="number"
                          value={createForm.costCenterId}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, costCenterId: e.target.value }))}
                          placeholder="Cost Center ID"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Text1</Label>
                      <Input
                        value={createForm.text1}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, text1: e.target.value }))}
                        placeholder="Additional text field"
                      />
                    </div>
                  </div>
                )}

                {/* Step 3: Scheduling */}
                {currentStep === 3 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Scheduling</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Request Date</Label>
                        <Input
                          type="date"
                          value={createForm.requestDate}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, requestDate: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Request Time</Label>
                        <Input
                          type="time"
                          value={createForm.requestTime}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, requestTime: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Scheduled Start Date</Label>
                        <Input
                          type="date"
                          value={createForm.scheduledStartDate}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, scheduledStartDate: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Scheduled Start Time</Label>
                        <Input
                          type="time"
                          value={createForm.scheduledStartTime}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, scheduledStartTime: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4: Safety & Work Type */}
                {currentStep === 4 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Safety & Work Type</h3>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="hotWork"
                          checked={createForm.hotWork}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, hotWork: e.target.checked }))}
                          className="h-4 w-4 rounded border border-primary"
                        />
                        <Label htmlFor="hotWork">Hot Work</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="confineSpace"
                          checked={createForm.confineSpace}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, confineSpace: e.target.checked }))}
                          className="h-4 w-4 rounded border border-primary"
                        />
                        <Label htmlFor="confineSpace">Confined Space</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="workAtHeight"
                          checked={createForm.workAtHeight}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, workAtHeight: e.target.checked }))}
                          className="h-4 w-4 rounded border border-primary"
                        />
                        <Label htmlFor="workAtHeight">Work at Height</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="lockOutTagOut"
                          checked={createForm.lockOutTagOut}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, lockOutTagOut: e.target.checked }))}
                          className="h-4 w-4 rounded border border-primary"
                        />
                        <Label htmlFor="lockOutTagOut">Lock Out Tag Out</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="flagSafety"
                          checked={createForm.flagSafety}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, flagSafety: e.target.checked }))}
                          className="h-4 w-4 rounded border border-primary"
                        />
                        <Label htmlFor="flagSafety">Safety Related</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="flagEnvironment"
                          checked={createForm.flagEnvironment}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, flagEnvironment: e.target.checked }))}
                          className="h-4 w-4 rounded border border-primary"
                        />
                        <Label htmlFor="flagEnvironment">Environment Related</Label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="flagPU"
                          checked={createForm.flagPU}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, flagPU: e.target.checked }))}
                          className="h-4 w-4 rounded border border-primary"
                        />
                        <Label htmlFor="flagPU">Production Unit Affected</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="flagTPM"
                          checked={createForm.flagTPM}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, flagTPM: e.target.checked }))}
                          className="h-4 w-4 rounded border border-primary"
                        />
                        <Label htmlFor="flagTPM">TPM Related</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="flagEQ"
                          checked={createForm.flagEQ}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, flagEQ: e.target.checked }))}
                          className="h-4 w-4 rounded border border-primary"
                        />
                        <Label htmlFor="flagEQ">Equipment Flag</Label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 5: Additional Information */}
                {currentStep === 5 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Additional Information</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Meter Number</Label>
                        <Input
                          type="number"
                          value={createForm.meterNumber}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, meterNumber: e.target.value }))}
                          placeholder="Meter Number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Meter Reading</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={createForm.meterReading}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, meterReading: e.target.value }))}
                          placeholder="Meter Reading"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Failure Mode ID</Label>
                        <Input
                          type="number"
                          value={createForm.failureModeId}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, failureModeId: e.target.value }))}
                          placeholder="Failure Mode ID"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Symptom ID</Label>
                        <Input
                          type="number"
                          value={createForm.symptomId}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, symptomId: e.target.value }))}
                          placeholder="Symptom ID"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>TPM ID</Label>
                        <Input
                          type="number"
                          value={createForm.tpmId}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, tpmId: e.target.value }))}
                          placeholder="TPM ID"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Service Job ID</Label>
                        <Input
                          type="number"
                          value={createForm.sjId}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, sjId: e.target.value }))}
                          placeholder="Service Job ID"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Task ID</Label>
                        <Input
                          type="number"
                          value={createForm.taskId}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, taskId: e.target.value }))}
                          placeholder="Task ID"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Equipment Component ID</Label>
                        <Input
                          type="number"
                          value={createForm.eqCompNo}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, eqCompNo: e.target.value }))}
                          placeholder="Equipment Component ID"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Note</Label>
                      <Textarea
                        value={createForm.note}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, note: e.target.value }))}
                        rows={3}
                        placeholder="Additional notes"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Remark</Label>
                      <Textarea
                        value={createForm.remark}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, remark: e.target.value }))}
                        rows={3}
                        placeholder="Additional remarks"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkRequestsPage;
