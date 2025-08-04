import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Edit3, Save, X, Plus, CheckCircle } from 'lucide-react';

interface EditableEntityDetailsProps {
  entityData: {
    entityName: string;
    description?: string;
    services?: string[];
    competitors?: string[];
    targetClients?: string[];
    confidence?: number;
  };
  onSave: (updatedData: any) => void;
  onCancel: () => void;
}

export const EditableEntityDetails: React.FC<EditableEntityDetailsProps> = ({
  entityData,
  onSave,
  onCancel
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({
    entityName: entityData.entityName,
    description: entityData.description || '',
    services: entityData.services || [],
    competitors: entityData.competitors || [],
    targetClients: entityData.targetClients || [],
    confidence: entityData.confidence || 0.5
  });

  const [newService, setNewService] = useState('');
  const [newCompetitor, setNewCompetitor] = useState('');
  const [newClient, setNewClient] = useState('');

  const addItem = (type: 'services' | 'competitors' | 'targetClients', value: string) => {
    if (!value.trim()) return;
    setEditedData(prev => ({
      ...prev,
      [type]: [...prev[type], value.trim()]
    }));
    if (type === 'services') setNewService('');
    if (type === 'competitors') setNewCompetitor('');
    if (type === 'targetClients') setNewClient('');
  };

  const removeItem = (type: 'services' | 'competitors' | 'targetClients', index: number) => {
    setEditedData(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const handleSave = () => {
    onSave(editedData);
    setIsEditing(false);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  if (!isEditing) {
    return (
      <Card className="bg-background/50 border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Entity Details</span>
            <div className="flex items-center gap-2">
              <Badge 
                variant="secondary" 
                className={`${getConfidenceColor(editedData.confidence)} text-foreground`}
              >
                {getConfidenceLabel(editedData.confidence)} Confidence
              </Badge>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit3 className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">Entity Name</h4>
            <p className="text-sm font-medium">{editedData.entityName}</p>
          </div>
          
          {editedData.description && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
              <p className="text-sm">{editedData.description}</p>
            </div>
          )}

          {editedData.services.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Services</h4>
              <div className="flex flex-wrap gap-1">
                {editedData.services.map((service, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {service}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {editedData.competitors.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Competitors</h4>
              <div className="flex flex-wrap gap-1">
                {editedData.competitors.map((competitor, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {competitor}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {editedData.targetClients.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Target Clients</h4>
              <div className="flex flex-wrap gap-1">
                {editedData.targetClients.map((client, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {client}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-background border-border">
      <CardHeader>
        <CardTitle className="text-base">Edit Entity Details</CardTitle>
        <CardDescription>Update and refine the entity information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="entityName">Entity Name *</Label>
          <Input
            id="entityName"
            value={editedData.entityName}
            onChange={(e) => setEditedData(prev => ({ ...prev, entityName: e.target.value }))}
            className="bg-background border-border"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={editedData.description}
            onChange={(e) => setEditedData(prev => ({ ...prev, description: e.target.value }))}
            className="bg-background border-border"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>Services</Label>
          <div className="flex space-x-2">
            <Input
              placeholder="Add a service..."
              value={newService}
              onChange={(e) => setNewService(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addItem('services', newService);
                }
              }}
              className="bg-background border-border"
            />
            <Button 
              type="button"
              onClick={() => addItem('services', newService)}
              variant="outline"
              size="sm"
              disabled={!newService.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {editedData.services.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {editedData.services.map((service, idx) => (
                <Badge key={idx} variant="outline" className="flex items-center space-x-1">
                  <span>{service}</span>
                  <button
                    type="button"
                    onClick={() => removeItem('services', idx)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Competitors</Label>
          <div className="flex space-x-2">
            <Input
              placeholder="Add a competitor..."
              value={newCompetitor}
              onChange={(e) => setNewCompetitor(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addItem('competitors', newCompetitor);
                }
              }}
              className="bg-background border-border"
            />
            <Button 
              type="button"
              onClick={() => addItem('competitors', newCompetitor)}
              variant="outline"
              size="sm"
              disabled={!newCompetitor.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {editedData.competitors.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {editedData.competitors.map((competitor, idx) => (
                <Badge key={idx} variant="secondary" className="flex items-center space-x-1">
                  <span>{competitor}</span>
                  <button
                    type="button"
                    onClick={() => removeItem('competitors', idx)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Target Clients</Label>
          <div className="flex space-x-2">
            <Input
              placeholder="Add target client type..."
              value={newClient}
              onChange={(e) => setNewClient(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addItem('targetClients', newClient);
                }
              }}
              className="bg-background border-border"
            />
            <Button 
              type="button"
              onClick={() => addItem('targetClients', newClient)}
              variant="outline"
              size="sm"
              disabled={!newClient.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {editedData.targetClients.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {editedData.targetClients.map((client, idx) => (
                <Badge key={idx} variant="outline" className="flex items-center space-x-1">
                  <span>{client}</span>
                  <button
                    type="button"
                    onClick={() => removeItem('targetClients', idx)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};