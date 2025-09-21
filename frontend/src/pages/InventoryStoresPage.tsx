import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import inventoryService from '@/services/inventoryService';

const InventoryStoresPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await inventoryService.getStores({ page, limit: 20, search: search || undefined });
        const payload = res?.data || res;
        const stores = payload.stores || payload.data?.stores || payload.data || [];
        setRows(Array.isArray(stores) ? stores : []);
        const pgn = payload.pagination || res?.data?.pagination || {};
        setPages(Number(pgn.totalPages || pgn.pages) || 1);
      } catch (e: any) {
        setError(e.message || 'Failed to load stores');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [page, search]);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader title="Spare Part Stores" description="Inventory store locations" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <Input placeholder="Search store code/name" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
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
                  <th className="px-4 py-2">Store Code</th>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Active</th>
                  <th className="px-4 py-2">Total Items</th>
                  <th className="px-4 py-2">Total Value</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-2 whitespace-nowrap font-medium">{r.storeCode}</td>
                    <td className="px-4 py-2">{r.storeName}</td>
                    <td className="px-4 py-2">{r.storeType || '-'}</td>
                    <td className="px-4 py-2">{r.isActive ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-2">{r.totalItems ?? '-'}</td>
                    <td className="px-4 py-2">{r.totalValue ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-1 gap-3 lg:hidden">
            {rows.map((r) => (
              <Card key={r.id} className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{r.storeCode}</div>
                  <div className="text-xs text-muted-foreground">{r.storeType || '-'}</div>
                </div>
                <div className="text-sm">{r.storeName}</div>
                <div className="text-xs text-muted-foreground">Items: {r.totalItems ?? '-'} • Value: {r.totalValue ?? '-'}</div>
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

export default InventoryStoresPage;
