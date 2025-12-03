/**
 * Session Management Component
 *
 * Purpose: View and manage all user sessions (super admin only)
 * Features:
 * - View all active sessions
 * - Force logout/terminate sessions
 * - Filter by user, organization
 * - Export session history
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SessionService } from '@/services/sessionService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, LogOut, Search, Monitor, Smartphone, Tablet, Globe, Clock, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface UserSession {
  id: string;
  user_id: string;
  user_email: string;
  organization_id: string | null;
  ip_address: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  country_code: string | null;
  city: string | null;
  created_at: string;
  last_active_at: string;
  expires_at: string | null;
  ended_at: string | null;
  end_reason: string | null;
}

export function SessionManagement() {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sessionToTerminate, setSessionToTerminate] = useState<UserSession | null>(null);
  const [terminating, setTerminating] = useState(false);
  const { toast } = useToast();

  // Load all sessions
  const loadSessions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .is('ended_at', null) // Only active sessions
        .order('last_active_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Failed to load sessions:', error);
        toast({
          title: 'Error',
          description: 'Failed to load sessions',
          variant: 'destructive',
        });
        return;
      }

      setSessions(data || []);
    } catch (err) {
      console.error('Error loading sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  // Apply search filter
  useEffect(() => {
    if (!searchQuery) {
      setFilteredSessions(sessions);
      return;
    }

    const filtered = sessions.filter(
      (session) =>
        session.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.ip_address?.includes(searchQuery) ||
        session.device_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.browser?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    setFilteredSessions(filtered);
  }, [sessions, searchQuery]);

  // Force logout session
  const handleForceLogout = async () => {
    if (!sessionToTerminate) return;

    setTerminating(true);
    try {
      const success = await SessionService.forceLogoutSession(sessionToTerminate.id);

      if (success) {
        toast({
          title: 'Session Terminated',
          description: `Session for ${sessionToTerminate.user_email} has been terminated`,
        });

        // Reload sessions
        loadSessions();
      } else {
        toast({
          title: 'Failed to Terminate',
          description: 'Could not terminate the session',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Error terminating session:', err);
      toast({
        title: 'Error',
        description: 'An error occurred while terminating the session',
        variant: 'destructive',
      });
    } finally {
      setTerminating(false);
      setSessionToTerminate(null);
    }
  };

  // Get device icon
  const getDeviceIcon = (deviceType: string | null) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'tablet':
        return <Tablet className="h-4 w-4" />;
      case 'desktop':
        return <Monitor className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  // Calculate idle time
  const getIdleTime = (lastActiveAt: string): string => {
    const now = new Date();
    const lastActive = new Date(lastActiveAt);
    const diffMs = now.getTime() - lastActive.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ago`;
  };

  // Check if session is stale (inactive for > 10 minutes)
  const isStaleSession = (lastActiveAt: string): boolean => {
    const now = new Date();
    const lastActive = new Date(lastActiveAt);
    const diffMs = now.getTime() - lastActive.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    return diffMins > 10;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Session Management</CardTitle>
              <CardDescription>
                View and manage all active user sessions ({sessions.length} active)
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadSessions} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by user, IP, device, browser..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Sessions Table */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {filteredSessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {loading ? 'Loading...' : 'No active sessions found'}
              </div>
            ) : (
              filteredSessions.map((session) => {
                const stale = isStaleSession(session.last_active_at);

                return (
                  <div
                    key={session.id}
                    className={`border rounded-lg p-4 ${
                      stale ? 'border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/20' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* User Info */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-lg">{session.user_email}</span>
                          {stale ? (
                            <Badge variant="outline" className="text-orange-600 border-orange-600">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Idle
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              <span className="w-2 h-2 bg-green-600 rounded-full mr-1 animate-pulse"></span>
                              Active
                            </Badge>
                          )}
                        </div>

                        {/* Session Details */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-muted-foreground mb-2">
                          <div className="flex items-center gap-1">
                            {getDeviceIcon(session.device_type)}
                            <span>{session.device_type || 'Unknown'}</span>
                          </div>

                          {session.browser && (
                            <div className="flex items-center gap-1">
                              <Monitor className="h-4 w-4" />
                              <span className="truncate">{session.browser}</span>
                            </div>
                          )}

                          {session.os && (
                            <div className="flex items-center gap-1">
                              <Globe className="h-4 w-4" />
                              <span className="truncate">{session.os}</span>
                            </div>
                          )}

                          {session.ip_address && (
                            <div className="flex items-center gap-1">
                              <Globe className="h-4 w-4" />
                              <span>{session.ip_address}</span>
                            </div>
                          )}
                        </div>

                        {/* Timestamps */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              Started {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>Last active: {getIdleTime(session.last_active_at)}</span>
                          </div>
                          {session.country_code && (
                            <Badge variant="outline" className="text-xs">
                              {session.country_code}
                              {session.city && ` • ${session.city}`}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setSessionToTerminate(session)}
                        className="ml-4"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Force Logout
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!sessionToTerminate} onOpenChange={(open) => !open && setSessionToTerminate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Force Logout User?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to force logout <strong>{sessionToTerminate?.user_email}</strong>?
              <br />
              <br />
              This will immediately end their session and they will need to log in again.
              <br />
              <br />
              <strong>Session Details:</strong>
              <ul className="mt-2 space-y-1 text-xs">
                <li>Device: {sessionToTerminate?.device_type}</li>
                <li>Browser: {sessionToTerminate?.browser}</li>
                <li>IP: {sessionToTerminate?.ip_address}</li>
                <li>
                  Last active:{' '}
                  {sessionToTerminate?.last_active_at &&
                    formatDistanceToNow(new Date(sessionToTerminate.last_active_at), { addSuffix: true })}
                </li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={terminating}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleForceLogout} disabled={terminating} className="bg-destructive">
              {terminating ? 'Terminating...' : 'Force Logout'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
