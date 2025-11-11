/**
 * MFA Grace Period Warning Banner
 *
 * Purpose: Warn admin users to enable MFA before grace period expires
 * Compliance: Required for SOC 2 Type II (user notification)
 *
 * Features:
 * - Shows countdown to grace period expiration
 * - Links to MFA setup in settings
 * - Only visible to admin users
 * - Automatically hides after MFA is enabled
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { supabaseCompat } from '@/lib/supabase-compat';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Shield, Clock, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MFAEnforcementStatus {
  mfa_required: boolean;
  grace_period_ends_at: string | null;
  mfa_enabled_at: string | null;
}

export function MFAGracePeriodBanner() {
  const { user } = useAuth();
  const permissions = usePermissions();
  const navigate = useNavigate();

  const [mfaStatus, setMFAStatus] = useState<MFAEnforcementStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  const isAdmin = permissions?.isSuperAdmin || permissions?.isOrganizationAdmin;

  useEffect(() => {
    if (!user || !isAdmin) return;

    loadMFAStatus();
  }, [user, isAdmin]);

  useEffect(() => {
    if (!mfaStatus || !mfaStatus.grace_period_ends_at) return;

    calculateDaysRemaining();
    const interval = setInterval(calculateDaysRemaining, 1000 * 60 * 60); // Update every hour

    return () => clearInterval(interval);
  }, [mfaStatus]);

  const loadMFAStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabaseCompat.fromAny('mfa_enforcement')
        .select('mfa_required, grace_period_ends_at, mfa_enabled_at')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Failed to load MFA status:', error);
        return;
      }

      if (data) {
        setMFAStatus(data as MFAEnforcementStatus);
      }
    } catch (err) {
      console.error('Error loading MFA status:', err);
    }
  };

  const calculateDaysRemaining = () => {
    if (!mfaStatus?.grace_period_ends_at) return;

    const now = new Date();
    const expiresAt = new Date(mfaStatus.grace_period_ends_at);
    const diffMs = expiresAt.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    setDaysRemaining(diffDays);
  };

  // Don't show banner if:
  // - Not an admin user
  // - MFA already enabled
  // - Grace period expired or doesn't exist
  // - User dismissed it
  if (
    !isAdmin ||
    !mfaStatus ||
    mfaStatus.mfa_enabled_at ||
    !mfaStatus.grace_period_ends_at ||
    daysRemaining === null ||
    daysRemaining < 0 ||
    dismissed
  ) {
    return null;
  }

  const isUrgent = daysRemaining <= 7;
  const isCritical = daysRemaining <= 3;

  const handleGoToSettings = () => {
    navigate('/settings');
  };

  return (
    <Alert
      variant={isCritical ? 'destructive' : 'default'}
      className={`mb-6 ${
        isCritical
          ? 'border-red-500 bg-red-50 dark:bg-red-950'
          : isUrgent
          ? 'border-orange-500 bg-orange-50 dark:bg-orange-950'
          : 'border-blue-500 bg-blue-50 dark:bg-blue-950'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2 flex-1">
          <Shield className="h-5 w-5 mt-0.5" />
          <div className="flex-1">
            <AlertTitle className="flex items-center gap-2 mb-1">
              Multi-Factor Authentication Required
              <div className="flex items-center gap-1 text-sm font-normal">
                <Clock className="h-4 w-4" />
                {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
              </div>
            </AlertTitle>
            <AlertDescription>
              {isCritical ? (
                <p className="mb-2">
                  <strong>⚠️ Action Required:</strong> Your MFA grace period expires in{' '}
                  {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}. Enable
                  multi-factor authentication now to avoid losing access to your account.
                </p>
              ) : isUrgent ? (
                <p className="mb-2">
                  Multi-factor authentication (MFA) will be required in {daysRemaining} days.
                  Enable it now to secure your account and avoid any interruption.
                </p>
              ) : (
                <p className="mb-2">
                  As an admin user, you're required to enable multi-factor authentication
                  (MFA) for enhanced security. Your grace period ends in {daysRemaining} days.
                </p>
              )}
              <Button
                onClick={handleGoToSettings}
                size="sm"
                variant={isCritical ? 'destructive' : 'default'}
                className="mt-2"
              >
                Enable MFA in Settings
              </Button>
            </AlertDescription>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDismissed(true)}
          className="ml-2"
          title="Dismiss (will show again on next page load)"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
}
