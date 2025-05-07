
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await resetPassword(email);
      setIsSubmitted(true);
    } catch (error) {
      console.error('Password reset request failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <Link to="/auth" className="inline-flex items-center text-sm mb-6 text-primary hover:underline">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to login
      </Link>
      
      {isSubmitted ? (
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Check your email</h2>
          <p className="mb-4">
            We've sent a password reset link to {email}
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/auth">Return to login</Link>
          </Button>
        </div>
      ) : (
        <>
          <h2 className="text-xl font-bold mb-2">Forgot password</h2>
          <p className="mb-4 text-muted-foreground">
            Enter your email and we'll send you a link to reset your password.
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                placeholder="name@example.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>
        </>
      )}
    </Card>
  );
}
