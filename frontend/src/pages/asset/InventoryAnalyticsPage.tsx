import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import inventoryService from '@/services/inventoryService';

const InventoryAnalyticsPage: React.FC = () => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await inventoryService.getStatsOverview();
        setData(res?.data || res);
      } catch (e: any) {
        setError(e.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const byGroup = data?.byGroup || [];
  const byVendor = data?.byVendor || [];

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader title="Spare Part Analytics" description="Inventory statistics and breakdowns" />
      {error && <div className="text-red-500 text-sm">{error}</div>}
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="text-sm font-medium mb-2">By Group</div>
            <div className="hidden lg:block overflow-x-auto rounded border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-4 py-2">Group</th>
                    <th className="px-4 py-2">Items</th>
                    <th className="px-4 py-2">Total Value</th>
                  </tr>
                </thead>
                <tbody>
                  {byGroup.map((g: any, idx: number) => (
                    <tr key={idx} className="border-t">
                      <td className="px-4 py-2">{g.IVGROUPNAME || g.groupName || '-'}</td>
                      <td className="px-4 py-2">{g.itemCount ?? '-'}</td>
                      <td className="px-4 py-2">{g.totalValue ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid grid-cols-1 gap-3 lg:hidden">
              {byGroup.map((g: any, idx: number) => (
                <Card key={idx} className="p-4">
                  <div className="font-medium">{g.IVGROUPNAME || g.groupName || '-'}</div>
                  <div className="text-xs text-muted-foreground">Items: {g.itemCount ?? '-'}</div>
                  <div className="text-xs text-muted-foreground">Value: {g.totalValue ?? '-'}</div>
                </Card>
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm font-medium mb-2">By Vendor</div>
            <div className="hidden lg:block overflow-x-auto rounded border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-4 py-2">Vendor</th>
                    <th className="px-4 py-2">Items</th>
                    <th className="px-4 py-2">Total Value</th>
                  </tr>
                </thead>
                <tbody>
                  {byVendor.map((v: any, idx: number) => (
                    <tr key={idx} className="border-t">
                      <td className="px-4 py-2">{v.vendorName || v.VENDORNAME || '-'}</td>
                      <td className="px-4 py-2">{v.itemCount ?? '-'}</td>
                      <td className="px-4 py-2">{v.totalValue ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid grid-cols-1 gap-3 lg:hidden">
              {byVendor.map((v: any, idx: number) => (
                <Card key={idx} className="p-4">
                  <div className="font-medium">{v.vendorName || v.VENDORNAME || '-'}</div>
                  <div className="text-xs text-muted-foreground">Items: {v.itemCount ?? '-'}</div>
                  <div className="text-xs text-muted-foreground">Value: {v.totalValue ?? '-'}</div>
                </Card>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default InventoryAnalyticsPage;
