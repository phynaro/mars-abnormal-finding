import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import assetService from '@/services/assetService';
import type { Site } from '@/services/assetService';

const AssetSitesPage: React.FC = () => {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await assetService.getSites();
        setSites(res.data || []);
      } catch (e: any) {
        setError(e.message || 'Failed to load sites');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader title="Sites" description="Browse all sites" />
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
                  <th className="px-4 py-2">Site No</th>
                  <th className="px-4 py-2">Code</th>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">License</th>
                </tr>
              </thead>
              <tbody>
                {sites.map(s => (
                  <tr key={s.SiteNo} className="border-t">
                    <td className="px-4 py-2">{s.SiteNo}</td>
                    <td className="px-4 py-2">{s.SiteCode}</td>
                    <td className="px-4 py-2">{s.SiteName}</td>
                    <td className="px-4 py-2">{s.MaxNumOfUserLicense ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="grid grid-cols-1 gap-3 lg:hidden">
            {sites.map(s => (
              <Card key={s.SiteNo} className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-base font-medium">{s.SiteName}</div>
                    <div className="text-xs text-muted-foreground">Code: {s.SiteCode}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">License: {s.MaxNumOfUserLicense ?? '-'}</div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default AssetSitesPage;
