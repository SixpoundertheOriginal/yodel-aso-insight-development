import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BrandingService } from '@/services/brandingService';
import { useToast } from '@/hooks/use-toast';

interface BrandingManagerProps {
  organizationId: string;
  organizationName: string;
}

export const OrganizationBrandingManager: React.FC<BrandingManagerProps> = ({ 
  organizationId, 
  organizationName 
}) => {
  const [template, setTemplate] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const predefinedTemplates = [
    '{org_name} & Yodel Mobile - Performance Intelligence Partnership',
    '{org_name} × Yodel Mobile: Strategic ASO Insights',
    'Enterprise ASO platform for {org_name} by Yodel Mobile',
    '{org_name}\'s dedicated analytics solution powered by Yodel Mobile',
    'Collaborative performance insights: {org_name} + Yodel Mobile',
    'Strategic analytics partnership between {org_name} and Yodel Mobile'
  ];

  useEffect(() => {
    if (template) {
      setPreviewText(BrandingService.renderBrandingText(template, organizationName));
    }
  }, [template, organizationName]);

  useEffect(() => {
    const loadExistingBranding = async () => {
      try {
        const existing = await BrandingService.getOrganizationBranding(organizationId);
        if (existing) {
          setTemplate(existing.branding_template);
          setCustomMessage(existing.custom_message || '');
          setIsEnabled(existing.is_enabled);
        } else {
          // Set default template if none exists
          setTemplate(predefinedTemplates[0]);
        }
      } catch (error) {
        console.error('Failed to load existing branding:', error);
        setTemplate(predefinedTemplates[0]);
      }
    };

    loadExistingBranding();
  }, [organizationId]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await BrandingService.updateOrganizationBranding(organizationId, {
        branding_template: template,
        custom_message: customMessage,
        is_enabled: isEnabled,
        position: 'footer'
      });
      
      toast({
        title: 'Branding updated',
        description: 'Partnership branding has been updated successfully.',
      });
    } catch (error) {
      console.error('Failed to update branding:', error);
      toast({
        title: 'Update failed',
        description: 'Failed to update branding configuration.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Partnership Branding</CardTitle>
        <CardDescription>
          Customize how {organizationName}'s partnership with Yodel Mobile appears to users
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="template">Branding Template</Label>
          <Select value={template} onValueChange={setTemplate}>
            <SelectTrigger>
              <SelectValue placeholder="Choose partnership style" />
            </SelectTrigger>
            <SelectContent>
              {predefinedTemplates.map((tmpl, idx) => (
                <SelectItem key={idx} value={tmpl}>
                  {BrandingService.renderBrandingText(tmpl, organizationName)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="custom-template">Custom Template</Label>
          <Input
            id="custom-template"
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            placeholder="Use {org_name} as placeholder for organization name"
          />
          <p className="text-xs text-muted-foreground">
            Use {'{org_name}'} in your template - it will be replaced with "{organizationName}"
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="custom-message">Additional Message (Optional)</Label>
          <Textarea
            id="custom-message"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Optional additional message to display below the main branding"
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label>Preview</Label>
          <div className="p-4 bg-gradient-to-r from-secondary/20 to-primary/5 rounded border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground font-medium">
                {previewText || 'Select a template to preview'}
              </span>
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                Enterprise Solution
              </Badge>
            </div>
            {customMessage && (
              <p className="text-xs text-muted-foreground mt-1">{customMessage}</p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="enable-branding"
            checked={isEnabled}
            onCheckedChange={setIsEnabled}
          />
          <Label htmlFor="enable-branding">Enable partnership branding</Label>
        </div>

        <Button onClick={handleSave} disabled={loading}>
          {loading ? 'Saving...' : 'Save Branding Configuration'}
        </Button>
      </CardContent>
    </Card>
  );
};