/**
 * MFA Verification Component
 *
 * Purpose: Prompt users to enter TOTP code during login
 * Compliance: Required for SOC 2 Type II
 *
 * Flow:
 * 1. User enters email/password
 * 2. If MFA is enabled, show this component
 * 3. User enters 6-digit TOTP code
 * 4. Verify and complete authentication
 */

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, AlertCircle } from 'lucide-react';

interface MFAVerificationProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function MFAVerification({ onSuccess, onCancel }: MFAVerificationProps) {
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifyCode = async () => {
    if (!code || code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    try {
      setIsVerifying(true);
      setError(null);

      const factors = await supabase.auth.mfa.listFactors();
      const factorId = factors.data?.totp?.[0]?.id;

      if (!factorId) {
        throw new Error('No MFA factor found');
      }

      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code,
      });

      if (verifyError) throw verifyError;

      // Success - complete authentication
      onSuccess();

    } catch (err: any) {
      setError(err.message || 'Invalid verification code. Please try again.');
      setCode('');
      console.error('MFA verification error:', err);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && code.length === 6) {
      verifyCode();
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          Enter the 6-digit code from your authenticator app
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Input
          type="text"
          placeholder="000000"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          onKeyPress={handleKeyPress}
          className="text-center text-2xl tracking-widest"
          autoFocus
          disabled={isVerifying}
        />

        <div className="flex gap-2">
          <Button
            onClick={verifyCode}
            disabled={isVerifying || code.length !== 6}
            className="flex-1"
          >
            {isVerifying ? 'Verifying...' : 'Verify'}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isVerifying}
          >
            Cancel
          </Button>
        </div>

        <div className="text-sm text-muted-foreground text-center">
          <p>Lost your device?</p>
          <p>Contact your administrator for assistance.</p>
        </div>
      </CardContent>
    </Card>
  );
}
