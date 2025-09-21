import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import assetService from '@/services/assetService';
import type { Department, Site } from '@/services/assetService';

const AssetDepartmentsPage: React.FC = () => {
  const [sites, setSites] = useState<Site[]>([]);
  const [siteNo, setSiteNo] = useState<number | undefined>(undefined);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSites = async () => {
      try {
        const res = await assetService.getSites();
        setSites(res.data || []);
      } catch (e: any) {
        setError(e.message || 'Failed to load sites');
      }
    };
    loadSites();
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!siteNo) { setDepartments([]); return; }
      try {
        setLoading(true);
        const res = await assetService.getDepartmentsBySite(siteNo);
        setDepartments(res.data || []);
      } catch (e: any) {
        setError(e.message || 'Failed to load departments');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [siteNo]);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader title="Departments" description="Select a site to view departments" />

      <div className="flex flex-wrap gap-2 items-center">
        <label className="text-sm">Site:</label>
        <select
          className="border rounded px-2 py-1 text-sm"
          value={siteNo ?? ''}
          onChange={(e) => setSiteNo(e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">All Sites</option>
          {sites.map(s => (
            <option key={s.SiteNo} value={s.SiteNo}>{s.SiteName}</option>
          ))}
        </select>
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
                  <th className="px-4 py-2">Dept No</th>
                  <th className="px-4 py-2">Code</th>
                  <th className="px-4 py-2">Name</th>
                </tr>
              </thead>
              <tbody>
                {departments.map(d => (
                  <tr key={d.DEPTNO} className="border-t">
                    <td className="px-4 py-2">{d.DEPTNO}</td>
                    <td className="px-4 py-2">{d.DEPTCODE}</td>
                    <td className="px-4 py-2">{d.DEPTNAME}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="grid grid-cols-1 gap-3 lg:hidden">
            {departments.map(d => (
              <Card key={d.DEPTNO} className="p-4">
                <div className="text-base font-medium">{d.DEPTNAME}</div>
                <div className="text-xs text-muted-foreground">Code: {d.DEPTCODE} • No: {d.DEPTNO}</div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default AssetDepartmentsPage;
