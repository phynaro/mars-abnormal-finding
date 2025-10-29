import { getAuthHeaders } from '../utils/authHeaders';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface TicketClass {
  id: number;
  name_en: string;
  name_th: string;
}

export interface TicketClassResponse {
  success: boolean;
  data: TicketClass[];
}

class TicketClassService {
  /**
   * Get all ticket classes (returns both EN and TH names)
   * @returns Promise with ticket classes array containing both name_en and name_th
   */
  async getTicketClasses(): Promise<TicketClass[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/ticketclass`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ticket classes: ${response.statusText}`);
      }

      const data: TicketClassResponse = await response.json();
      
      if (!data.success) {
        throw new Error('Failed to fetch ticket classes');
      }

      return data.data || [];
    } catch (error) {
      console.error('Error fetching ticket classes:', error);
      throw error;
    }
  }
}

export const ticketClassService = new TicketClassService();
export default ticketClassService;

