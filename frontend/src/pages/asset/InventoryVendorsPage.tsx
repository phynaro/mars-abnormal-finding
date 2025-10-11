import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import inventoryService from '@/services/inventoryService';

const InventoryVendorsPage: React.FC = () => {
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
        const res = await inventoryService.getVendors(page, 20, search || undefined);
        const payload = res?.data || res;
        const arr = Array.isArray(payload) ? payload : (payload.vendors || payload.data || []);
        setRows(Array.isArray(arr) ? arr : []);
        const pgn = payload.pagination || res?.data?.pagination || {};
        setPages(Number(pgn.totalPages || pgn.pages) || 1);
      } catch (e: any) {
        setError(e.message || 'Failed to load vendors');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [page, search]);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader title="Spare Part Vendors" description="Inventory vendors" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <Input placeholder="Search vendor code/name" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
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
                  <th className="px-4 py-2">Vendor Code</th>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Phone</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Active</th>
                  <th className="px-4 py-2">Total Parts</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-2 whitespace-nowrap font-medium">{r.vendorCode}</td>
                    <td className="px-4 py-2">{r.vendorName}</td>
                    <td className="px-4 py-2">{r.phone || '-'}</td>
                    <td className="px-4 py-2">{r.email || '-'}</td>
                    <td className="px-4 py-2">{r.isActive ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-2">{r.totalParts ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-1 gap-3 lg:hidden">
            {rows.map((r: any) => (
              <Card key={r.id} className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{r.vendorCode}</div>
                  <div className="text-xs text-muted-foreground">{r.isActive ? 'Active' : 'Inactive'}</div>
                </div>
                <div className="text-sm">{r.vendorName}</div>
                <div className="text-xs text-muted-foreground">{r.phone || '-'} • {r.email || '-'}</div>
                <div className="text-xs text-muted-foreground">Total parts: {r.totalParts ?? '-'}</div>
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

export default InventoryVendorsPage;
