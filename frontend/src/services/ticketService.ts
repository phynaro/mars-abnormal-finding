import { authService } from './authService';
import { canUserPerformAction, getActionsForLevel, type ActionType } from './administrationService';
import { getAuthHeaders, getAuthHeadersNoContentType } from '../utils/authHeaders';

export interface Ticket {
  id: number;
  ticket_number: string;
  title: string;
  description: string;
  pucode?: string; // New field for PUCODE
  puno?: number; // New field for PU ID
  pucriticalno?: number; // New field for Critical Level
  cedar_wocode?: string; // CEDAR work order code
  cedar_wono?: number; // CEDAR work order number
  cedar_sync_status?: string; // Cedar sync status (success, error, pending, syncing)
  cedar_last_sync?: string; // Last sync timestamp
  cedar_sync_error?: string; // Cedar sync error message
  plant_id?: number;
  area_id?: number;
  line_id?: number;
  machine_id?: number;
  machine_number?: number;
  cost_avoidance?: number;
  downtime_avoidance_hours?: number;
  failure_mode_id?: number;
  failure_mode_code?: string;
  failure_mode_name?: string;
  severity_level: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'accepted' | 'planed' | 'in_progress' | 'rejected_pending_l3_review' | 'rejected_final' | 'finished' | 'reviewed' | 'escalated' | 'closed' | 'reopened_in_progress';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_by: number;
  assigned_to?: number;
  created_at: string;
  updated_at: string;
  approved_at?: string;
  schedule_finish?: string;
  schedule_start?: string;
  planed_at?: string;
  // Workflow tracking fields
  accepted_at?: string;
  accepted_by?: number;
  rejected_at?: string;
  rejected_by?: number;
  finished_at?: string;
  finished_by?: number;
  escalated_at?: string;
  escalated_by?: number;
  reopened_at?: string;
  reopened_by?: number;
  reviewed_at?: string;
  reviewed_by?: number;
  approved_by?: number;
  actual_start_at?: string;
  actual_finish_at?: string;
  reporter_name?: string;
  reporter_email?: string;
  reporter_phone?: string;
  assignee_name?: string;
  assignee_email?: string;
  assignee_phone?: string;
  // Workflow user names
  accepted_by_name?: string;
  rejected_by_name?: string;
  finished_by_name?: string;
  reviewed_by_name?: string;
  escalated_by_name?: string;
  approved_by_name?: string;
  reopened_by_name?: string;
 
  // Hierarchy names
  plant_name?: string;
  plant_code?: string;
  area_name?: string;
  area_code?: string;
  line_name?: string;
  line_code?: string;
  machine_name?: string;
  machine_code?: string;
  equipment_id?: number;
  equipment_code?: string;
  equipment_name?: string;
  PUNAME?: string; // From PU table
  pu_name?: string; // PU name from new schema
  pu_pucode?: string; // From PU table
  pudescription?: string; // From PUExtension table
  digit_count?: number; // From PUExtension table
  images?: TicketImage[];
  comments?: TicketComment[];
  status_history?: TicketStatusHistory[];
  // User relationship and approval level for current user
  user_relationship?: 'creator' | 'approver' | 'viewer';
  user_approval_level?: number;
}

export interface TicketImage {
  id: number;
  ticket_id: number;
  image_type: 'before' | 'after' | 'other';
  image_url: string;
  image_name: string;
  uploaded_at: string;
  uploaded_by: number;
}

export interface TicketComment {
  id: number;
  ticket_id: number;
  user_id: number;
  comment: string;
  created_at: string;
  user_name?: string;
  user_email?: string;
  user_avatar_url?: string;
}

export interface TicketStatusHistory {
  id: number;
  ticket_id: number;
  old_status?: string;
  new_status: string;
  changed_by: number;
  changed_at: string;
  notes?: string;
  changed_by_name?: string;
  to_user?: number;
  to_user_name?: string;
  to_user_email?: string;
}

