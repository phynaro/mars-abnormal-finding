import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import assetService from '@/services/assetService';
import type { ProductionUnit, Site, Department } from '@/services/assetService';
import StatusBadge from '@/components/asset/StatusBadge';

const ProductionUnitPage: React.FC = () => {
  const [sites, setSites] = useState<Site[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [siteNo, setSiteNo] = useState<number | undefined>();
  const [deptNo, setDeptNo] = useState<number | undefined>();
  const [search, setSearch] = useState('');
  const [data, setData] = useState<ProductionUnit[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
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
    const loadDepts = async () => {
      if (!siteNo) { setDepartments([]); setDeptNo(undefined); return; }
      try {
        const res = await assetService.getDepartmentsBySite(siteNo);
        setDepartments(res.data || []);
      } catch (e: any) {
        setError(e.message || 'Failed to load departments');
      }
    };
    loadDepts();
  }, [siteNo]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await assetService.getProductionUnits({ siteNo, deptNo, search, page, limit: 20 });
        setData(res.data || []);
        setPages(res.pagination?.pages || 1);
      } catch (e: any) {
        setError(e.message || 'Failed to load production units');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [siteNo, deptNo, search, page]);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader title="Production Units" description="Filter by site, department, or search" />

      <div className="flex flex-wrap gap-2 items-center">
        <label className="text-sm">Site:</label>
        <select className="border rounded px-2 py-1 text-sm" value={siteNo ?? ''} onChange={(e) => { setSiteNo(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}>
          <option value="">All</option>
          {sites.map(s => <option key={s.SiteNo} value={s.SiteNo}>{s.SiteName}</option>)}
        </select>
        <label className="text-sm">Dept:</label>
        <select className="border rounded px-2 py-1 text-sm" value={deptNo ?? ''} onChange={(e) => { setDeptNo(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}>
          <option value="">All</option>
          {departments.map(d => <option key={d.DEPTNO} value={d.DEPTNO}>{d.DEPTNAME}</option>)}
        </select>
        <input
          className="border rounded px-2 py-1 text-sm flex-1 min-w-[160px]"
          placeholder="Search name/code"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {error && <div className="text-red-500 text-sm">{error}</div>}
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block overflow-x-auto rounded border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-2">PU No</th>
                  <th className="px-4 py-2">Code</th>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Dept</th>
                  <th className="px-4 py-2">Site</th>
                </tr>
              </thead>
              <tbody>
                {data.map(pu => (
                  <tr key={pu.PUNO} className="border-t">
                    <td className="px-4 py-2">{pu.PUNO}</td>
                    <td className="px-4 py-2">{pu.PUCODE}</td>
                    <td className="px-4 py-2">{pu.PUNAME}</td>
                    <td className="px-4 py-2">{pu.PUTYPENAME ?? '-'}</td>
                    <td className="px-4 py-2"><StatusBadge status={pu.PUSTATUSNAME} /></td>
                    <td className="px-4 py-2">{pu.DEPTNAME ?? '-'}</td>
                    <td className="px-4 py-2">{pu.SiteName ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="grid grid-cols-1 gap-3 lg:hidden">
            {data.map(pu => (
              <Card key={pu.PUNO} className="p-4 space-y-1">
                <div className="flex justify-between items-center">
                  <div className="font-medium">{pu.PUNAME}</div>
                  <StatusBadge status={pu.PUSTATUSNAME} />
                </div>
                <div className="text-xs text-muted-foreground">Code: {pu.PUCODE}</div>
                <div className="text-xs text-muted-foreground">Type: {pu.PUTYPENAME ?? '-'}</div>
                <div className="text-xs text-muted-foreground">{pu.DEPTNAME ?? '-'} • {pu.SiteName ?? '-'}</div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button className="px-3 py-1 border rounded text-sm disabled:opacity-50" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
            <span className="text-sm">Page {page} / {pages}</span>
            <button className="px-3 py-1 border rounded text-sm disabled:opacity-50" disabled={page >= pages} onClick={() => setPage(p => Math.min(pages, p + 1))}>Next</button>
          </div>
        </>
      )}
    </div>
  );
};

export default ProductionUnitPage;
