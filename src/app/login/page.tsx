'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/components/auth-provider';

// Main component that serves as the page
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[80vh]">
          Loading...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

// Client component with all the login logic
function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/admin';
  const [activeTab, setActiveTab] = useState('login');
  const { user, isLoading: authLoading } = useAuth();

  // Redirect if user is already logged in
  useEffect(() => {
    // Only redirect if we have a user and we're not already redirecting
    if (user && !redirecting && !authLoading) {
      console.log('User already logged in, redirecting to:', redirectTo);
      setRedirecting(true);

      // Use a timeout to prevent immediate redirect which can cause loops
      setTimeout(() => {
        window.location.href = redirectTo;
      }, 100);
    }
  }, [user, redirectTo, redirecting, authLoading]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent multiple submissions
    if (isLoading || redirecting) return;

    setIsLoading(true);

    try {
      console.log('Attempting to log in with email:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      console.log('Login successful, redirecting to:', redirectTo);
      toast.success('Logged in successfully');

      // Set redirecting flag to prevent loops
      setRedirecting(true);

      // Wait a moment for the session to be properly set
      setTimeout(() => {
        // Force a hard navigation to the redirect URL
        window.location.href = redirectTo;
      }, 500);
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Failed to login');
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent multiple submissions
    if (isLoading || redirecting) return;

    setIsLoading(true);

    try {
      console.log('Attempting to sign up with email:', email);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login?redirectTo=${redirectTo}`
        }
      });

      if (error) {
        throw error;
      }

      console.log('Sign up successful');
      toast.success(
        'Registration successful! Please check your email to confirm your account.'
      );
      setActiveTab('login');
    } catch (error: any) {
      console.error('Sign up error:', error);
      toast.error(error.message || 'Failed to register');
    } finally {
      setIsLoading(false);
    }
  };

  // If we're still loading auth state, show a loading message
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Project Management Dashboard</CardTitle>
          <CardDescription>
            Sign in or create an account to manage your projects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading || redirecting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading || redirecting}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || redirecting}
                >
                  {isLoading
                    ? 'Logging in...'
                    : redirecting
                      ? 'Redirecting...'
                      : 'Login'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading || redirecting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">Password</Label>
                  <Input
                    id="register-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={isLoading || redirecting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Password must be at least 6 characters
                  </p>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || redirecting}
                >
                  {isLoading ? 'Registering...' : 'Register'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