export interface CreateTicketRequest {
  title: string;
  description: string;
  pucode?: string; // New field for PUCODE
  puno?: number; // New field for PU ID
  equipment_id?: number; // New field for Equipment ID
  pucriticalno?: number; // New field for Critical Level
  plant_id?: number;
  area_id?: number;
  line_id?: number;
  machine_id?: number;
  machine_number?: number;
  cost_avoidance?: number;
  downtime_avoidance_hours?: number;
  failure_mode_id?: number;
  severity_level?: 'low' | 'medium' | 'high' | 'critical';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  suggested_assignee_id?: number;
  schedule_finish?: string;
}

export interface UpdateTicketRequest {
  title?: string;
  description?: string;
  severity_level?: 'low' | 'medium' | 'high' | 'critical';
  status?: 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  estimated_downtime_hours?: number;
  actual_downtime_hours?: number;
  assigned_to?: number;
  status_notes?: string;
}

export interface TicketFilters {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  severity_level?: string;
  assigned_to?: number;
  created_by?: number;
  search?: string;
  plant?: string;  // Plant code from PUExtension
  area?: string;   // Area code from PUExtension
}

// Legacy hierarchy interfaces (deprecated - use PUExtension data instead)
// These remain for backward compatibility but are no longer actively used

export interface PendingTicket {
  id: number;
  ticket_number: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'pending_approval' | 'pending_assignment' | 'accepted' | 'planed' | 'rejected_pending_l3_review' | 'rejected_final' | 'finished' | 'reviewed' | 'escalated' | 'closed' | 'reopened_in_progress';
  priority: 'urgent' | 'high' | 'medium' | 'low' | 'normal';
  severity_level: 'critical' | 'high' | 'medium' | 'low';
  created_at: string;
  updated_at: string;
  assigned_to?: number;
  created_by: number;
  // Updated to use PUExtension hierarchy
  plant_name?: string;
  plant_code?: string;
  area_name?: string;
  area_code?: string;
  line_name?: string;
  line_code?: string;
  // Keep dummy IDs for backward compatibility
  area_id?: number;
  line_id?: number;
  creator_name?: string;
  creator_id?: number;
  assignee_name?: string;
  assignee_id?: number;
  user_relationship: 'escalate_approver' | 'accept_approver' | 'close_approver' | 'review_approver' | 'reject_approver' | 'planner' | 'assignee' | 'requester' | 'viewer';
  user_approval_level?: number;
  // Additional fields from getTickets format
  reporter_name?: string;
  reporter_email?: string;
  reporter_phone?: string;
  assignee_email?: string;
  assignee_phone?: string;
  pucode?: string;
  pu_name?: string;
  pu_pucode?: string;
  pucriticalno?: number; // New field for Critical Level
  pudescription?: string;
  digit_count?: number;
  machine_name?: string;
  machine_code?: string;
  // Additional fields for dynamic columns
  accepted_at?: string;
  accepted_by?: number;
  accepted_by_name?: string;
  escalated_at?: string;
  escalated_by?: number;
  escalated_by_name?: string;
  reviewed_at?: string;
  reviewed_by?: number;
  reviewed_by_name?: string;
  finished_at?: string;
  finished_by?: number;
  finished_by_name?: string;
  rejected_at?: string;
  rejected_by?: number;
  rejected_by_name?: string;
  schedule_start?: string;
  schedule_finish?: string;
  machine_number?: number;
}

export interface PUCODE {
  PUCODE: string;
  PUDESC: string;
  PUNO: number;
  PLANT: string;
  AREA: string;
  LINE: string;
  MACHINE: string;
  NUMBER: number;
}

export interface Equipment {
  EQNO: number;
  EQCODE: string;
  EQNAME: string;
  EQPARENT?: number;
  EQREFCODE?: string;
  ASSETNO?: string;
  EQMODEL?: string;
  EQSERIALNO?: string;
  EQBrand?: string;
  Location?: string;
  Room?: string;
  IMG?: string;
  NOTE?: string;
  HIERARCHYNO?: string;
  CURR_LEVEL?: number;
  PUCODE?: string;
  PUNAME?: string;
  EQTYPENAME?: string;
  EQTYPECODE?: string;
  EQSTATUSNAME?: string;
  EQSTATUSCODE?: string;
  SiteName?: string;
  SiteCode?: string;
  OwnerDeptName?: string;
  OwnerDeptCode?: string;
  MaintDeptName?: string;
  MaintDeptCode?: string;
  BUILDINGNAME?: string;
  FLOORNAME?: string;
}

