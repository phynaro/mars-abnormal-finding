import React, { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import workflowService, { type WorkflowType } from '@/services/workflowService';

const WorkflowTypesPage: React.FC = () => {
  const [rows, setRows] = useState<WorkflowType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await workflowService.getTypes();
        const list = Array.isArray(res?.data) ? res.data : [];
        setRows(list);
      } catch (e: any) {
        setError(e?.message || 'Failed to load workflow types');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Flexible getter to support different key casings coming from API
  const gv = (row: WorkflowType, keys: string[], fallback: any = '-') => {
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== null) return row[k];
    }
    return fallback;
  };

  const columns: { key: string; label: string; variants: string[] }[] = [
    { key: 'WFTypeNo', label: 'WF Type No', variants: ['WFTypeNo', 'WFTYPENO'] },
    { key: 'WFTypeCode', label: 'WF Type Code', variants: ['WFTypeCode', 'WFTYPECODE'] },
    { key: 'WFTypeName', label: 'WF Type Name', variants: ['WFTypeName', 'WFTYPENAME'] },
    { key: 'StatusTable', label: 'Status Table', variants: ['StatusTable', 'STATUSTABLE'] },
    { key: 'StatusFieldCode', label: 'Status Field Code', variants: ['StatusFieldCode', 'STATUSFIELDCODE'] },
    { key: 'StatusFieldName', label: 'Status Field Name', variants: ['StatusFieldName', 'STATUSFIELDNAME'] },
    { key: 'JobTypeTable', label: 'Job Type Table', variants: ['JobTypeTable', 'JOBTYPETABLE'] },
    { key: 'JobTypeFieldCode', label: 'Job Type Field Code', variants: ['JobTypeFieldCode', 'JOBTYPEFIELDCODE'] },
    { key: 'JobTypeFieldName', label: 'Job Type Field Name', variants: ['JobTypeFieldName', 'JOBTYPEFIELDNAME'] },
    { key: 'START_FLOW', label: 'Start Flow', variants: ['START_FLOW'] },
  ];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      columns.some(col => String(gv(r, col.variants, '')).toLowerCase().includes(q))
    );
  }, [rows, search]);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader title="Workflow Types" description="Browse workflow types from the workflow API" />

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <Input
          placeholder="Search by code or name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        {error && <div className="text-red-500 text-sm">{error}</div>}
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto rounded border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  {columns.map(col => (
                    <th key={col.key} className="px-4 py-2 whitespace-nowrap">{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, idx) => (
                  <tr key={String(gv(row, ['WFTypeNo','WFTYPENO'], idx))} className="border-t align-top">
                    {columns.map(col => (
                      <td key={col.key} className={`px-4 py-2 ${col.key === 'WFTypeCode' ? 'font-medium whitespace-nowrap' : 'whitespace-nowrap'}`}>
                        {String(gv(row, col.variants, '-'))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-3 lg:hidden">
            {filtered.map((row, idx) => (
              <Card key={String(gv(row, ['WFTypeNo','WFTYPENO'], idx))} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{String(gv(row, ['WFTypeCode','WFTYPECODE'], '-'))}</div>
                  <div className="text-xs text-muted-foreground">ID {String(gv(row, ['WFTypeNo','WFTYPENO'], '-'))}</div>
                </div>
                <div className="text-sm">{String(gv(row, ['WFTypeName','WFTYPENAME'], '-'))}</div>
                <div className="text-xs text-muted-foreground grid grid-cols-1 gap-1">
                  {columns
                    .filter(c => !['WFTypeNo','WFTypeCode','WFTypeName'].includes(c.key))
                    .map(c => (
                      <div key={c.key}><span className="uppercase tracking-wide mr-1">{c.label}</span>: {String(gv(row, c.variants, '-'))}</div>
                    ))}
                </div>
              </Card>
            ))}
          </div>

          {(!filtered || filtered.length === 0) && (
            <div className="text-sm text-muted-foreground">No workflow types found</div>
          )}
        </>
      )}
    </div>
  );
};

export default WorkflowTypesPage;
