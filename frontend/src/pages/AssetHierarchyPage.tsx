import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import assetService from '@/services/assetService';
import hierarchyService from '@/services/hierarchyService';
import type { Site } from '@/services/assetService';
import type { HierarchySiteOverview, HierarchyDepartmentDetailsResponse } from '@/types/hierarchy';

type DeptKey = string;

const AssetHierarchyPage: React.FC = () => {
  const [sites, setSites] = useState<Site[]>([]);
  const [siteNo, setSiteNo] = useState<number | undefined>();
  const [overview, setOverview] = useState<HierarchySiteOverview | null>(null);
  const [expandedDepartments, setExpandedDepartments] = useState<Set<DeptKey>>(new Set());
  const [deptData, setDeptData] = useState<Record<DeptKey, HierarchyDepartmentDetailsResponse | null>>({});
  const [deptLoading, setDeptLoading] = useState<Record<DeptKey, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await assetService.getSites();
        setSites(res.data || []);
      } catch (e: any) {
        setError(e.message || 'Failed to load sites');
      }
    };
    init();
  }, []);

  useEffect(() => {
    const loadOverview = async () => {
      try {
        setLoading(true);
        const sites = await hierarchyService.getHierarchyOverview(siteNo);
        setOverview((sites && sites.length > 0) ? sites[0] : null);
      } catch (e: any) {
        setError(e.message || 'Failed to load hierarchy overview');
      } finally {
        setLoading(false);
      }
    };
    loadOverview();
  }, [siteNo]);

  const toggleDepartment = async (deptKey: DeptKey, deptNo: number) => {
    // collapse if expanded
    if (expandedDepartments.has(deptKey)) {
      setExpandedDepartments(prev => {
        const next = new Set(prev);
        next.delete(deptKey);
        return next;
      });
      return;
    }
    // expand; load if not present
    if (!deptData[deptKey]) {
      try {
        setDeptLoading(prev => ({ ...prev, [deptKey]: true }));
        const resp = await hierarchyService.getDepartmentDetails(deptNo === 0 ? 'general' : deptNo, siteNo as number, 1, 50, true);
        setDeptData(prev => ({ ...prev, [deptKey]: resp }));
      } catch (e: any) {
        setError(e.message || 'Failed to load department details');
        return;
      } finally {
        setDeptLoading(prev => ({ ...prev, [deptKey]: false }));
      }
    }
    setExpandedDepartments(prev => new Set(prev).add(deptKey));
  };

  const loadMore = async (deptKey: DeptKey) => {
    const current = deptData[deptKey];
    if (!current || !overview) return;
    const nextPage = current.pagination.page + 1;
    if (nextPage > current.pagination.pages) return;
    try {
      setDeptLoading(prev => ({ ...prev, [deptKey]: true }));
      const deptNo = current.data.department.DEPTNO === 0 ? 'general' : current.data.department.DEPTNO;
      const resp = await hierarchyService.getDepartmentDetails(deptNo, overview.SiteNo, nextPage, current.pagination.limit, true);
      // merge productionUnits
      const mergedPU = { ...current.data.productionUnits, ...resp.data.productionUnits };
      setDeptData(prev => ({
        ...prev,
        [deptKey]: { ...resp, data: { ...resp.data, productionUnits: mergedPU } }
      }));
    } finally {
      setDeptLoading(prev => ({ ...prev, [deptKey]: false }));
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader title="Asset Hierarchy" description="Explore PUs and Equipment in a tree" />

      <div className="flex flex-wrap gap-2 items-center">
        <label className="text-sm">Site:</label>
        <select className="border rounded px-2 py-1 text-sm" value={siteNo ?? ''} onChange={(e) => setSiteNo(e.target.value ? Number(e.target.value) : undefined)}>
          <option value="">All</option>
          {sites.map(s => <option key={s.SiteNo} value={s.SiteNo}>{s.SiteName}</option>)}
        </select>
      </div>

      {error && <div className="text-red-500 text-sm">{error}</div>}

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : (
        <div className="space-y-3">
          {!overview ? (
            <Card className="p-4 text-sm text-muted-foreground">No data</Card>
          ) : (
            <>
              <Card className="p-4">
                <div className="font-medium">{overview.SiteName}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {overview.stats.totalDepartments} departments • {overview.stats.totalProductionUnits} PUs • {overview.stats.totalEquipment} EQ
                </div>
              </Card>
              <Card className="p-2">
                <div className="divide-y">
                  {Object.entries(overview.departments).map(([key, d]) => (
                    <div key={key} className="py-2">
                      <button className="w-full text-left flex items-center gap-2" onClick={() => toggleDepartment(key, d.DEPTNO)}>
                        <span className="inline-block w-4 text-center">{expandedDepartments.has(key) ? '▾' : '▸'}</span>
                        {d.virtual && <span className="text-[10px] px-1 rounded bg-muted">Virtual</span>}
                        <span className="text-sm font-medium">{d.DEPTNAME}</span>
                        <span className="ml-auto text-xs text-muted-foreground">{d.stats.productionUnits} PUs • {d.stats.equipment} EQ</span>
                      </button>
                      {expandedDepartments.has(key) && (
                        <div className="pl-6 pt-2">
                          {deptLoading[key] && !deptData[key] ? (
                            <div className="text-xs text-muted-foreground">Loading...</div>
                          ) : deptData[key] ? (
                            <div className="space-y-2">
                              {Object.values(deptData[key]!.data.productionUnits).map(pu => (
                                <div key={pu.PUNO} className="border rounded p-2">
                                  <div className="text-sm font-medium">{pu.PUNAME} <span className="text-xs text-muted-foreground">({pu.PUCODE})</span></div>
                                  <div className="pl-3 mt-1">
                                    {Object.values(pu.equipment || {}).length === 0 ? (
                                      <div className="text-xs text-muted-foreground">No equipment</div>
                                    ) : (
                                      Object.values(pu.equipment).map(eq => (
                                        <div key={eq.EQNO} className="text-xs">• {eq.EQNAME} <span className="text-muted-foreground">({eq.EQCODE})</span></div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              ))}
                              {deptData[key]!.pagination.page < deptData[key]!.pagination.pages && (
                                <div className="pt-1">
                                  <button disabled={!!deptLoading[key]} onClick={() => loadMore(key)} className="text-xs px-3 py-1 border rounded hover:bg-accent disabled:opacity-50">Load more</button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">No data</div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AssetHierarchyPage;
