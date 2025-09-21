import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import personnelService from '@/services/personnelService';

const OrgGroupDetailsPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [group, setGroup] = useState<any | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { (async () => {
    if (!id) return; setLoading(true);
    try {
      const res = await personnelService.getUserGroup(id);
      const payload = res?.data || res;
      setGroup(payload);
      const label = payload?.USERGROUPCODE || `#${id}`;
      navigate(location.pathname, { replace: true, state: { breadcrumbExtra: label } });
    } catch (e: any) { setError(e.message || 'Failed to load group'); }
    finally { setLoading(false); }
  })(); }, [id]);

  useEffect(() => { (async () => {
    if (!id) return; setLoading(true);
    try {
      const res = await personnelService.getUserGroupMembers(id, page, 20);
      const payload = res?.data || res;
      const arr = Array.isArray(payload) ? payload : (payload.data || []);
      setMembers(Array.isArray(arr) ? arr : []);
      const pgn = res?.pagination || payload?.pagination || {};
      setPages(Number(pgn.totalPages || pgn.pages) || 1);
    } catch (e: any) { setError(e.message || 'Failed to load members'); }
    finally { setLoading(false); }
  })(); }, [id, page]);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader title={group?.USERGROUPCODE || `Group #${id}`} description={group?.USERGROUPNAME} showBackButton onBack={() => navigate('/org/groups')} />
      {error && <div className="text-red-500 text-sm">{error}</div>}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4 space-y-2 lg:col-span-1">
          <div className="text-sm text-muted-foreground">Group Info</div>
          <div className="text-sm"><span className="text-muted-foreground">Code:</span> {group?.USERGROUPCODE}</div>
          <div className="text-sm"><span className="text-muted-foreground">Name:</span> {group?.USERGROUPNAME}</div>
        </Card>
        <Card className="p-4 space-y-2 lg:col-span-2">
          <div className="text-sm text-muted-foreground">Members</div>
          <div className="hidden lg:block overflow-x-auto rounded border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-2">Code</th>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Department</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={`${m.USERGROUPNO}-${m.PERSON}`} className="border-t">
                    <td className="px-4 py-2 whitespace-nowrap">{m.PERSONCODE}</td>
                    <td className="px-4 py-2">{m.PERSON_NAME || `${m.FIRSTNAME || ''} ${m.LASTNAME || ''}`}</td>
                    <td className="px-4 py-2">{m.EMAIL || '-'}</td>
                    <td className="px-4 py-2">{m.DEPTNAME || m.DEPTCODE || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-1 gap-2 lg:hidden">
            {members.map((m) => (
              <Card key={`${m.USERGROUPNO}-${m.PERSON}`} className="p-3">
                <div className="font-medium">{m.PERSONCODE}</div>
                <div className="text-sm">{m.PERSON_NAME || `${m.FIRSTNAME || ''} ${m.LASTNAME || ''}`}</div>
                <div className="text-xs text-muted-foreground">{m.EMAIL || '-'} • {m.DEPTCODE || '-'}</div>
              </Card>
            ))}
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
            <span className="text-sm">Page {page} / {pages}</span>
            <Button variant="outline" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default OrgGroupDetailsPage;

