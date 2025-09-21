import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import assetService from '@/services/assetService';
import type { Equipment, Site } from '@/services/assetService';
import StatusBadge from '@/components/asset/StatusBadge';

const EquipmentPage: React.FC = () => {
  const [sites, setSites] = useState<Site[]>([]);
  const [siteNo, setSiteNo] = useState<number | undefined>();
  const [puNo, setPuNo] = useState<number | undefined>();
  const [search, setSearch] = useState('');
  const [data, setData] = useState<Equipment[]>([]);
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
    const load = async () => {
      try {
        setLoading(true);
        const res = await assetService.getEquipment({ siteNo, puNo, search, page, limit: 20 });
        setData(res.data || []);
        setPages(res.pagination?.pages || 1);
      } catch (e: any) {
        setError(e.message || 'Failed to load equipment');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [siteNo, puNo, search, page]);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader title="Equipment" description="Filter by site, PU no, or search" />

      <div className="flex flex-wrap gap-2 items-center">
        <label className="text-sm">Site:</label>
        <select className="border rounded px-2 py-1 text-sm" value={siteNo ?? ''} onChange={(e) => { setSiteNo(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}>
          <option value="">All</option>
          {sites.map(s => <option key={s.SiteNo} value={s.SiteNo}>{s.SiteName}</option>)}
        </select>
        <label className="text-sm">PU No:</label>
        <input className="border rounded px-2 py-1 text-sm w-28" type="number" value={puNo ?? ''} onChange={(e) => { const v = e.target.value; setPuNo(v ? Number(v) : undefined); setPage(1); }} />
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
                  <th className="px-4 py-2">EQ No</th>
                  <th className="px-4 py-2">Code</th>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">PU</th>
                  <th className="px-4 py-2">Asset No</th>
                </tr>
              </thead>
              <tbody>
                {data.map(eq => (
                  <tr key={eq.EQNO} className="border-t">
                    <td className="px-4 py-2">{eq.EQNO}</td>
                    <td className="px-4 py-2">{eq.EQCODE}</td>
                    <td className="px-4 py-2">{eq.EQNAME}</td>
                    <td className="px-4 py-2">{eq.EQTYPENAME ?? '-'}</td>
                    <td className="px-4 py-2"><StatusBadge status={eq.EQSTATUSNAME} /></td>
                    <td className="px-4 py-2">{eq.PUNAME ?? '-'}</td>
                    <td className="px-4 py-2">{eq.ASSETNO ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="grid grid-cols-1 gap-3 lg:hidden">
            {data.map(eq => (
              <Card key={eq.EQNO} className="p-4 space-y-1">
                <div className="flex justify-between items-center">
                  <div className="font-medium">{eq.EQNAME}</div>
                  <StatusBadge status={eq.EQSTATUSNAME} />
                </div>
                <div className="text-xs text-muted-foreground">Code: {eq.EQCODE} • Asset: {eq.ASSETNO ?? '-'}</div>
                <div className="text-xs text-muted-foreground">Type: {eq.EQTYPENAME ?? '-'} • PU: {eq.PUNAME ?? '-'}</div>
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

export default EquipmentPage;
