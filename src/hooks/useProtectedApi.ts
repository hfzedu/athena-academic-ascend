
import { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export function useProtectedApi() {
  const [loading, setLoading] = useState(false);
  const { user, session } = useAuth();
  const navigate = useNavigate();
  
  async function callApi<T>(
    apiFunction: () => Promise<T>,
    options: {
      loadingMessage?: string;
      successMessage?: string;
      errorMessage?: string;
      onSuccess?: (data: T) => void;
    } = {}
  ): Promise<T | null> {
    const { 
      loadingMessage = 'Processing...',
      successMessage,
      errorMessage = 'Operation failed',
      onSuccess
    } = options;
    
    if (!user || !session) {
      toast.error('You must be logged in to perform this action');
      navigate('/auth');
      return null;
    }

    try {
      setLoading(true);
      if (loadingMessage) toast.loading(loadingMessage);
      
      const result = await apiFunction();
      
      if (successMessage) toast.success(successMessage);
      if (onSuccess) onSuccess(result);
      
      return result;
    } catch (error: any) {
      console.error('API error:', error);
      toast.error(errorMessage + (error.message ? `: ${error.message}` : ''));
      return null;
    } finally {
      setLoading(false);
    }
  }

  return {
    callApi,
    loading,
    isAuthenticated: !!user && !!session
  };
}
