'use client';

import { useState, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';

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

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/portal';
  const [activeTab, setActiveTab] = useState('login');

  useEffect(() => {
    const savedRememberMe = localStorage.getItem('rememberMe');
    if (savedRememberMe === 'true') {
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('rememberMe', rememberMe.toString());
  }, [rememberMe]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'login') {
      setConfirmPassword('');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || redirecting) return;
    setIsLoading(true);

    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        toast.error(`Login failed: ${error.message}`);
        setIsLoading(false);
        return;
      }

      toast.success('Logged in successfully');
      setRedirecting(true);

      setTimeout(() => {
        window.location.href = redirectTo;
      }, 500);
    } catch (error: any) {
      toast.error(error.message || 'Failed to login');
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || redirecting) return;

    if (!termsAccepted) {
      toast.error('Please accept the terms and conditions to continue');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username,
            terms_accepted: termsAccepted,
            terms_accepted_at: new Date().toISOString()
          },
          emailRedirectTo: `${window.location.origin}/login?redirectTo=${redirectTo}`
        }
      });

      if (error) throw error;

      toast.success(
        'Registration successful! Please check your email to confirm your account.'
      );
      setActiveTab('login');
    } catch (error: any) {
      toast.error(error.message || 'Failed to register');
    } finally {
      setIsLoading(false);
    }
  };

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
            onValueChange={handleTabChange}
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
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={(checked) =>
                      setRememberMe(checked as boolean)
                    }
                    disabled={isLoading || redirecting}
                  />
                  <Label htmlFor="remember-me" className="text-sm">
                    Remember me
                  </Label>
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
                  <Label htmlFor="register-username">Username</Label>
                  <Input
                    id="register-username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={isLoading || redirecting}
                  />
                </div>
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
                    placeholder="Create a password"
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
                <div className="space-y-2">
                  <Label htmlFor="register-confirm-password">
                    Confirm Password
                  </Label>
                  <Input
                    id="register-confirm-password"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading || redirecting}
                  />
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-red-500">
                      Passwords do not match
                    </p>
                  )}
                  {confirmPassword &&
                    password === confirmPassword &&
                    confirmPassword.length >= 6 && (
                      <p className="text-xs text-green-500">Passwords match</p>
                    )}
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(checked) =>
                      setTermsAccepted(checked as boolean)
                    }
                    disabled={isLoading || redirecting}
                  />
                  <Label htmlFor="terms" className="text-sm">
                    I agree to the{' '}
                    <Link
                      href="/terms"
                      target="_blank"
                      className="text-primary hover:underline"
                    >
                      Terms and Conditions
                    </Link>{' '}
                    and{' '}
                    <Link
                      href="/privacy"
                      target="_blank"
                      className="text-primary hover:underline"
                    >
                      Privacy Policy
                    </Link>
                  </Label>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    isLoading ||
                    redirecting ||
                    password !== confirmPassword ||
                    password.length < 6 ||
                    !confirmPassword
                  }
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
