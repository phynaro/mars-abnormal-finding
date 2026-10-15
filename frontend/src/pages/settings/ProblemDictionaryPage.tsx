import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/useToast';
import problemDictionaryService, {
  type BucketCounts,
  type BucketName,
  type BucketTicketRow,
  type ProblemPhrase,
} from '@/services/problemDictionaryService';

const PAGE_SIZE = 50;

const ProblemDictionaryPage: React.FC = () => {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [phrases, setPhrases] = useState<ProblemPhrase[]>([]);
  const [phraseSearch, setPhraseSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<'all' | 'part' | 'symptom'>('all');
  const [counts, setCounts] = useState<BucketCounts | null>(null);
  const [bucket, setBucket] = useState<BucketName>('full');
  const [rows, setRows] = useState<BucketTicketRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [rerunning, setRerunning] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newPhrase, setNewPhrase] = useState('');
  const [newKind, setNewKind] = useState<'part' | 'symptom'>('part');
  const [newCode, setNewCode] = useState('');

  const [editing, setEditing] = useState<ProblemPhrase | null>(null);
  const [editPhrase, setEditPhrase] = useState('');
  const [editKind, setEditKind] = useState<'part' | 'symptom'>('part');
  const [editCode, setEditCode] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const loadMeta = useCallback(async () => {
    setLoading(true);
    try {
      const [phraseRes, countRes] = await Promise.all([
        problemDictionaryService.getPhrases(),
        problemDictionaryService.getBucketCounts(),
      ]);
      setPhrases(phraseRes.data || []);
      setCounts(countRes.data);
    } catch (err) {
      toast({
        title: t('common.error'),
        description: err instanceof Error ? err.message : 'Failed to load dictionary',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  const loadBucket = useCallback(async () => {
    setRowsLoading(true);
    try {
      const res = await problemDictionaryService.getBucketTickets({
        bucket,
        page,
        limit: PAGE_SIZE,
      });
      setRows(res.data.rows || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      toast({
        title: t('common.error'),
        description: err instanceof Error ? err.message : 'Failed to load tickets',
        variant: 'destructive',
      });
    } finally {
      setRowsLoading(false);
    }
  }, [bucket, page, t, toast]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    loadBucket();
  }, [loadBucket]);

  const filteredPhrases = useMemo(() => {
    const q = phraseSearch.trim().toLowerCase();
    return phrases.filter((row) => {
      if (kindFilter !== 'all' && row.kind !== kindFilter) return false;
      if (!q) return true;
      return (
        row.phrase.toLowerCase().includes(q) ||
        row.code.toLowerCase().includes(q) ||
        row.kind.toLowerCase().includes(q)
      );
    });
  }, [phrases, phraseSearch, kindFilter]);

  const openEdit = (row: ProblemPhrase) => {
    setEditing(row);
    setEditPhrase(row.phrase);
    setEditKind(row.kind);
    setEditCode(row.code);
  };

  const closeEdit = () => {
    setEditing(null);
    setEditPhrase('');
    setEditCode('');
    setEditKind('part');
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    if (!editPhrase.trim() || !editCode.trim()) {
      toast({
        title: t('common.error'),
        description: t('settings.problemDictionary.phraseRequired'),
        variant: 'destructive',
      });
      return;
    }
    setEditSaving(true);
    try {
      await problemDictionaryService.updatePhrase(editing.id, {
        phrase: editPhrase.trim(),
        kind: editKind,
        code: editCode.trim(),
      });
      closeEdit();
      await loadMeta();
      toast({
        title: t('common.success'),
        description: t('settings.problemDictionary.phraseUpdated'),
      });
    } catch (err) {
      toast({
        title: t('common.error'),
        description: err instanceof Error ? err.message : 'Failed to update phrase',
        variant: 'destructive',
      });
    } finally {
      setEditSaving(false);
    }
  };

  const handleAddPhrase = async () => {
    if (!newPhrase.trim() || !newCode.trim()) {
      toast({
        title: t('common.error'),
        description: t('settings.problemDictionary.phraseRequired'),
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    try {
      await problemDictionaryService.createPhrase({
        phrase: newPhrase.trim(),
        kind: newKind,
        code: newCode.trim(),
      });
      setNewPhrase('');
      setNewCode('');
      await loadMeta();
      toast({
        title: t('common.success'),
        description: t('settings.problemDictionary.phraseAdded'),
      });
    } catch (err) {
      toast({
        title: t('common.error'),
        description: err instanceof Error ? err.message : 'Failed to add phrase',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePhrase = async (id: number) => {
    try {
      await problemDictionaryService.deletePhrase(id);
      await loadMeta();
      toast({
        title: t('common.success'),
        description: t('settings.problemDictionary.phraseDeleted'),
      });
    } catch (err) {
      toast({
        title: t('common.error'),
        description: err instanceof Error ? err.message : 'Failed to delete phrase',
        variant: 'destructive',
      });
    }
  };

  const handleRerun = async () => {
    setRerunning(true);
    try {
      const res = await problemDictionaryService.rerunClassification();
      setCounts(res.data);
      await loadBucket();
      toast({
        title: t('common.success'),
        description: t('settings.problemDictionary.rerunDone'),
      });
    } catch (err) {
      toast({
        title: t('common.error'),
        description: err instanceof Error ? err.message : 'Rerun failed',
        variant: 'destructive',
      });
    } finally {
      setRerunning(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const bucketLabel = (name: BucketName) => {
    const map: Record<BucketName, string> = {
      full: t('settings.problemDictionary.bucketFull'),
      part_only: t('settings.problemDictionary.bucketPartOnly'),
      symptom_only: t('settings.problemDictionary.bucketSymptomOnly'),
      none: t('settings.problemDictionary.bucketNone'),
    };
    return map[name];
  };

  const bucketCount = (name: BucketName) => {
    if (!counts) return 0;
    if (name === 'full') return counts.full;
    if (name === 'part_only') return counts.part_only;
    if (name === 'symptom_only') return counts.symptom_only;
    return counts.none;
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('settings.problemDictionary.title')}
          </h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            {t('settings.problemDictionary.guide')}
          </p>
        </div>
        <Button onClick={handleRerun} disabled={rerunning}>
          {rerunning ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          {t('settings.problemDictionary.rerun')}
        </Button>
      </div>

      {counts && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(['full', 'part_only', 'symptom_only', 'none'] as BucketName[]).map((name) => (
            <Card key={name}>
              <CardHeader className="pb-2">
                <CardDescription>{bucketLabel(name)}</CardDescription>
                <CardTitle className="text-2xl">{bucketCount(name)}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.problemDictionary.dictionary')}</CardTitle>
          <CardDescription>{t('settings.problemDictionary.dictionaryHint')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1.5 md:col-span-2">
              <Label>{t('settings.problemDictionary.phrase')}</Label>
              <Input
                value={newPhrase}
                onChange={(e) => setNewPhrase(e.target.value)}
                placeholder="air cut"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('settings.problemDictionary.kind')}</Label>
              <Select value={newKind} onValueChange={(v) => setNewKind(v as 'part' | 'symptom')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="part">{t('settings.problemDictionary.kindPart')}</SelectItem>
                  <SelectItem value="symptom">{t('settings.problemDictionary.kindSymptom')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('settings.problemDictionary.code')}</Label>
              <Input
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="air_cut"
              />
            </div>
          </div>
          <Button onClick={handleAddPhrase} disabled={saving || loading}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            {t('settings.problemDictionary.addPhrase')}
          </Button>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="relative flex-1 space-y-1.5">
              <Label htmlFor="phrase-search">{t('settings.problemDictionary.search')}</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="phrase-search"
                  className="pl-8"
                  value={phraseSearch}
                  onChange={(e) => setPhraseSearch(e.target.value)}
                  placeholder={t('settings.problemDictionary.searchPlaceholder')}
                />
              </div>
            </div>
            <div className="space-y-1.5 min-w-[140px]">
              <Label>{t('settings.problemDictionary.kind')}</Label>
              <Select
                value={kindFilter}
                onValueChange={(v) => setKindFilter(v as 'all' | 'part' | 'symptom')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('settings.problemDictionary.kindAll')}</SelectItem>
                  <SelectItem value="part">{t('settings.problemDictionary.kindPart')}</SelectItem>
                  <SelectItem value="symptom">{t('settings.problemDictionary.kindSymptom')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {filteredPhrases.length} / {phrases.length} {t('settings.problemDictionary.rows')}
          </p>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-3 py-2">{t('settings.problemDictionary.phrase')}</th>
                  <th className="px-3 py-2">{t('settings.problemDictionary.kind')}</th>
                  <th className="px-3 py-2">{t('settings.problemDictionary.code')}</th>
                  <th className="px-3 py-2 w-[100px]" />
                </tr>
              </thead>
              <tbody>
                {filteredPhrases.map((phrase) => (
                  <tr key={phrase.id} className="border-b last:border-0">
                    <td className="px-3 py-2 font-mono text-xs">{phrase.phrase}</td>
                    <td className="px-3 py-2">{phrase.kind}</td>
                    <td className="px-3 py-2 font-mono text-xs">{phrase.code}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(phrase)}
                          aria-label={t('settings.problemDictionary.editPhrase')}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletePhrase(phrase.id)}
                          aria-label={t('settings.problemDictionary.deletePhrase')}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && filteredPhrases.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                      {phrases.length === 0
                        ? t('settings.problemDictionary.noPhrases')
                        : t('settings.problemDictionary.noSearchResults')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('settings.problemDictionary.editPhrase')}</DialogTitle>
            <DialogDescription>
              {t('settings.problemDictionary.editPhraseHint')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>{t('settings.problemDictionary.phrase')}</Label>
              <Input value={editPhrase} onChange={(e) => setEditPhrase(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('settings.problemDictionary.kind')}</Label>
              <Select value={editKind} onValueChange={(v) => setEditKind(v as 'part' | 'symptom')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="part">{t('settings.problemDictionary.kindPart')}</SelectItem>
                  <SelectItem value="symptom">{t('settings.problemDictionary.kindSymptom')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('settings.problemDictionary.code')}</Label>
              <Input value={editCode} onChange={(e) => setEditCode(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEdit} disabled={editSaving}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveEdit} disabled={editSaving}>
              {editSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.problemDictionary.bucketsTitle')}</CardTitle>
          <CardDescription>{t('settings.problemDictionary.bucketsHint')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={bucket}
            onValueChange={(v) => {
              setBucket(v as BucketName);
              setPage(1);
            }}
          >
            <TabsList className="mb-4 flex h-auto flex-wrap">
              {(['full', 'part_only', 'symptom_only', 'none'] as BucketName[]).map((name) => (
                <TabsTrigger key={name} value={name}>
                  {bucketLabel(name)} ({bucketCount(name)})
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={bucket} className="space-y-3">
              {rowsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('common.loading')}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-left">
                        <th className="px-3 py-2">{t('settings.problemDictionary.ticketNumber')}</th>
                        <th className="px-3 py-2">{t('settings.problemDictionary.ticketTitle')}</th>
                        <th className="px-3 py-2">{t('settings.problemDictionary.position')}</th>
                        <th className="px-3 py-2">{t('settings.problemDictionary.plant')}</th>
                        <th className="px-3 py-2">{t('settings.problemDictionary.created')}</th>
                        <th className="px-3 py-2">{t('settings.problemDictionary.partCode')}</th>
                        <th className="px-3 py-2">{t('settings.problemDictionary.symptomCode')}</th>
                        <th className="px-3 py-2">{t('settings.problemDictionary.symptomSource')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.id} className="border-b last:border-0 align-top">
                          <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">
                            {row.ticket_number}
                          </td>
                          <td className="px-3 py-2 max-w-[280px]">{row.title}</td>
                          <td className="px-3 py-2 font-mono text-xs">{row.pucode || row.puno || '—'}</td>
                          <td className="px-3 py-2">{row.plant || '—'}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs">
                            {row.created_at ? new Date(row.created_at).toLocaleString() : '—'}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">{row.part_code || '—'}</td>
                          <td className="px-3 py-2 font-mono text-xs">{row.symptom_code || '—'}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">
                            {row.symptom_source === 'failure_mode'
                              ? t('settings.problemDictionary.sourceFailureMode')
                              : row.symptom_source === 'title'
                                ? t('settings.problemDictionary.sourceTitle')
                                : '—'}
                          </td>
                        </tr>
                      ))}
                      {rows.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                            {t('settings.problemDictionary.noRows')}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {total} {t('settings.problemDictionary.rows')}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    {t('common.previous')}
                  </Button>
                  <span>
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    {t('common.next')}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default ProblemDictionaryPage;
