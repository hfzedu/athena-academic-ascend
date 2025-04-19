
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // This page is only shown during the OAuth callback
    // The Supabase client will automatically handle the token exchange
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        // Redirect to the home page or the page they were trying to access
        navigate('/', { replace: true });
      }
    });

    // Add a fallback redirect after 5 seconds in case the auth listener doesn't fire
    const timer = setTimeout(() => {
      navigate('/', { replace: true });
    }, 5000);

    return () => {
      authListener.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [navigate]);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-center text-muted-foreground">
        Processing authentication... <br />
        You will be redirected automatically.
      </p>
    </div>
  );
}
