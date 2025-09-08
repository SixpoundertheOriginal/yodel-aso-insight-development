import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { BrandingService, OrganizationBranding as BrandingType } from '@/services/brandingService';
import { useUserProfile } from '@/hooks/useUserProfile';

interface OrganizationBrandingProps {
  position?: 'footer' | 'header' | 'sidebar';
  className?: string;
}

export const OrganizationBranding: React.FC<OrganizationBrandingProps> = ({ 
  position = 'footer',
  className = ''
}) => {
  const { profile } = useUserProfile();
  const [branding, setBranding] = useState<BrandingType | null>(null);
  const [displayText, setDisplayText] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBranding = async () => {
      if (!profile?.organization_id || !profile?.organizations?.name) {
        setLoading(false);
        return;
      }

      try {
        const brandingConfig = await BrandingService.getOrganizationBranding(
          profile.organization_id, 
          position
        );
        
        if (brandingConfig) {
          const text = BrandingService.renderBrandingText(
            brandingConfig.branding_template,
            profile.organizations.name
          );
          setBranding(brandingConfig);
          setDisplayText(text);
        }
      } catch (error) {
        console.error('Error loading organization branding:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBranding();
  }, [profile?.organization_id, profile?.organizations?.name, position]);

  if (loading || !branding || !displayText) {
    return null;
  }

  const baseClasses = {
    footer: "border-t bg-gradient-to-r from-secondary/20 to-primary/5 px-6 py-3",
    header: "border-b bg-gradient-to-r from-primary/5 to-secondary/20 px-6 py-2",
    sidebar: "border-t border-border p-3"
  };

  return (
    <div className={`${baseClasses[position]} ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {branding.logo_url && (
            <img 
              src={branding.logo_url} 
              alt="Organization logo"
              className="h-6 w-auto"
            />
          )}
          <span className="text-sm text-muted-foreground font-medium">
            {displayText}
          </span>
        </div>
        
        <Badge 
          variant="outline" 
          className="text-xs bg-primary/10 text-primary border-primary/20"
        >
          Enterprise Solution
        </Badge>
      </div>
      
      {branding.custom_message && (
        <p className="text-xs text-muted-foreground mt-1">
          {branding.custom_message}
        </p>
      )}
    </div>
  );
};