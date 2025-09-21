import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import personnelService from '@/services/personnelService';

const Row: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div className="flex text-sm"><div className="w-36 text-muted-foreground">{label}</div><div>{value ?? '-'}</div></div>
);

const OrgTitleDetailsPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { (async () => {
    if (!id) return; setLoading(true);
    try {
      const res = await personnelService.getTitle(id);
      const payload = res?.data || res;
      setData(payload);
      const label = payload?.TITLECODE || `#${id}`;
      navigate(location.pathname, { replace: true, state: { breadcrumbExtra: label } });
    } catch (e: any) { setError(e.message || 'Failed to load title'); }
    finally { setLoading(false); }
  })(); }, [id]);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader title={data?.TITLECODE || `Title #${id}`} description={data?.TITLENAME} showBackButton onBack={() => navigate('/org/titles')} />
      {error && <div className="text-red-500 text-sm">{error}</div>}
      {loading ? <div className="text-sm text-muted-foreground">Loading...</div> : data ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="p-4 space-y-2 lg:col-span-2">
            <div className="text-sm text-muted-foreground">Title</div>
            <Row label="Code" value={data.TITLECODE} />
            <Row label="Name" value={data.TITLENAME} />
            <Row label="Parent" value={data.PARENT_TITLECODE || data.TITLEPARENT} />
          </Card>
          {data.allFields && (
            <Card className="p-4 space-y-2">
              <div className="text-sm text-muted-foreground">Raw Record</div>
              <pre className="text-xs overflow-auto max-h-80 bg-muted/30 p-2 rounded">{JSON.stringify(data.allFields, null, 2)}</pre>
            </Card>
          )}
        </div>
      ) : (<Card className="p-4 text-sm text-muted-foreground">No data</Card>)}
    </div>
  );
};

export default OrgTitleDetailsPage;

