
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { Card } from '@/components/ui/card';

export default function AuthCallbackPage() {
  const [message, setMessage] = useState('Processing your authentication...');
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const processAuth = async () => {
      try {
        // Process any auth tokens in URL if needed
        
        // If the user is already authenticated, redirect them
        if (user) {
          setMessage('Authentication successful! Redirecting...');
          setTimeout(() => navigate('/dashboard'), 1500);
        } else {
          setMessage('Please check your email to confirm your account.');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setMessage('Authentication failed. Please try again.');
        setTimeout(() => navigate('/auth'), 3000);
      }
    };

    processAuth();
  }, [navigate, user]);

  return (
    <Card className="p-6 text-center">
      <h2 className="text-xl font-bold mb-4">Authentication</h2>
      <p>{message}</p>
    </Card>
  );
}
