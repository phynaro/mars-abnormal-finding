import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import personnelService from '@/services/personnelService';
import userManagementService from '@/services/userManagementService';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';

const Row: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div className="flex text-sm"><div className="w-36 text-muted-foreground">{label}</div><div>{value ?? '-'}</div></div>
);

const OrgUserDetailsPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable fields state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState<string>('');
  const [siteNo, setSiteNo] = useState<string>('');
  const [lineId, setLineId] = useState('');
  const [userIdStr, setUserIdStr] = useState<string>('');
  const [groupNo, setGroupNo] = useState<string>('');
  const [titleName, setTitleName] = useState<string>('');

  // Options
  const [deptOptions, setDeptOptions] = useState<Array<{ id: number; code?: string; name?: string; path?: string }>>([]);
  const [titleOptions, setTitleOptions] = useState<Array<{ id: number; code?: string; name?: string }>>([]);
  const [groupOptions, setGroupOptions] = useState<Array<{ groupNo: number; groupCode: string; groupName: string }>>([]);

  useEffect(() => { (async () => {
    if (!id) return; setLoading(true);
    try {
      const res = await personnelService.getPerson(id);
      const payload = res?.data || res;
      setData(payload);
      const label = payload?.PERSONCODE || `#${id}`;
      navigate(location.pathname, { replace: true, state: { breadcrumbExtra: label } });
      // Prefill editable form values from person info
      setFirstName(payload?.FIRSTNAME || '');
      setLastName(payload?.LASTNAME || '');
      setEmail(payload?.EMAIL || '');
      setPhone(payload?.PHONE || '');
      setTitle(payload?.TITLE || '');
      setDepartment(String(payload?.DEPTNO || ''));
      setSiteNo(String(payload?.SiteNo || ''));
      setTitleName(payload?.TITLENAME || payload?.TITLE || '');

      // Try to find corresponding userId (UserID string) via admin listing
      try {
        const allUsers = await userManagementService.getAllUsers();
        const match = Array.isArray(allUsers) ? allUsers.find((u: any) => String(u.id) === String(payload?.PERSONNO)) : null;
        if (match?.userId) setUserIdStr(String(match.userId));
        if (match?.lineId) setLineId(String(match.lineId));
        if (match?.groupNo) setGroupNo(String(match.groupNo));
      } catch {
        // ignore if not admin or cannot fetch
      }
    } catch (e: any) { setError(e.message || 'Failed to load user'); }
    finally { setLoading(false); }
  })(); }, [id]);

  // Load options when opening editor
  useEffect(() => {
    if (!editOpen) return;
    (async () => {
      try {
        const [deps, titles] = await Promise.all([
          personnelService.getDepartments({ page: 1, limit: 500 }),
          personnelService.getTitles({ page: 1, limit: 500 })
        ]);
        const depArr = Array.isArray(deps?.data) ? deps.data : (Array.isArray(deps) ? deps : []);
        const titArr = Array.isArray(titles?.data) ? titles.data : (Array.isArray(titles) ? titles : []);
        setDeptOptions(depArr.map((d: any) => ({ id: d.DEPTNO, code: d.DEPTCODE, name: d.DEPTNAME })));
        setTitleOptions(titArr.map((t: any) => ({ id: t.TITLENO, code: t.TITLECODE, name: t.TITLENAME })));
      } catch {}
      try {
        const groups = await userManagementService.getGroups();
        setGroupOptions(groups);
      } catch {}
    })();
  }, [editOpen]);

  const canEdit = true; // criteria to be added later

  const onSave = async () => {
    if (!userIdStr) {
      alert('Unable to resolve user id for update (requires admin).');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        email: email || undefined,
        phone: phone || undefined,
        title: titleName || title || undefined,
        department: department ? Number(department) : undefined,
        siteNo: siteNo ? Number(siteNo) : undefined,
        lineId: lineId || undefined,
        groupNo: groupNo ? Number(groupNo) : undefined,
      };
      await userManagementService.updateUser(userIdStr, payload);
      setEditOpen(false);
      // Refresh details
      try {
        const res = await personnelService.getPerson(id!);
        setData(res?.data || res);
      } catch {}
      alert('User updated');
    } catch (e: any) {
      alert(e?.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader title={data?.PERSONCODE || `User #${id}`} description={data?.PERSON_NAME} showBackButton onBack={() => navigate('/org/users')} />
      {canEdit && (
        <div>
          <Button onClick={() => setEditOpen(true)}>Modify</Button>
        </div>
      )}
      {error && <div className="text-red-500 text-sm">{error}</div>}
      {loading ? <div className="text-sm text-muted-foreground">Loading...</div> : data ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="p-4 space-y-2 lg:col-span-2">
            <div className="text-sm text-muted-foreground">Profile</div>
            <Row label="Code" value={data.PERSONCODE} />
            <Row label="Name" value={data.PERSON_NAME || `${data.FIRSTNAME || ''} ${data.LASTNAME || ''}`} />
            <Row label="Email" value={data.EMAIL} />
            <Row label="Phone" value={data.PHONE} />
            <Row label="Department" value={`${data.DEPTCODE || ''} ${data.DEPTNAME ? `- ${data.DEPTNAME}` : ''}`} />
            <Row label="Title" value={`${data.TITLECODE || ''} ${data.TITLENAME ? `- ${data.TITLENAME}` : ''}`} />
          </Card>
          {data.allFields && (
            <Card className="p-4 space-y-2">
              <div className="text-sm text-muted-foreground">Raw Record</div>
              <pre className="text-xs overflow-auto max-h-80 bg-muted/30 p-2 rounded">{JSON.stringify(data.allFields, null, 2)}</pre>
            </Card>
          )}
        </div>
      ) : (<Card className="p-4 text-sm text-muted-foreground">No data</Card>)}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>First Name</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Last Name</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Title</Label>
              <Select value={titleName} onValueChange={setTitleName}>
                <SelectTrigger>
                  <SelectValue placeholder="Select title" />
                </SelectTrigger>
                <SelectContent>
                  {titleOptions.map(t => (
                    <SelectItem key={t.id} value={t.name || ''}>{t.code ? `${t.code} - ` : ''}{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Department</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {deptOptions.map(d => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.code ? `${d.code} - ` : ''}{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Site No</Label>
              <Input value={siteNo} onChange={(e) => setSiteNo(e.target.value)} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>LINE User ID</Label>
              <Input value={lineId} onChange={(e) => setLineId(e.target.value)} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>User Group</Label>
              <Select value={groupNo} onValueChange={setGroupNo}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user group" />
                </SelectTrigger>
                <SelectContent>
                  {groupOptions.map(g => (
                    <SelectItem key={g.groupNo} value={String(g.groupNo)}>{g.groupCode} - {g.groupName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={onSave} disabled={saving || !userIdStr}>Save</Button>
          </div>
          {!userIdStr && (
            <div className="text-xs text-yellow-600 mt-2">Note: To update, admin access is required to resolve the user's account ID.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrgUserDetailsPage;
