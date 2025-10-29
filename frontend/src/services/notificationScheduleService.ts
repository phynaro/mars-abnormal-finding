import { getAuthHeaders } from '../utils/authHeaders';

export interface NotificationSchedule {
  id: number;
  notification_type: string;
  schedule_cron: string;
  timezone: string;
  is_enabled: boolean;
  last_run: string | null;
  next_run: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  created_by: number | null;
  updated_by: number | null;
}

export interface UpdateNotificationScheduleRequest {
  schedule_cron: string;
  timezone: string;
  is_enabled: boolean;
  description?: string;
}

const API_BASE_URL = '/api/notification-schedules';

class NotificationScheduleService {
  async getAll(): Promise<{ success: boolean; data: NotificationSchedule[] }> {
    const response = await fetch(API_BASE_URL, {
      method: 'GET',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch notification schedules');
    }

    return response.json();
  }

  async getByType(type: string): Promise<{ success: boolean; data: NotificationSchedule }> {
    const response = await fetch(`${API_BASE_URL}/type/${type}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch notification schedule');
    }

    return response.json();
  }

  async update(id: number, data: UpdateNotificationScheduleRequest): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update notification schedule');
    }

    return response.json();
  }

  async test(): Promise<{ success: boolean; message: string; data: any }> {
    const response = await fetch(`${API_BASE_URL}/test`, {
      method: 'POST',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to test notification');
    }

    return response.json();
  }
}

const notificationScheduleService = new NotificationScheduleService();
export default notificationScheduleService;

