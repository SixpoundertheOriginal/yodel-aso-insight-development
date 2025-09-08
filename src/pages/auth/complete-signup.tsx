import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { validatePassword } from '@/utils/authValidation';

const completeSignupSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type CompleteSignupFormValues = z.infer<typeof completeSignupSchema>;

const CompleteSignup = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<CompleteSignupFormValues>({
    resolver: zodResolver(completeSignupSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: CompleteSignupFormValues) => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please start from the email confirmation link.',
        variant: 'destructive',
      });
      navigate('/auth/sign-in');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Account setup complete!',
        description: 'Your password has been set successfully.',
      });

      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      console.error('Password update error:', error);
      toast({
        title: 'Setup failed',
        description: error.message || 'Failed to set password. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    const result = validatePassword(password);
    if (result.score >= 4) return { label: 'Strong', color: 'text-green-500' };
    if (result.score >= 3) return { label: 'Good', color: 'text-yellow-500' };
    if (result.score >= 2) return { label: 'Fair', color: 'text-orange-500' };
    return { label: 'Weak', color: 'text-red-500' };
  };

  const password = form.watch('password');
  const passwordStrength = password ? getPasswordStrength(password) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center p-4">
        <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm max-w-md">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Session expired. Please start from the email confirmation link.
              </AlertDescription>
            </Alert>
            <Button 
              className="w-full mt-4" 
              onClick={() => navigate('/auth/sign-in')}
            >
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            className="text-zinc-400 hover:text-foreground"
            onClick={() => navigate('/auth/sign-in')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sign In
          </Button>
        </div>

        <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-yodel-orange to-orange-600 shadow-lg">
                <span className="text-lg font-bold text-foreground">Y</span>
              </div>
              <span className="text-2xl font-bold text-foreground">Yodel ASO</span>
            </div>
            <CardTitle className="text-foreground">Complete Your Setup</CardTitle>
            <CardDescription className="text-zinc-400">
              Set a password for {user.email}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            className="bg-zinc-800/50 border-zinc-700 text-foreground pr-10"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-zinc-400" />
                            ) : (
                              <Eye className="h-4 w-4 text-zinc-400" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      {passwordStrength && (
                        <div className="text-sm">
                          Password strength: <span className={passwordStrength.color}>{passwordStrength.label}</span>
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Confirm Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm your password"
                            className="bg-zinc-800/50 border-zinc-700 text-foreground pr-10"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4 text-zinc-400" />
                            ) : (
                              <Eye className="h-4 w-4 text-zinc-400" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="text-xs text-zinc-400 space-y-1">
                  <p>Password requirements:</p>
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    <li>At least 8 characters</li>
                    <li>One uppercase letter</li>
                    <li>One number</li>
                  </ul>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-yodel-orange hover:bg-orange-600"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Setting up...' : 'Complete Setup'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CompleteSignup;