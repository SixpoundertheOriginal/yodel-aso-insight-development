import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { OrganizationFeatureManager } from '@/components/admin/organizations/OrganizationFeatureManager';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const OrganizationFeaturesPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isSuperAdmin, isLoading } = usePermissions();

  useEffect(() => {
    if (!isLoading && !isSuperAdmin) {
      navigate('/dashboard');
    }
  }, [isSuperAdmin, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-white">Loading organization features...</div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  if (!id) {
    return (
      <AdminLayout currentPage="organizations">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Organization ID is required to manage features.</p>
            <Button 
              onClick={() => navigate('/admin?tab=organizations')} 
              className="mt-4"
              variant="outline"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Organizations
            </Button>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout currentPage="organizations">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => navigate('/admin?tab=organizations')} 
            variant="outline"
            size="sm"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Organizations
          </Button>
          <h1 className="text-2xl font-semibold text-white">Feature Access Management</h1>
        </div>
        
        <OrganizationFeatureManager 
          organizationId={id}
        />
      </div>
    </AdminLayout>
  );
};

export default OrganizationFeaturesPage;