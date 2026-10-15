import { getAuthHeaders } from '@/utils/authHeaders';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export type ProblemPhrase = {
  id: number;
  phrase: string;
  kind: 'part' | 'symptom';
  code: string;
  created_at?: string;
  updated_at?: string;
};

export type BucketName = 'full' | 'part_only' | 'symptom_only' | 'none';

export type BucketTicketRow = {
  id: number;
  ticket_number: string;
  title: string;
  created_at: string;
  puno: number | null;
  pucode: string | null;
  plant: string | null;
  part_code: string | null;
  symptom_code: string | null;
  symptom_source: 'title' | 'failure_mode' | null;
  side: string | null;
  station: string | null;
  classified_at: string | null;
};

export type BucketCounts = {
  full: number;
  part_only: number;
  symptom_only: number;
  none: number;
  classified: number;
  total?: number;
};

export type RepeatProblemItem = {
  puno: number;
  pucode: string | null;
  puname: string | null;
  plant: string | null;
  partCode: string;
  symptomCode: string;
  ticketCount: number;
  firstSeen: string | null;
  lastSeen: string | null;
  peakMonth: number;
  peakCount: number;
  monthly: number[];
};

export type RepeatProblemsResponse = {
  success: boolean;
  data: {
    year: number;
    plant: string | null;
    summary: {
      topRepeatTickets: number;
      distinctProblems: number;
      repeatingProblems: number;
      ticketsInRepeats: number;
      fullMatch?: number;
      partOnly?: number;
      symptomOnly?: number;
      noMatch?: number;
      classified?: number;
    };
    topProblems: RepeatProblemItem[];
  };
  message: string;
};

class ProblemDictionaryService {
  private headers() {
    return getAuthHeaders();
  }

  async getRepeatProblems(params: {
    year: number;
    plant?: string;
    area?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<RepeatProblemsResponse> {
    const query = new URLSearchParams();
    query.set('year', String(params.year));
    if (params.plant && params.plant !== 'all') query.set('plant', params.plant);
    if (params.area && params.area !== 'all') query.set('area', params.area);
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    const res = await fetch(`${API_BASE_URL}/dashboard/repeat-problems?${query.toString()}`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error('Failed to load repeat problems');
    return res.json();
  }

  async getPhrases(): Promise<{ success: boolean; data: ProblemPhrase[] }> {
    const res = await fetch(`${API_BASE_URL}/problem-dictionary/phrases`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error('Failed to load phrases');
    return res.json();
  }

  async createPhrase(payload: { phrase: string; kind: 'part' | 'symptom'; code: string }) {
    const res = await fetch(`${API_BASE_URL}/problem-dictionary/phrases`, {
      method: 'POST',
      headers: {
        ...this.headers(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to create phrase');
    return json;
  }

  async updatePhrase(
    id: number,
    payload: { phrase: string; kind: 'part' | 'symptom'; code: string },
  ) {
    const res = await fetch(`${API_BASE_URL}/problem-dictionary/phrases/${id}`, {
      method: 'PUT',
      headers: {
        ...this.headers(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to update phrase');
    return json;
  }

  async deletePhrase(id: number) {
    const res = await fetch(`${API_BASE_URL}/problem-dictionary/phrases/${id}`, {
      method: 'DELETE',
      headers: this.headers(),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to delete phrase');
    return json;
  }

  async getBucketCounts(): Promise<{ success: boolean; data: BucketCounts }> {
    const res = await fetch(`${API_BASE_URL}/problem-dictionary/buckets/counts`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error('Failed to load bucket counts');
    return res.json();
  }

  async getBucketTickets(params: {
    bucket: BucketName;
    page?: number;
    limit?: number;
  }): Promise<{
    success: boolean;
    data: { rows: BucketTicketRow[]; total: number; page: number; limit: number; bucket: BucketName };
  }> {
    const query = new URLSearchParams();
    query.set('bucket', params.bucket);
    query.set('page', String(params.page || 1));
    query.set('limit', String(params.limit || 50));
    const res = await fetch(`${API_BASE_URL}/problem-dictionary/buckets/tickets?${query.toString()}`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error('Failed to load bucket tickets');
    return res.json();
  }

  async rerunClassification(): Promise<{ success: boolean; data: BucketCounts; message: string }> {
    const res = await fetch(`${API_BASE_URL}/problem-dictionary/rerun`, {
      method: 'POST',
      headers: this.headers(),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to rerun classification');
    return json;
  }
}

export const problemDictionaryService = new ProblemDictionaryService();
export default problemDictionaryService;
