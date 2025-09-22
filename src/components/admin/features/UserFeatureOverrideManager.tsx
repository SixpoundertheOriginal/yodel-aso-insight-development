import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, User, Settings, Calendar, Plus } from 'lucide-react';

interface UserFeatureOverride {
  id: string;
  user_id: string;
  feature_key: string;
  is_enabled: boolean;
  granted_by: string;
  granted_at: string;
  expires_at?: string;
  reason?: string;
  platform_features: {
    feature_name: string;
    category: string;
  };
}

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

interface UserFeatureOverrideManagerProps {
  organizationId: string;
  organizationName?: string;
}

export function UserFeatureOverrideManager({ organizationId, organizationName }: UserFeatureOverrideManagerProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [overrides, setOverrides] = useState<UserFeatureOverride[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newOverride, setNewOverride] = useState({
    feature_key: '',
    is_enabled: true,
    reason: '',
    expires_at: ''
  });
  const { toast } = useToast();

  // Load organization users
  const loadOrgUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .eq('organization_id', organizationId)
        .order('email');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load organization users',
        variant: 'destructive'
      });
    }
  };

  // Load user overrides
  const loadUserOverrides = async (userId: string) => {
    if (!userId) return;

    try {
      setLoading(true);
      const session = await supabase.auth.getSession();
      const response = await fetch(`https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/admin-features/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${session.data.session?.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user overrides');
      }

      const data = await response.json();
      if (data.success) {
        setOverrides(data.data.overrides || []);
      }
    } catch (error) {
      console.error('Error loading user overrides:', error);
      toast({
        title: 'Error',
        description: 'Failed to load user feature overrides',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Create user override
  const createUserOverride = async () => {
    if (!selectedUserId || !newOverride.feature_key) return;

    try {
      const session = await supabase.auth.getSession();
      const response = await fetch(`https://bkbcqocpjahewqjmlgvf.supabase.co/functions/v1/admin-features/user-override`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: selectedUserId,
          organization_id: organizationId,
          feature_key: newOverride.feature_key,
          is_enabled: newOverride.is_enabled,
          reason: newOverride.reason || null,
          expires_at: newOverride.expires_at || null
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create user override');
      }

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Success',
          description: 'User feature override created successfully'
        });
        
        // Refresh overrides
        loadUserOverrides(selectedUserId);
        
        // Reset form
        setNewOverride({
          feature_key: '',
          is_enabled: true,
          reason: '',
          expires_at: ''
        });
        setDialogOpen(false);
      }
    } catch (error) {
      console.error('Error creating user override:', error);
      toast({
        title: 'Error',
        description: 'Failed to create user override',
        variant: 'destructive'
      });
    }
  };

  const selectedUser = users.find(u => u.id === selectedUserId);

  useEffect(() => {
    loadOrgUsers();
  }, [organizationId]);

  useEffect(() => {
    if (selectedUserId) {
      loadUserOverrides(selectedUserId);
    }
  }, [selectedUserId]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Feature Overrides
          </CardTitle>
          <CardDescription>
            Set user-specific feature access overrides for {organizationName || 'this organization'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="user-select">Select User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.email} {user.first_name && user.last_name && `(${user.first_name} ${user.last_name})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedUserId && (
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">
                    Feature Overrides for {selectedUser?.email}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {overrides.length} override{overrides.length !== 1 ? 's' : ''} configured
                  </p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Override
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Feature Override</DialogTitle>
                      <DialogDescription>
                        Grant or deny access to a specific feature for this user
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="feature-select">Feature</Label>
                        <Select value={newOverride.feature_key} onValueChange={(value) => 
                          setNewOverride(prev => ({ ...prev, feature_key: value }))
                        }>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a feature..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="executive_dashboard">Executive Dashboard</SelectItem>
                            <SelectItem value="analytics">Analytics</SelectItem>
                            <SelectItem value="keyword_intelligence">Keyword Intelligence</SelectItem>
                            <SelectItem value="competitive_intelligence">Competitor Overview</SelectItem>
                            <SelectItem value="metadata_generator">Metadata Optimizer</SelectItem>
                            <SelectItem value="creative_review">Creative Analysis</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="access-enabled"
                          checked={newOverride.is_enabled}
                          onCheckedChange={(checked) => 
                            setNewOverride(prev => ({ ...prev, is_enabled: checked }))
                          }
                        />
                        <Label htmlFor="access-enabled">
                          {newOverride.is_enabled ? 'Grant Access' : 'Deny Access'}
                        </Label>
                      </div>
                      <div>
                        <Label htmlFor="reason">Reason (Optional)</Label>
                        <Textarea
                          id="reason"
                          placeholder="Why is this override being applied?"
                          value={newOverride.reason}
                          onChange={(e) => 
                            setNewOverride(prev => ({ ...prev, reason: e.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="expires-at">Expires At (Optional)</Label>
                        <Input
                          id="expires-at"
                          type="datetime-local"
                          value={newOverride.expires_at}
                          onChange={(e) => 
                            setNewOverride(prev => ({ ...prev, expires_at: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={createUserOverride}>
                        Create Override
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedUserId && (
        <Card>
          <CardHeader>
            <CardTitle>Current Overrides</CardTitle>
            <CardDescription>
              Active feature overrides for {selectedUser?.email}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading overrides...</span>
              </div>
            ) : overrides.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No feature overrides configured for this user
              </div>
            ) : (
              <div className="space-y-4">
                {overrides.map(override => (
                  <div key={override.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">
                        {override.platform_features?.feature_name || override.feature_key}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={override.is_enabled ? "default" : "secondary"}>
                          {override.is_enabled ? 'Granted' : 'Denied'}
                        </Badge>
                        {override.expires_at && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Expires: {new Date(override.expires_at).toLocaleDateString()}
                          </Badge>
                        )}
                      </div>
                      {override.reason && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {override.reason}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Created: {new Date(override.granted_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}