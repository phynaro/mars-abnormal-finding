import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ticketService } from '@/services/ticketService';
import type { Ticket } from '@/services/ticketService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { PageHeader } from '@/components/common/PageHeader';
import { 
  ArrowLeft, 
  Clock, 
  User, 
  AlertTriangle, 
  Calendar,
  MessageSquare,
  History,
  Trash2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import authService from '@/services/authService';

const TicketDetailsPage: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  // Separate file queues for before/after uploads
  const [beforeFiles, setBeforeFiles] = useState<File[]>([]);
  const [afterFiles, setAfterFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [progressMap, setProgressMap] = useState<Record<number, number>>({});
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const { user } = useAuth();
  // Action modal hooks must be declared before any early returns
  type ActionType = 'accept' | 'reject' | 'complete' | 'escalate' | 'close' | 'reopen' | 'reassign';
  const [actionOpen, setActionOpen] = useState(false);
  const [actionType, setActionType] = useState<ActionType>('accept');
  const [actionComment, setActionComment] = useState('');
  const [actionNumber, setActionNumber] = useState('');
  const [actionExtraId, setActionExtraId] = useState('');
  const [escalateToL3, setEscalateToL3] = useState(false);
  const [acting, setActing] = useState(false);
  const isL2Plus = (user?.permissionLevel || 0) >= 2;
  const isL3Plus = (user?.permissionLevel || 0) >= 3;

  // Reassign modal helper state (loaded regardless of status to keep hook order stable)
  const [assigneeQuery, setAssigneeQuery] = useState('');
  const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);
  const [assignees, setAssignees] = useState<Array<{ id: number; name: string; email?: string }>>([]);
  const [assigneesLoading, setAssigneesLoading] = useState(false);

  useEffect(() => {
    if (ticketId) {
      fetchTicketDetails();
    } else {
      setError('No ticket ID provided');
      setLoading(false);
    }
  }, [ticketId]);

  const fetchTicketDetails = async () => {
    try {
      setLoading(true);
      const response = await ticketService.getTicketById(parseInt(ticketId!));
      if (response.success) {
        setTicket(response.data);
      } else {
        setError('Failed to fetch ticket details');
      }
    } catch (err) {
      console.error('Error fetching ticket:', err);
      setError('An error occurred while fetching ticket details');
    } finally {
      setLoading(false);
    }
  };

  const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');
  const uploadsBase = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;
  // Load assignees on query change (keep hooks consistent regardless of visibility)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setAssigneesLoading(true);
        const res = await ticketService.getAvailableAssignees(assigneeQuery || undefined);
        if (!cancelled) setAssignees(res.data || []);
      } catch (e) {
        if (!cancelled) setAssignees([]);
      } finally {
        if (!cancelled) setAssigneesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [assigneeQuery]);

  // Upload with per-file progress using XMLHttpRequest
  const handleImageUpload = async (imageType: 'before' | 'after') => {
    if (!ticket) return;
    const selectedFiles = imageType === 'before' ? beforeFiles : afterFiles;
    if (selectedFiles.length === 0) return;
    setUploading(true);
    setProgressMap({});
    try {
      const token = authService.getToken();
      if (!token) throw new Error('Not authenticated');

      // Upload files sequentially to get per-file progress
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', `${apiBase}/tickets/${ticket.id}/images`);
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          const form = new FormData();
          form.append('image', file);
          form.append('image_type', imageType);
          form.append('image_name', file.name);
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const percent = Math.round((e.loaded / e.total) * 100);
              setProgressMap((prev) => ({ ...prev, [i]: percent }));
            }
          };
          xhr.onerror = () => reject(new Error('Network error during upload'));
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              setProgressMap((prev) => ({ ...prev, [i]: 100 }));
              resolve();
            } else {
              try {
                const res = JSON.parse(xhr.responseText || '{}');
                reject(new Error(res.message || `Upload failed (${xhr.status})`));
              } catch {
                reject(new Error(`Upload failed (${xhr.status})`));
              }
            }
          };
          xhr.send(form);
        });
      }
      await fetchTicketDetails();
      if (imageType === 'before') setBeforeFiles([]);
      if (imageType === 'after') setAfterFiles([]);
    } catch (e) {
      console.error('Upload failed:', e);
      alert(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files || []).filter((f) => f.type.startsWith('image/'));
    if (files.length) setBeforeFiles(files);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-orange-600 text-white';
      case 'medium': return 'bg-yellow-600 text-white';
      case 'low': return 'bg-blue-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'open': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
      case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !ticket) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Ticket Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error || 'The requested ticket could not be found.'}</p>
          <Button onClick={() => navigate('/tickets')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tickets
          </Button>
        </div>
      </div>
    );
  }

  // Derived helpers
  const isRejected = ticket?.status === 'rejected_final' || ticket?.status === 'rejected_pending_l3_review';
  const isClosed = ticket?.status === 'closed';
  const uploadAllowed = !(isClosed || isRejected);

  // Action modal state moved above (before early returns)

  const openAction = (type: ActionType) => {
    setActionType(type);
    setActionComment('');
    setActionNumber('');
    setActionExtraId('');
    setEscalateToL3(false);
    setActionOpen(true);
  };

  const performAction = async () => {
    if (!ticket) return;
    setActing(true);
    try {
      switch (actionType) {
        case 'accept':
          await ticketService.acceptTicket(ticket.id, actionComment || undefined);
          break;
        case 'reject':
          await ticketService.rejectTicket(ticket.id, actionComment || 'Rejected', escalateToL3);
          break;
        case 'complete': {
          const hours = actionNumber !== '' ? parseFloat(actionNumber) : undefined;
          await ticketService.completeTicket(ticket.id, actionComment || undefined, hours);
          break;
        }
        case 'escalate': {
          const toId = parseInt(actionExtraId || '0', 10);
          if (!toId) throw new Error('Escalated to (user id) is required');
          await ticketService.escalateTicket(ticket.id, actionComment || 'Escalated', toId);
          break;
        }
        case 'close': {
          const rating = actionNumber !== '' ? parseInt(actionNumber, 10) : undefined;
          await ticketService.closeTicket(ticket.id, actionComment || 'Closed', rating);
          break;
        }
        case 'reopen':
          await ticketService.reopenTicket(ticket.id, actionComment || 'Reopened');
          break;
        case 'reassign': {
          const toId = parseInt(actionExtraId || '0', 10);
          if (!toId) throw new Error('New assignee (user id) is required');
          await ticketService.reassignTicket(ticket.id, toId, actionComment || undefined);
          break;
        }
      }
      await fetchTicketDetails();
      setActionOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title={`Ticket #${ticket.ticket_number}`}
        showBackButton={true}
        onBack={() => navigate('/tickets')}
        rightContent={
          <>
            {isL2Plus && (['open','reopened_in_progress','rejected_pending_l3_review'].includes(ticket.status)) && (
              <Button onClick={() => openAction('accept')}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Accept
              </Button>
            )}
            {isL2Plus && (['open','rejected_pending_l3_review'].includes(ticket.status)) && (
              <Button variant="destructive" onClick={() => openAction('reject')}>
                <XCircle className="mr-2 h-4 w-4" /> Reject
              </Button>
            )}
            {isL2Plus && ticket.status === 'in_progress' && (
              <>
                <Button onClick={() => openAction('complete')}>Complete</Button>
                <Button variant="outline" onClick={() => openAction('escalate')}>Escalate</Button>
              </>
            )}
            {user && user.id === ticket.reported_by && ticket.status === 'completed' && (
              <>
                <Button onClick={() => openAction('close')}>Close</Button>
                <Button variant="outline" onClick={() => openAction('reopen')}>Reopen</Button>
              </>
            )}
            {isL3Plus && (ticket.status === 'rejected_pending_l3_review' || ticket.status === 'escalated') && (
              <Button variant="outline" onClick={() => openAction('reassign')}>Reassign</Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Combined Title + Description + Affected Point */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Title */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Title</label>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{ticket.title}</p>
              </div>
              {/* Description */}
              <div className="mb-6">
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Description</label>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{ticket.description}</p>
              </div>
              {/* Affected Point */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Affected Point</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Type</label>
                    <p className="text-gray-900 dark:text-gray-100 capitalize">{ticket.affected_point_type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</label>
                    <p className="text-gray-900 dark:text-gray-100">{ticket.affected_point_name}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>



          {/* Images Section split into Before / After */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Images
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* BEFORE */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">Before</h3>
                  {!uploadAllowed && (
                    <span className="text-xs text-gray-500">Upload disabled for closed/rejected tickets</span>
                  )}
                </div>
                {uploadAllowed && (
                  <div className="grid md:grid-cols-3 gap-4 items-end mb-3">
                    <div className="space-y-2">
                      <Label>Image File</Label>
                      <Input type="file" accept="image/*" multiple onChange={(e) => setBeforeFiles(Array.from(e.target.files || []))} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Button className="w-full md:w-auto" disabled={beforeFiles.length === 0 || uploading} onClick={() => handleImageUpload('before')}>
                        {uploading ? 'Uploading...' : beforeFiles.length > 1 ? `Upload ${beforeFiles.length} Images` : 'Upload Image'}
                      </Button>
                      {beforeFiles.length > 0 && (
                        <Button variant="outline" size="sm" className="ml-2" onClick={() => setBeforeFiles([])} disabled={uploading}>Clear</Button>
                      )}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {ticket.images?.filter(img => img.image_type === 'before').map((img) => (
                    <div key={img.id} className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden relative group">
                      <img
                        src={`${uploadsBase}${img.image_url}`}
                        alt={img.image_name}
                        className="w-full h-40 object-cover cursor-pointer"
                        onClick={() => { const idx = ticket.images?.findIndex(i => i.id === img.id) ?? 0; setLightboxIndex(idx); setLightboxOpen(true); }}
                      />
                      <div className="p-2 text-sm">
                        <div className="font-medium truncate text-gray-900 dark:text-gray-100">{img.image_name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{img.image_type}</div>
                      </div>
                      {(user && (user.permissionLevel >= 2 || user.id === ticket.reported_by || user.id === ticket.assigned_to)) && (
                        <button
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 hover:bg-white border rounded p-1"
                          title="Delete image"
                          onClick={async () => {
                            try {
                              await ticketService.deleteTicketImage(ticket.id, img.id);
                              await fetchTicketDetails();
                            } catch (e) {
                              alert(e instanceof Error ? e.message : 'Failed to delete image');
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* AFTER */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">After</h3>
                </div>
                {uploadAllowed && (
                  <div className="grid md:grid-cols-3 gap-4 items-end mb-3">
                    <div className="space-y-2">
                      <Label>Image File</Label>
                      <Input type="file" accept="image/*" multiple onChange={(e) => setAfterFiles(Array.from(e.target.files || []))} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Button className="w-full md:w-auto" disabled={afterFiles.length === 0 || uploading} onClick={() => handleImageUpload('after')}>
                        {uploading ? 'Uploading...' : afterFiles.length > 1 ? `Upload ${afterFiles.length} Images` : 'Upload Image'}
                      </Button>
                      {afterFiles.length > 0 && (
                        <Button variant="outline" size="sm" className="ml-2" onClick={() => setAfterFiles([])} disabled={uploading}>Clear</Button>
                      )}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {ticket.images?.filter(img => img.image_type === 'after').map((img) => (
                    <div key={img.id} className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden relative group">
                      <img
                        src={`${uploadsBase}${img.image_url}`}
                        alt={img.image_name}
                        className="w-full h-40 object-cover cursor-pointer"
                        onClick={() => { const idx = ticket.images?.findIndex(i => i.id === img.id) ?? 0; setLightboxIndex(idx); setLightboxOpen(true); }}
                      />
                      <div className="p-2 text-sm">
                        <div className="font-medium truncate text-gray-900 dark:text-gray-100">{img.image_name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{img.image_type}</div>
                      </div>
                      {(user && (user.permissionLevel >= 2 || user.id === ticket.reported_by || user.id === ticket.assigned_to)) && (
                        <button
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 hover:bg-white border rounded p-1"
                          title="Delete image"
                          onClick={async () => {
                            try {
                              await ticketService.deleteTicketImage(ticket.id, img.id);
                              await fetchTicketDetails();
                            } catch (e) {
                              alert(e instanceof Error ? e.message : 'Failed to delete image');
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status History moved to sidebar */}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Ticket Info */}
          <Card>
            <CardHeader>
              <CardTitle>Ticket Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</span>
                <Badge className={getStatusColor(ticket.status)}>
                  {ticket.status?.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Priority</span>
                <Badge className={getPriorityColor(ticket.priority)}>
                  {ticket.priority?.toUpperCase()}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Severity</span>
                <Badge className={getSeverityColor(ticket.severity_level)}>
                  {ticket.severity_level?.toUpperCase()}
                </Badge>
              </div>

              <Separator />

              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{ticket.reporter_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Reporter</p>
                </div>
              </div>

              {ticket.assignee_name && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{ticket.assignee_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Assigned To</p>
                  </div>
                </div>
              )}

              <Separator />

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Created</p>
                </div>
              </div>

              {ticket.estimated_downtime_hours && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {ticket.estimated_downtime_hours} hours
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Estimated Downtime</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status History (now in sidebar, below Ticket Info) */}
          {ticket.status_history && ticket.status_history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Status History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {ticket.status_history.map((status, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <div className="flex-1">
                        <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">{status.new_status}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">by {status.changed_by_name}</span>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{new Date(status.changed_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Comment section: add + list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Comments {ticket.comments ? `(${ticket.comments.length})` : ''}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!isClosed && (
                <div className="mb-6">
                  <Label htmlFor="new-comment" className="mb-2 block">Add Comment</Label>
                  <Textarea id="new-comment" rows={3} value={actionComment} onChange={(e) => setActionComment(e.target.value)} placeholder="Write a comment..." />
                  <div className="flex justify-end mt-2">
                    <Button onClick={async () => {
                      try {
                        if (!ticket) return;
                        const text = (actionComment || '').trim();
                        if (!text) return;
                        await ticketService.addComment(ticket.id, text);
                        setActionComment('');
                        await fetchTicketDetails();
                      } catch (err) {
                        alert(err instanceof Error ? err.message : 'Failed to add comment');
                      }
                    }}>Post Comment</Button>
                  </div>
                </div>
              )}

              {ticket.comments && ticket.comments.length > 0 ? (
                <div className="space-y-4">
                  {ticket.comments.map((comment, index) => (
                    <div key={index} className="border-l-4 border-blue-500 pl-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100">{comment.user_name || `User ${comment.user_id}`}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(comment.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300">{comment.comment}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 dark:text-gray-400">No comments yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1"></div>
      </div>

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl">
          {ticket && ticket.images && ticket.images[lightboxIndex] && (
            <div className="relative">
              <img
                src={`${uploadsBase}${ticket.images[lightboxIndex].image_url}`}
                alt={ticket.images[lightboxIndex].image_name}
                className="w-full h-auto"
              />
              <div className="flex justify-between mt-2">
                <Button
                  variant="outline"
                  onClick={() => setLightboxIndex((prev) => (prev - 1 + ticket.images!.length) % ticket.images!.length)}
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setLightboxIndex((prev) => (prev + 1) % ticket.images!.length)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Action Modal with comment */}
      <Dialog open={actionOpen} onOpenChange={setActionOpen}>
        <DialogContent className="max-w-lg">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold capitalize">{actionType.replace('_', ' ')}</h3>
            <div className="space-y-2">
              <Label>{actionType === 'reject' ? 'Rejection Reason' : actionType === 'close' ? 'Close Reason' : actionType === 'reopen' ? 'Reopen Reason' : 'Notes'}</Label>
              <Textarea rows={3} value={actionComment} onChange={(e) => setActionComment(e.target.value)} />
            </div>
            {actionType === 'complete' && (
              <div className="space-y-2">
                <Label>Actual Downtime (hours)</Label>
                <Input type="number" step="0.5" min="0" value={actionNumber} onChange={(e) => setActionNumber(e.target.value)} />
              </div>
            )}
            {actionType === 'close' && (
              <div className="space-y-2">
                <Label>Satisfaction Rating (1-5)</Label>
                <Input type="number" min="1" max="5" value={actionNumber} onChange={(e) => setActionNumber(e.target.value)} />
              </div>
            )}
            {actionType === 'reassign' && (
              <div className="space-y-2">
                <Label>New Assignee</Label>
                <div className="relative">
                  <Input
                    value={assigneeQuery}
                    onChange={(e) => { setAssigneeQuery(e.target.value); setAssigneeDropdownOpen(true); }}
                    onFocus={() => setAssigneeDropdownOpen(true)}
                    placeholder="Search L2/L3 user by name/email"
                  />
                  {assigneeDropdownOpen && (
                    <div className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
                      {assigneesLoading ? (
                        <div className="p-3 text-sm text-gray-500">Searching…</div>
                      ) : assignees.length === 0 ? (
                        <div className="p-3 text-sm text-gray-500">No users found</div>
                      ) : (
                        assignees.map((u) => (
                          <button
                            type="button"
                            key={u.id}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                            onClick={() => { setActionExtraId(String(u.id)); setAssigneeQuery(u.name); setAssigneeDropdownOpen(false); }}
                          >
                            <div className="font-medium">{u.name}</div>
                            <div className="text-xs text-gray-500">{u.email}</div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {actionExtraId && (
                  <div className="text-xs text-gray-600">Selected user ID: {actionExtraId}</div>
                )}
              </div>
            )}
            {actionType === 'escalate' && (
              <div className="space-y-2">
                <Label>Escalate To (User ID)</Label>
                <Input type="number" min="1" value={actionExtraId} onChange={(e) => setActionExtraId(e.target.value)} />
              </div>
            )}
            {actionType === 'reject' && (
              <div className="flex items-center gap-2">
                <input id="escalateToL3" type="checkbox" checked={escalateToL3} onChange={(e) => setEscalateToL3(e.target.checked)} />
                <Label htmlFor="escalateToL3">Escalate to L3 for review</Label>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setActionOpen(false)} disabled={acting}>Cancel</Button>
              <Button onClick={performAction} disabled={acting || (actionType === 'reassign' && !actionExtraId)}>{acting ? 'Working…' : 'Confirm'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TicketDetailsPage;
