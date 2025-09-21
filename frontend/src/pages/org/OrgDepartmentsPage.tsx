import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import personnelService, { type Department } from '@/services/personnelService';

const OrgDepartmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [rows, setRows] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await personnelService.getDepartments({ page, limit: 20, search: search || undefined });
        const payload = res?.data || res;
        const arr = Array.isArray(payload) ? payload : (payload.data || payload.items || payload.departments || []);
        setRows(Array.isArray(arr) ? arr : []);
        const pgn = res?.pagination || payload?.pagination || {};
        setPages(Number(pgn.totalPages || pgn.pages) || 1);
      } catch (e: any) { setError(e.message || 'Failed to load departments'); }
      finally { setLoading(false); }
    };
    load();
  }, [page, search]);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader title="Departments" description="Organization departments" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <Input placeholder="Search department" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>
      {error && <div className="text-red-500 text-sm">{error}</div>}
      {loading ? <div className="text-sm text-muted-foreground">Loading...</div> : (
        <>
          <div className="hidden lg:block overflow-x-auto rounded border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-2">Code</th>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">People</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.DEPTNO} className="border-t cursor-pointer hover:bg-accent" onClick={() => navigate(`/org/departments/${r.DEPTNO}`, { state: { breadcrumbExtra: r.DEPTCODE } })}>
                    <td className="px-4 py-2 whitespace-nowrap font-medium">{r.DEPTCODE}</td>
                    <td className="px-4 py-2">{r.DEPTNAME}</td>
                    <td className="px-4 py-2">{r.PERSON_COUNT ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-1 gap-3 lg:hidden">
            {rows.map((r) => (
              <Card key={r.DEPTNO} className="p-4 space-y-1 cursor-pointer hover:bg-accent" onClick={() => navigate(`/org/departments/${r.DEPTNO}`, { state: { breadcrumbExtra: r.DEPTCODE } })}>
                <div className="flex items-center justify-between">
                  <div className="font-medium">{r.DEPTCODE}</div>
                  <div className="text-xs text-muted-foreground">{r.PERSON_COUNT ?? '-'}</div>
                </div>
                <div className="text-sm">{r.DEPTNAME}</div>
              </Card>
            ))}
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
            <span className="text-sm">Page {page} / {pages}</span>
            <Button variant="outline" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </>
      )}
    </div>
  );
};

export default OrgDepartmentsPage;