export interface FailureMode {
  id: number;
  code: string;
  name: string;
}

export interface PUCODEDetails {
  pu: PUCODE;
  hierarchy: {
    plant_id: number;
    plant_name: string;
    plant_code: string;
    area_id: number;
    area_name: string;
    area_code: string;
    line_id: number;
    line_name: string;
    line_code: string;
    machine_id: number;
    machine_name: string;
    machine_code: string;
    machine_number: number;
  } | null;
}

export interface GeneratedPUCODE {
  pucode: string;
  plant_name: string;
  area_name: string;
  line_name: string;
  machine_name: string;
  machine_number: number;
}

export interface TicketResponse {
  success: boolean;
  data: {
    tickets: Ticket[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface SingleTicketResponse {
  success: boolean;
  data: Ticket;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class TicketService {

  async createTicket(
    ticketData: CreateTicketRequest,
    files: File[] = [],
    imageType: 'before' | 'after' | 'other' = 'before'
  ): Promise<SingleTicketResponse> {
    const hasFiles = Array.isArray(files) && files.length > 0;
    const url = `${API_BASE_URL}/tickets`;

    let response: Response;

    if (hasFiles) {
      const headers = getAuthHeadersNoContentType();
      const form = new FormData();
      form.append('payload', JSON.stringify(ticketData));
      form.append('image_type', imageType);
      files.forEach(file => form.append('images', file));

      response = await fetch(url, {
        method: 'POST',
        headers,
        body: form
      });
    } else {
      const headers = getAuthHeaders();
      response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(ticketData)
      });
    }

    if (!response.ok) {
      let errorMessage = 'Failed to create ticket';
      try {
        const error = await response.json();
        errorMessage = error.message || errorMessage;
      } catch (parseError) {
        console.error('Failed to parse ticket creation error response', parseError);
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async getTickets(filters: TicketFilters = {}): Promise<TicketResponse> {
    const headers = getAuthHeaders();
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    const response = await fetch(`${API_BASE_URL}/tickets?${queryParams}`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch tickets');
    }

    return response.json();
  }

  async getTicketById(id: number): Promise<SingleTicketResponse> {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/tickets/${id}`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch ticket');
    }

    return response.json();
  }

  async updateTicket(id: number, updateData: UpdateTicketRequest): Promise<{ success: boolean; message: string }> {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/tickets/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update ticket');
    }

    return response.json();
  }

  async addComment(ticketId: number, comment: string): Promise<{ success: boolean; message: string; data: any }> {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/comments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ comment })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to add comment');
    }

    return response.json();
  }

  async assignTicket(ticketId: number, assignedTo: number, notes?: string): Promise<{ success: boolean; message: string }> {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/assign`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ assigned_to: assignedTo, notes })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to assign ticket');
    }

    return response.json();
  }

  async deleteTicket(id: number, reason?: string): Promise<{ success: boolean; message: string }> {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/tickets/${id}`, {
      method: 'DELETE',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete ticket');
    }

    return response.json();
  }

  async uploadTicketImage(
    ticketId: number,
    file: File,
    imageType: 'before' | 'after' | 'other' = 'other',
    imageName?: string,
  ): Promise<{ success: boolean; message: string; data: any }> {
    const headers = getAuthHeadersNoContentType();
    const form = new FormData();
    form.append('image', file);
    form.append('image_type', imageType);
    if (imageName) form.append('image_name', imageName);

    const res = await fetch(`${API_BASE_URL}/tickets/${ticketId}/images`, {
      method: 'POST',
      headers,
      body: form,
    });

    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.message || 'Failed to upload image');
    }
    return result;
  }

  async uploadTicketImages(
    ticketId: number,
    files: File[],
    imageType: 'before' | 'after' | 'other' = 'other',
  ): Promise<{ success: boolean; message: string; data: any[] }> {
    if (!files.length) throw new Error('No files selected');
    const headers = getAuthHeadersNoContentType();
    const form = new FormData();
    for (const file of files) form.append('images', file);
    form.append('image_type', imageType);
    const res = await fetch(`${API_BASE_URL}/tickets/${ticketId}/images/batch`, {
      method: 'POST',
      headers,
      body: form,
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.message || 'Failed to upload images');
    }
    return result;
  }

  async deleteTicketImage(ticketId: number, imageId: number): Promise<{ success: boolean; message: string }> {
    const headers = getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/tickets/${ticketId}/images/${imageId}`, {
      method: 'DELETE',
      headers,
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.message || 'Failed to delete image');
    }
    return result;
  }

  async triggerTicketNotification(ticketId: number): Promise<{ success: boolean; message: string }> {
    const headers = getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/tickets/${ticketId}/trigger-notification`, {
      method: 'POST',
      headers,
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.message || 'Failed to trigger notification');
    }
    return result;
  }

  // Workflow actions
  async acceptTicket(id: number, notes?: string, schedule_finish?: string): Promise<{ success: boolean; message: string }> {
    const headers = getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/tickets/${id}/accept`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ notes, schedule_finish })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to accept ticket');
    return result;
  }

  async planTicket(
    id: number, 
    schedule_start: string, 
    schedule_finish: string, 
    assigned_to: number,
    notes?: string
  ): Promise<{ success: boolean; message: string }> {
    const headers = getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/tickets/${id}/plan`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ notes, schedule_start, schedule_finish, assigned_to })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to plan ticket');
    return result;
  }

  async startTicket(
    id: number, 
    actual_start_at: string, 
    notes?: string
  ): Promise<{ success: boolean; message: string }> {
    const headers = getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/tickets/${id}/start`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ notes, actual_start_at })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to start ticket');
    return result;
  }

  async rejectTicket(id: number, rejection_reason: string, escalate_to_l3: boolean = false): Promise<{ success: boolean; message: string }> {
    const headers = getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/tickets/${id}/reject`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ rejection_reason, escalate_to_l3 })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to reject ticket');
    return result;
  }

  async finishTicket(
    id: number, 
    completion_notes?: string, 
    downtime_avoidance_hours?: number, 
    cost_avoidance?: number, 
    failure_mode_id?: number,
    actual_finish_at?: string,
    actual_start_at?: string
  ): Promise<{ success: boolean; message: string }> {
    const headers = getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/tickets/${id}/finish`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        completion_notes, 
        downtime_avoidance_hours,
        cost_avoidance,
        failure_mode_id,
        actual_finish_at,
        actual_start_at
      })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to finish job');
    return result;
  }

  async escalateTicket(id: number, escalation_reason: string, escalated_to: number): Promise<{ success: boolean; message: string }> {
    const headers = getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/tickets/${id}/escalate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ escalation_reason, escalated_to })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to escalate ticket');
    return result;
  }

  async approveReview(id: number, review_reason: string, satisfaction_rating?: number): Promise<{ success: boolean; message: string }> {
    const headers = getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/tickets/${id}/approve-review`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ review_reason, satisfaction_rating })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to approve review');
    return result;
  }

  async approveClose(id: number, close_reason: string): Promise<{ success: boolean; message: string }> {
    const headers = getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/tickets/${id}/approve-close`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ close_reason })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to approve close');
    return result;
  }

  async reopenTicket(id: number, reopen_reason: string): Promise<{ success: boolean; message: string }> {
    const headers = getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/tickets/${id}/reopen`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reopen_reason })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to reopen ticket');
    return result;
  }

  // Assignees
  async getAvailableAssignees(search?: string, ticketId?: number, escalationOnly?: boolean): Promise<{ success: boolean; data: Array<{ id: number; name: string; email?: string; permissionLevel?: number }> }> {
    const headers = getAuthHeaders();
    const queryParams = new URLSearchParams();
    if (search) queryParams.set('search', search);
    if (ticketId) queryParams.set('ticket_id', ticketId.toString());
    if (escalationOnly) queryParams.set('escalation_only', 'true');
    const url = `${API_BASE_URL}/tickets/assignees/available?${queryParams.toString()}`;
    const res = await fetch(url, { headers });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to fetch assignees');
    return result;
  }

  async reassignTicket(id: number, schedule_start: string, schedule_finish: string, assigned_to: number, notes?: string): Promise<{ success: boolean; message: string }> {
    const headers = getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/tickets/${id}/reassign`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        schedule_start, 
        schedule_finish, 
        assigned_to, 
        notes 
      })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to reassign ticket');
    return result;
  }

  async getUserPendingTickets(params?: { page?: number; limit?: number }): Promise<{ success: boolean; data: { tickets: PendingTicket[]; pagination: { page: number; limit: number; total: number; pages: number } } }> {
    const headers = getAuthHeaders();
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    
    const url = `${API_BASE_URL}/tickets/pending/user${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const res = await fetch(url, { headers });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to fetch pending tickets');
    return result;
  }

  async getUserTicketCountPerPeriod(params: {
    year: number;
    startDate: string;
    endDate: string;
  }): Promise<{ success: boolean; data: any }> {
    const headers = getAuthHeaders();
    const queryParams = new URLSearchParams();
    queryParams.set('year', params.year.toString());
    queryParams.set('startDate', params.startDate);
    queryParams.set('endDate', params.endDate);
    
    const url = `${API_BASE_URL}/tickets/user/count-per-period?${queryParams.toString()}`;
    const res = await fetch(url, { headers });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to fetch user ticket count per period');
    return result;
  }

  async getUserFinishedTicketCountPerPeriod(params: {
    year: number;
    startDate: string;
    endDate: string;
  }): Promise<{ success: boolean; data: any }> {
    const headers = getAuthHeaders();
    const queryParams = new URLSearchParams();
    queryParams.set('year', params.year.toString());
    queryParams.set('startDate', params.startDate);
    queryParams.set('endDate', params.endDate);
    
    const url = `${API_BASE_URL}/tickets/user/Finished-count-per-period?${queryParams.toString()}`;
    const res = await fetch(url, { headers });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to fetch user Finished ticket count per period');
    return result;
  }

  async getPersonalKPIData(params: {
    startDate: string;
    endDate: string;
    compare_startDate: string;
    compare_endDate: string;
  }): Promise<{ success: boolean; data: any }> {
    const headers = getAuthHeaders();
    const queryParams = new URLSearchParams();
    queryParams.set('startDate', params.startDate);
    queryParams.set('endDate', params.endDate);
    queryParams.set('compare_startDate', params.compare_startDate);
    queryParams.set('compare_endDate', params.compare_endDate);
    
    const url = `${API_BASE_URL}/tickets/user/personal-kpi?${queryParams.toString()}`;
    const res = await fetch(url, { headers });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to fetch personal KPI data');
    return result;
  }

  async getFailureModes(): Promise<{ success: boolean; data: FailureMode[] }> {
    const headers = getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/tickets/failure-modes`, { headers });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to fetch failure modes');
    return result;
  }

  // Hierarchy APIs  
  async searchPUCODE(search: string): Promise<{ success: boolean; data: PUCODE[] }> {
    const headers = getAuthHeaders();
    const queryParams = new URLSearchParams();
    queryParams.set('search', search);
    const url = `${API_BASE_URL}/hierarchy/pucode/search?${queryParams.toString()}`;
    const res = await fetch(url, { headers });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to search PUCODE');
    return result;
  }

  async getPUCODEDetails(pucode: string): Promise<{ success: boolean; data: PUCODEDetails }> {
    const headers = getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/hierarchy/pucode/${encodeURIComponent(pucode)}`, { headers });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.message || 'Failed to fetch PUCODE details');
    return resData;
  }

  // Equipment APIs
  async getEquipmentByPUNO(puNo: number): Promise<{ success: boolean; data: Equipment[] }> {
    const headers = getAuthHeaders();
    const queryParams = new URLSearchParams();
    queryParams.set('puNo', puNo.toString());
    const url = `${API_BASE_URL}/assets/equipment/by-puno?${queryParams.toString()}`;
    const res = await fetch(url, { headers });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to get equipment');
    return result;
  }

  // Test endpoints (for development)
  async testL2UsersForArea(areaId: number): Promise<{ success: boolean; data: any[]; message: string }> {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/tickets/test-l2-users/${areaId}`, {
      headers
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch L2 users for area');
    }

    return response.json();
  }

  // Test email notification (for development)
  async testEmailNotification(): Promise<{ success: boolean; message: string }> {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/tickets/test-email`, {
      method: 'POST',
      headers
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to send test email');
    }

    return response.json();
  }
}

export const ticketService = new TicketService();
