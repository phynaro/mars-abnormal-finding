import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Clock, 
  User, 
  AlertTriangle, 
  MessageSquare, 
  FileText,
  ExternalLink
} from 'lucide-react';
import { ticketService } from '@/services/ticketService';
import type { Ticket } from '@/services/ticketService';
import { useToast } from '@/hooks/useToast';

interface ViewTicketModalProps {
  ticket: Ticket;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTicketUpdated: () => void;
}

export const ViewTicketModal: React.FC<ViewTicketModalProps> = ({
  ticket,
  open,
  onOpenChange,
  onTicketUpdated
}) => {
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [currentTicket, setCurrentTicket] = useState<Ticket>(ticket);
  const { toast } = useToast();

  // Fetch fresh ticket data when modal opens
  useEffect(() => {
    if (open && ticket.id) {
      fetchTicketDetails();
    }
  }, [open, ticket.id]);

  const fetchTicketDetails = async () => {
    try {
      const response = await ticketService.getTicketById(ticket.id);
      setCurrentTicket(response.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch ticket details',
        variant: 'destructive'
      });
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!comment.trim()) {
      return;
    }

    setLoading(true);
    try {
      await ticketService.addComment(ticket.id, comment);
      toast({
        title: 'Success',
        description: 'Comment added successfully',
        variant: 'default'
      });
      
      setComment('');
      fetchTicketDetails(); // Refresh ticket data to show new comment
      onTicketUpdated(); // Update parent component
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add comment',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertTriangle className="w-4 h-4" />;
      case 'assigned':
        return <User className="w-4 h-4" />;
      case 'in_progress':
        return <Clock className="w-4 h-4" />;
      case 'resolved':
        return <AlertTriangle className="w-4 h-4" />;
      case 'closed':
        return <AlertTriangle className="w-4 h-4" />;
      case 'rejected_pending_l3_review':
        return <AlertTriangle className="w-4 h-4" />;
      case 'rejected_final':
        return <AlertTriangle className="w-4 h-4" />;
      case 'completed':
        return <AlertTriangle className="w-4 h-4" />;
      case 'escalated':
        return <AlertTriangle className="w-4 h-4" />;
      case 'reopened_in_progress':
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const severityColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800'
  };

  const priorityColors = {
    low: 'bg-gray-100 text-gray-800',
    normal: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800'
  };

  const statusColors = {
    open: 'bg-blue-100 text-blue-800',
    assigned: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-purple-100 text-purple-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-800',
    rejected_pending_l3_review: 'bg-orange-100 text-orange-800',
    rejected_final: 'bg-red-100 text-red-800',
    completed: 'bg-green-100 text-green-800',
    escalated: 'bg-red-100 text-red-800',
    reopened_in_progress: 'bg-purple-100 text-purple-800'
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Ticket #{currentTicket.ticket_number}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Ticket Header */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold">{currentTicket.title}</h2>
                  <p className="text-gray-600 mt-1">{currentTicket.description}</p>
                </div>
                <div className="flex gap-2">
                  <Badge className={severityColors[currentTicket.severity_level]}>
                    {currentTicket.severity_level}
                  </Badge>
                  <Badge className={priorityColors[currentTicket.priority]}>
                    {currentTicket.priority}
                  </Badge>
                  <Badge className={statusColors[currentTicket.status]}>
                    {getStatusIcon(currentTicket.status)}
                    <span className="ml-1">{currentTicket.status.replace('_', ' ')}</span>
                  </Badge>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Ticket Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="font-medium">Ticket Number:</span>
                  <span className="text-gray-600">#{currentTicket.ticket_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">PUCODE:</span>
                  <span className="text-gray-600 font-mono">{currentTicket.pucode || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Created:</span>
                  <span className="text-gray-600">{formatDate(currentTicket.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Last Updated:</span>
                  <span className="text-gray-600">{formatDate(currentTicket.updated_at)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Assignment & Timing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Assignment & Timing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="font-medium">Reported By:</span>
                  <span className="text-gray-600">{currentTicket.reporter_name || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Assigned To:</span>
                  <span className="text-gray-600">
                    {currentTicket.assignee_name || currentTicket.assigned_to || 'Unassigned'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Cost Avoidance:</span>
                  <span className="text-gray-600">
                    {currentTicket.cost_avoidance 
                      ? `$${currentTicket.cost_avoidance.toFixed(2)}` 
                      : 'Not specified'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Downtime Avoidance:</span>
                  <span className="text-gray-600">
                    {currentTicket.downtime_avoidance_hours 
                      ? `${currentTicket.downtime_avoidance_hours}h` 
                      : 'Not recorded'
                    }
                  </span>
                </div>
                {currentTicket.resolved_at && (
                  <div className="flex justify-between">
                    <span className="font-medium">Resolved:</span>
                    <span className="text-gray-600">{formatDate(currentTicket.resolved_at)}</span>
                  </div>
                )}
                {currentTicket.closed_at && (
                  <div className="flex justify-between">
                    <span className="font-medium">Closed:</span>
                    <span className="text-gray-600">{formatDate(currentTicket.closed_at)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Status History */}
          {currentTicket.status_history && currentTicket.status_history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Status History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currentTicket.status_history.map((history) => (
                    <div key={history.id} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{history.new_status.replace('_', ' ')}</Badge>
                          <span className="text-sm text-gray-500">
                            {formatDate(history.changed_at)}
                          </span>
                        </div>
                        {history.notes && (
                          <p className="text-sm text-gray-600 mt-1">{history.notes}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Changed by: {history.changed_by_name || `User ${history.changed_by}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Comments ({currentTicket.comments?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Add Comment Form */}
              <form onSubmit={handleAddComment} className="mb-4">
                <div className="flex gap-2">
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a comment..."
                    rows={3}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={loading || !comment.trim()}>
                    {loading ? 'Adding...' : 'Add Comment'}
                  </Button>
                </div>
              </form>

              <Separator className="my-4" />

              {/* Comments List */}
              <div className="space-y-4">
                {currentTicket.comments && currentTicket.comments.length > 0 ? (
                  currentTicket.comments.map((comment) => (
                    <div key={comment.id} className="border-l-2 border-gray-200 pl-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-sm">
                          {comment.user_name || `User ${comment.user_id}`}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(comment.created_at)}
                        </span>
                      </div>
                      <p className="text-gray-700">{comment.comment}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No comments yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* View Full Details Button */}
          <div className="flex justify-center pt-4">
            <Link to={`/tickets/${currentTicket.id}`}>
              <Button variant="outline" className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                View Full Details Page
              </Button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
