import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import inventoryService from '@/services/inventoryService';

const InventoryOverviewPage: React.FC = () => {
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
        setError(e.message || 'Failed to load inventory overview');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const ov = data?.overview || {};
  const byGroup = data?.byGroup || [];

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader title="Spare Part" description="Overview and statistics" />
      {error && <div className="text-red-500 text-sm">{error}</div>}
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {[
              { label: 'Total Items', value: ov.totalItems },
              { label: 'Active Items', value: ov.activeItems },
              { label: 'Low Stock', value: ov.lowStockItems },
              { label: 'Out of Stock', value: ov.outOfStockItems },
              { label: 'Total Value', value: ov.totalInventoryValue },
              { label: 'Total Vendors', value: ov.totalVendors },
            ].map((k) => (
              <Card key={k.label} className="p-4">
                <div className="text-xs text-muted-foreground">{k.label}</div>
                <div className="text-lg font-semibold">{k.value ?? '-'}</div>
              </Card>
            ))}
          </div>

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
        </>
      )}
    </div>
  );
};

export default InventoryOverviewPage;
