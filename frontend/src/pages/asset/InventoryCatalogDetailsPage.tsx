import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import inventoryService from '@/services/inventoryService';

const Row: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div className="flex text-sm">
    <div className="w-36 shrink-0 text-muted-foreground">{label}</div>
    <div className="text-foreground">{value ?? '-'}</div>
  </div>
);

const InventoryCatalogDetailsPage: React.FC = () => {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!itemId) return;
      try {
        setLoading(true);
        const res = await inventoryService.getCatalogItem(itemId);
        const payload = res?.data || res;
        setData(payload);
        const code = payload?.partCode || payload?.allFields?.PARTCODE || `#${itemId}`;
        navigate(location.pathname, { replace: true, state: { breadcrumbExtra: code } });
      } catch (e: any) {
        setError(e.message || 'Failed to load item');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [itemId]);

  const code = data?.partCode || `#${itemId}`;
  const raw: any = data?.allFields || {};
  const manufacturer = (raw.MANUFACTURER || raw.MANUFACTURERNAME || raw.MFG || raw.MFGNAME || raw.MANUFACTURE || raw.MANUFAC || (data as any)?.manufacturer) || '-';
  

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* <PageHeader title={code} description={data?.partName || 'Catalog item'} showBackButton onBack={() => navigate('/spare/catalog')} /> */}
      <PageHeader title={code}  showBackButton onBack={() => navigate('/spare/catalog')} />
      {error && <div className="text-red-500 text-sm">{error}</div>}
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : data ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left */}
          <div className="space-y-4 lg:col-span-2">
            <Card className="p-4 space-y-2">
              <div className="text-sm text-muted-foreground">Basic Info</div>
              <Row label="Part Code" value={data.partCode} />
              <Row label="Name" value={data.partName} />
              <Row label="Description" value={<span className="whitespace-pre-wrap">{data.description || '-'}</span>} />
              <Row label="Type" value={data.partType || '-'} />
              <Row label="Brand" value={raw.IVBRAND || raw.BRAND || raw.BRANDNAME || '-'} />
              <Row label="Model" value={raw.IVMODEL || raw.MODEL || '-'} />
              <Row label="Manufacturer" value={manufacturer} />
              <Row label="Active" value={data.isActive ? 'Yes' : 'No'} />
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4 space-y-2">
                <div className="text-sm text-muted-foreground">Group/Type/Unit</div>
                <Row label="Group" value={`${data.group?.name || ''}`} />
                <Row label="Type" value={`${data.type?.name || ''}`} />
                <Row label="Unit" value={`${data.unit?.name || ''}`} />
              </Card>
              <Card className="p-4 space-y-2">
                <div className="text-sm text-muted-foreground">Vendor</div>
                <Row label="Code" value={data.vendor?.code} />
                <Row label="Name" value={data.vendor?.name} />
                {data.vendor?.address && <Row label="Address" value={<span className="whitespace-pre-wrap">{data.vendor.address}</span>} />}
                {(data.vendor?.phone || data.vendor?.email) && (
                  <>
                    <Row label="Phone" value={data.vendor?.phone} />
                    <Row label="Email" value={data.vendor?.email} />
                  </>
                )}
              </Card>
              <Card className="p-4 space-y-2 md:col-span-2">
                <div className="text-sm text-muted-foreground">Costs</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <Row label="Unit Cost" value={data.costs?.unitCost} />
                  <Row label="Avg Cost" value={data.costs?.averageCost} />
                  <Row label="Std Cost" value={data.costs?.standardCost} />
                  <Row label="Last Purchase" value={data.costs?.lastPurchaseCost} />
                  <Row label="FIFO Cost" value={data.costs?.fifoCost} />
                  <Row label="Total Value" value={data.costs?.totalValue} />
                </div>
              </Card>
              <Card className="p-4 space-y-3 md:col-span-2">
                <div className="text-sm text-muted-foreground">Stock Summary</div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <Row label="On Hand" value={data.stockSummary?.totalOnHand ?? '-'} />
                  <Row label="Reserved" value={data.stockSummary?.totalReserved ?? '-'} />
                  <Row label="Available" value={data.stockSummary?.totalAvailable ?? '-'} />
                  <Row label="Total Value" value={data.stockSummary?.totalValue ?? '-'} />
                  <Row label="Locations" value={data.stockSummary?.locationCount ?? (data.locations?.length ?? '-')} />
                </div>
                {Array.isArray(data.locations) && data.locations.length > 0 && (
                  <div className="pt-2">
                    <div className="text-sm text-muted-foreground mb-1">Locations</div>
                    <div className="hidden lg:block overflow-x-auto rounded border">
                      <table className="min-w-full text-xs">
                        <thead className="bg-muted/50 text-left">
                          <tr>
                            <th className="px-3 py-1">Store</th>
                            <th className="px-3 py-1">Bin</th>
                            <th className="px-3 py-1">Shelf</th>
                            <th className="px-3 py-1">OnHand</th>
                            <th className="px-3 py-1">Reserved</th>
                            <th className="px-3 py-1">Avail</th>
                            <th className="px-3 py-1">Pending</th>
                            <th className="px-3 py-1">Min/Max</th>
                            <th className="px-3 py-1">Reorder/EOQ</th>
                            <th className="px-3 py-1">Lead</th>
                            <th className="px-3 py-1">Unit Cost</th>
                            <th className="px-3 py-1">Value</th>
                            <th className="px-3 py-1">Last Issue</th>
                            <th className="px-3 py-1">Last Receive</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.locations.map((loc: any, idx: number) => (
                            <tr key={idx} className="border-t">
                              <td className="px-3 py-1 whitespace-nowrap">{loc.storeCode} {loc.storeName ? `- ${loc.storeName}` : ''}</td>
                              <td className="px-3 py-1">{loc.binLocation || '-'}</td>
                              <td className="px-3 py-1">{loc.shelf || '-'}</td>
                              <td className="px-3 py-1">{loc.quantities?.onHand ?? '-'}</td>
                              <td className="px-3 py-1">{loc.quantities?.reserved ?? '-'}</td>
                              <td className="px-3 py-1">{loc.quantities?.available ?? '-'}</td>
                              <td className="px-3 py-1">{loc.quantities?.pending ?? '-'}</td>
                              <td className="px-3 py-1">{loc.stockLevels?.minStock ?? '-'} / {loc.stockLevels?.maxStock ?? '-'}</td>
                              <td className="px-3 py-1">{loc.stockLevels?.reorderPoint ?? '-'} / {loc.stockLevels?.reorderQuantity ?? '-'}</td>
                              <td className="px-3 py-1">{loc.stockLevels?.leadTime ?? '-'}</td>
                              <td className="px-3 py-1">{loc.costs?.unitCost ?? '-'}</td>
                              <td className="px-3 py-1">{loc.costs?.totalValue ?? '-'}</td>
                              <td className="px-3 py-1">{loc.lastActivity?.lastIssueDate || '-'}</td>
                              <td className="px-3 py-1">{loc.lastActivity?.lastReceiveDate || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="grid grid-cols-1 gap-2 lg:hidden">
                      {data.locations.map((loc: any, idx: number) => (
                        <Card key={idx} className="p-3 space-y-1">
                          <div className="text-sm font-medium">{loc.storeCode} {loc.storeName ? `- ${loc.storeName}` : ''}</div>
                          <div className="text-xs text-muted-foreground">Bin: {loc.binLocation || '-'} • Shelf: {loc.shelf || '-'}</div>
                          <div className="text-xs text-muted-foreground">OnHand {loc.quantities?.onHand ?? '-'} • Avail {loc.quantities?.available ?? '-'}</div>
                          <div className="text-xs text-muted-foreground">Min/Max {loc.stockLevels?.minStock ?? '-'}/{loc.stockLevels?.maxStock ?? '-'}</div>
                          <div className="text-xs text-muted-foreground">Reorder/EOQ {loc.stockLevels?.reorderPoint ?? '-'}/{loc.stockLevels?.reorderQuantity ?? '-'}</div>
                          <div className="text-xs text-muted-foreground">UnitCost {loc.costs?.unitCost ?? '-'} • Value {loc.costs?.totalValue ?? '-'}</div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* Right */}
          <div className="space-y-4">
            <Card className="p-4 space-y-2">
              <div className="text-sm text-muted-foreground">Meta</div>
              <Row label="Created" value={raw.CREATEDATE || data.createdDate} />
              <Row label="Updated" value={raw.UPDATEDATE || data.updatedDate} />
              {data.recordInfo && (
                <>
                  <Row label="Creator" value={data.recordInfo.creator?.name || [data.recordInfo.creator?.firstName, data.recordInfo.creator?.lastName].filter(Boolean).join(' ') || '-'} />
                  <Row label="Creator Email" value={data.recordInfo.creator?.email} />
                  <Row label="Updater" value={data.recordInfo.updater?.name || [data.recordInfo.updater?.firstName, data.recordInfo.updater?.lastName].filter(Boolean).join(' ') || '-'} />
                  <Row label="Updater Email" value={data.recordInfo.updater?.email} />
                </>
              )}
            </Card>
            {data.allFields && (
              <Card className="p-4 space-y-2">
                <div className="text-sm text-muted-foreground">Raw Record</div>
                <pre className="text-xs overflow-auto max-h-80 bg-muted/30 p-2 rounded">{JSON.stringify(data.allFields, null, 2)}</pre>
              </Card>
            )}
          </div>
        </div>
      ) : (
        <Card className="p-4 text-sm text-muted-foreground">No data</Card>
      )}
    </div>
  );
};

export default InventoryCatalogDetailsPage;
