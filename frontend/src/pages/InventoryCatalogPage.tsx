import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import inventoryService from '@/services/inventoryService';

const InventoryCatalogPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeOnly, setActiveOnly] = useState<'all' | 'active'>('active');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await inventoryService.getCatalog({ page, limit: 20, search: search || undefined, activeOnly: activeOnly === 'active' });
        const payload = res?.data || res;
        const items = payload.items || payload.data?.items || payload.data || [];
        setRows(Array.isArray(items) ? items : []);
        const pgn = payload.pagination || res?.data?.pagination || {};
        setPages(Number(pgn.totalPages || pgn.pages) || 1);
      } catch (e: any) {
        setError(e.message || 'Failed to load catalog');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [page, search]);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader title="Spare Part Catalog" description="Browse parts and materials" />
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Input placeholder="Search part code/name/description" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <div>
          <label className="text-xs text-muted-foreground">Filter</label>
          <select className="border rounded px-2 py-1 text-sm w-full bg-background" value={activeOnly} onChange={(e) => { setActiveOnly(e.target.value as any); setPage(1); }}>
            <option value="active">Active Only</option>
            <option value="all">All Items</option>
          </select>
        </div>
      </div>
      {error && <div className="text-red-500 text-sm">{error}</div>}
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : (
        <>
          <div className="hidden lg:block overflow-x-auto rounded border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-2">Part Code</th>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Group</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Unit</th>
                  <th className="px-4 py-2">Vendor</th>
                  <th className="px-4 py-2">Available</th>
                  <th className="px-4 py-2">Value</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t cursor-pointer hover:bg-accent" onClick={() => navigate(`/spare/catalog/${r.id}`, { state: { breadcrumbExtra: r.partCode } })}>
                    <td className="px-4 py-2 whitespace-nowrap font-medium">{r.partCode}</td>
                    <td className="px-4 py-2">{r.partName}</td>
                    <td className="px-4 py-2">{r.group?.name || r.group?.code || '-'}</td>
                    <td className="px-4 py-2">{r.type?.name || r.type?.code || '-'}</td>
                    <td className="px-4 py-2">{r.unit?.code || '-'}</td>
                    <td className="px-4 py-2">{r.vendor?.name || r.vendor?.code || '-'}</td>
                    <td className="px-4 py-2">{r.stock?.available ?? r.stock?.onHand ?? '-'}</td>
                    <td className="px-4 py-2">{r.stock?.value ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-1 gap-3 lg:hidden">
            {rows.map((r) => (
              <Card key={r.id} className="p-4 space-y-1 cursor-pointer hover:bg-accent" onClick={() => navigate(`/spare/catalog/${r.id}`, { state: { breadcrumbExtra: r.partCode } })}>
                <div className="flex items-center justify-between">
                  <div className="font-medium">{r.partCode}</div>
                  <div className="text-xs text-muted-foreground">{r.unit?.code || ''}</div>
                </div>
                <div className="text-sm">{r.partName}</div>
                <div className="text-xs text-muted-foreground">{r.group?.name || r.group?.code || '-'} • {r.type?.name || r.type?.code || '-'}</div>
                <div className="text-xs text-muted-foreground">Avail: {r.stock?.available ?? r.stock?.onHand ?? '-'} • Value: {r.stock?.value ?? '-'}</div>
              </Card>
            ))}
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
            <span className="text-sm">Page {page} / {pages}</span>
            <Button variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </>
      )}
    </div>
  );
};

export default InventoryCatalogPage;
