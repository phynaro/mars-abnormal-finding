import { useState, useEffect } from 'react';
import { api } from '@/services/api';

interface PeriodWeekData {
  period: number;
  week: number;
  display: string;
  year: number;
  date: string;
}

interface UsePeriodWeekReturn {
  periodWeek: PeriodWeekData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export const usePeriodWeek = (): UsePeriodWeekReturn => {
  const [periodWeek, setPeriodWeek] = useState<PeriodWeekData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPeriodWeek = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get<{ success: boolean; data: PeriodWeekData }>('/dashboard/current-period-week');
      
      if (response.success) {
        setPeriodWeek(response.data);
      } else {
        setError('Failed to fetch period and week data');
      }
    } catch (err) {
      console.error('Error fetching period and week:', err);
      setError('Failed to fetch period and week data');
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    fetchPeriodWeek();
  };

  useEffect(() => {
    fetchPeriodWeek();
    
    // Refresh every hour to keep it current
    const interval = setInterval(fetchPeriodWeek, 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    periodWeek,
    loading,
    error,
    refresh
  };
};
