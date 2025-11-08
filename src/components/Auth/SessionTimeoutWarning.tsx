/**
 * Session Timeout Warning Dialog
 *
 * Purpose: Warn users before automatic logout due to inactivity
 * Compliance: Required for SOC 2 Type II (user notification)
 *
 * Features:
 * - Shows countdown timer
 * - "Stay logged in" button to extend session
 * - "Logout now" button for immediate logout
 * - Auto-logout when timer expires
 */

import { useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Clock, LogOut } from 'lucide-react';

interface SessionTimeoutWarningProps {
  isOpen: boolean;
  timeRemaining: number | null; // seconds
  onExtend: () => void;
  onLogout: () => void;
}

export function SessionTimeoutWarning({
  isOpen,
  timeRemaining,
  onExtend,
  onLogout,
}: SessionTimeoutWarningProps) {
  // Format time remaining as MM:SS
  const formatTime = (seconds: number | null): string => {
    if (seconds === null || seconds < 0) return '0:00';

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Play alert sound when warning appears (optional)
  useEffect(() => {
    if (isOpen && timeRemaining !== null) {
      // You can add an audio alert here
      // const audio = new Audio('/alert.mp3');
      // audio.play().catch(() => {});
    }
  }, [isOpen, timeRemaining]);

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-600" />
            Session Timeout Warning
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Your session is about to expire due to inactivity. You will be automatically
              logged out in:
            </p>
            <div className="text-center py-4">
              <div className="text-4xl font-bold text-orange-600 font-mono">
                {formatTime(timeRemaining)}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                minutes remaining
              </div>
            </div>
            <p className="text-sm">
              Click "Stay Logged In" to continue your session, or you will be logged out
              automatically.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={onLogout}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout Now
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onExtend}
            className="bg-primary hover:bg-primary/90"
          >
            Stay Logged In
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
