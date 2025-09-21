import { authService } from './authService';

export interface Ticket {
  id: number;
  ticket_number: string;
  title: string;
  description: string;
  pucode?: string; // New field for PUCODE
  plant_id?: number;
  area_id?: number;
  line_id?: number;
  machine_id?: number;
  machine_number?: number;
  cost_avoidance?: number;
  downtime_avoidance_hours?: number;
  failure_mode_id?: number;
  severity_level: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'rejected_pending_l3_review' | 'rejected_final' | 'completed' | 'escalated' | 'closed' | 'reopened_in_progress';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  reported_by: number;
  assigned_to?: number;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  closed_at?: string;
  // Workflow tracking fields
  accepted_at?: string;
  accepted_by?: number;
  rejected_at?: string;
  rejected_by?: number;
  completed_at?: string;
  completed_by?: number;
  escalated_at?: string;
  escalated_by?: number;
  reopened_at?: string;
  reopened_by?: number;
  l3_override_at?: string;
  l3_override_by?: number;
  reporter_name?: string;
  reporter_email?: string;
  assignee_name?: string;
  assignee_email?: string;
  // Workflow user names
  accepted_by_name?: string;
  rejected_by_name?: string;
  completed_by_name?: string;
  escalated_by_name?: string;
  closed_by_name?: string;
  reopened_by_name?: string;
  l3_override_by_name?: string;
  // Hierarchy names
  plant_name?: string;
  plant_code?: string;
  area_name?: string;
  area_code?: string;
  line_name?: string;
  line_code?: string;
  machine_name?: string;
  machine_code?: string;
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
  pu_id?: number; // New field for PU ID
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
  reported_by?: number;
  search?: string;
}

// New hierarchy interfaces
export interface Plant {
  id: number;
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
}

export interface Area {
  id: number;
  name: string;
  code: string;
  description?: string;
  plant_id: number;
  is_active: boolean;
}

export interface Line {
  id: number;
  name: string;
  code: string;
  description?: string;
  area_id: number;
  is_active: boolean;
}

export interface Machine {
  id: number;
  name: string;
  code: string;
  description?: string;
  line_id: number;
  machine_number: number;
  is_active: boolean;
}

export interface PendingTicket {
  id: number;
  ticket_number: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'pending_approval' | 'pending_assignment';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  severity_level: 'critical' | 'high' | 'medium' | 'low';
  created_at: string;
  updated_at: string;
  assigned_to?: number;
  reported_by: number;
  area_id: number;
  area_name: string;
  area_code: string;
  plant_name: string;
  plant_code: string;
  creator_name: string;
  creator_id: number;
  assignee_name?: string;
  assignee_id?: number;
  user_relationship: 'creator' | 'approver' | 'viewer';
  user_approval_level?: number;
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
  private async getAuthHeaders() {
    const token = authService.getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  private async getAuthHeadersNoContentType() {
    const token = authService.getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }
    return {
      'Authorization': `Bearer ${token}`
    } as Record<string, string>;
  }

  async createTicket(ticketData: CreateTicketRequest): Promise<SingleTicketResponse> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/tickets`, {
      method: 'POST',
      headers,
      body: JSON.stringify(ticketData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create ticket');
    }

    return response.json();
  }

  async getTickets(filters: TicketFilters = {}): Promise<TicketResponse> {
    const headers = await this.getAuthHeaders();
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
    const headers = await this.getAuthHeaders();
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
    const headers = await this.getAuthHeaders();
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
    const headers = await this.getAuthHeaders();
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
    const headers = await this.getAuthHeaders();
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

  async deleteTicket(id: number): Promise<{ success: boolean; message: string }> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/tickets/${id}`, {
      method: 'DELETE',
      headers
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
    const headers = await this.getAuthHeadersNoContentType();
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
    const headers = await this.getAuthHeadersNoContentType();
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
    const headers = await this.getAuthHeaders();
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
    const headers = await this.getAuthHeaders();
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
  async acceptTicket(id: number, notes?: string): Promise<{ success: boolean; message: string }> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/tickets/${id}/accept`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ notes })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to accept ticket');
    return result;
  }

  async rejectTicket(id: number, rejection_reason: string, escalate_to_l3: boolean = false): Promise<{ success: boolean; message: string }> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/tickets/${id}/reject`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ rejection_reason, escalate_to_l3 })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to reject ticket');
    return result;
  }

  async completeTicket(id: number, completion_notes?: string, downtime_avoidance_hours?: number, cost_avoidance?: number, failure_mode_id?: number): Promise<{ success: boolean; message: string }> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/tickets/${id}/complete`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        completion_notes, 
        downtime_avoidance_hours,
        cost_avoidance,
        failure_mode_id
      })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to complete job');
    return result;
  }

  async escalateTicket(id: number, escalation_reason: string, escalated_to: number): Promise<{ success: boolean; message: string }> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/tickets/${id}/escalate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ escalation_reason, escalated_to })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to escalate ticket');
    return result;
  }

  async closeTicket(id: number, close_reason: string, satisfaction_rating?: number): Promise<{ success: boolean; message: string }> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/tickets/${id}/close`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ close_reason, satisfaction_rating })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to close ticket');
    return result;
  }

  async reopenTicket(id: number, reopen_reason: string): Promise<{ success: boolean; message: string }> {
    const headers = await this.getAuthHeaders();
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
    const headers = await this.getAuthHeaders();
    const url = new URL(`${API_BASE_URL}/tickets/assignees/available`);
    if (search) url.searchParams.set('search', search);
    if (ticketId) url.searchParams.set('ticket_id', ticketId.toString());
    if (escalationOnly) url.searchParams.set('escalation_only', 'true');
    const res = await fetch(url.toString(), { headers });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to fetch assignees');
    return result;
  }

  async reassignTicket(id: number, new_assigned_to: number, notes?: string): Promise<{ success: boolean; message: string }> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/tickets/${id}/reassign`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ assigned_to: new_assigned_to, notes })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to reassign ticket');
    return result;
  }

  async getUserPendingTickets(): Promise<{ success: boolean; data: PendingTicket[]; count: number }> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/tickets/pending/user`, { headers });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to fetch pending tickets');
    return result;
  }

  async getFailureModes(): Promise<{ success: boolean; data: FailureMode[] }> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/tickets/failure-modes`, { headers });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to fetch failure modes');
    return result;
  }

  // Hierarchy APIs
  async getPlants(): Promise<{ success: boolean; data: Plant[] }> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/hierarchy/plants`, { headers });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to fetch plants');
    return result;
  }

  async getAreasByPlant(plantId: number): Promise<{ success: boolean; data: Area[] }> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/hierarchy/plants/${plantId}/areas`, { headers });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to fetch areas');
    return result;
  }

  async getLinesByArea(areaId: number): Promise<{ success: boolean; data: Line[] }> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/hierarchy/areas/${areaId}/lines`, { headers });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to fetch lines');
    return result;
  }

  async getMachinesByLine(lineId: number): Promise<{ success: boolean; data: Machine[] }> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/hierarchy/lines/${lineId}/machines`, { headers });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to fetch machines');
    return result;
  }

  async searchPUCODE(search: string): Promise<{ success: boolean; data: PUCODE[] }> {
    const headers = await this.getAuthHeaders();
    const url = new URL(`${API_BASE_URL}/hierarchy/pucode/search`);
    url.searchParams.set('search', search);
    const res = await fetch(url.toString(), { headers });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to search PUCODE');
    return result;
  }

  async getPUCODEDetails(pucode: string): Promise<{ success: boolean; data: PUCODEDetails }> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/hierarchy/pucode/${encodeURIComponent(pucode)}`, { headers });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to fetch PUCODE details');
    return result;
  }

  async generatePUCODE(plantId: number, areaId: number, lineId: number, machineId: number): Promise<{ success: boolean; data: GeneratedPUCODE }> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/hierarchy/pucode/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ plantId, areaId, lineId, machineId })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Failed to generate PUCODE');
    return result;
  }
}

export const ticketService = new TicketService();
