import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Hash, Target, MessageSquare, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface AuditRun {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error' | 'paused';
  total_queries: number;
  completed_queries: number;
  audit_type: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  topic_data?: any;
}

interface AuditRunIdentifierProps {
  auditRun: AuditRun;
  isSelected?: boolean;
  showDetails?: boolean;
}

export const AuditRunIdentifier: React.FC<AuditRunIdentifierProps> = ({
  auditRun,
  isSelected = false,
  showDetails = false
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'secondary';
      case 'completed': return 'default';
      case 'error': return 'destructive';
      case 'paused': return 'outline';
      default: return 'outline';
    }
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return format(new Date(dateString), 'MMM d, yyyy HH:mm');
  };

  const progress = auditRun.total_queries > 0 
    ? Math.round((auditRun.completed_queries / auditRun.total_queries) * 100)
    : 0;

  return (
    <Card className={`transition-colors ${isSelected ? 'ring-2 ring-primary' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            {/* Audit Run Name and Type */}
            <div className="flex items-center space-x-2">
              <h3 className="font-medium text-foreground">{auditRun.name}</h3>
              <Badge variant="outline" className="text-xs">
                {auditRun.audit_type}
              </Badge>
              <Badge variant={getStatusColor(auditRun.status)}>
                {auditRun.status}
              </Badge>
            </div>

            {/* Progress Info */}
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <MessageSquare className="h-3 w-3" />
                <span>{auditRun.completed_queries}/{auditRun.total_queries} ({progress}%)</span>
              </div>
              
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>{formatDateTime(auditRun.created_at)}</span>
              </div>
            </div>

            {/* Audit ID (partial) */}
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <Hash className="h-3 w-3" />
              <span>ID: {auditRun.id.substring(0, 8)}...</span>
            </div>

            {/* Topic Information */}
            {auditRun.audit_type === 'topic' && auditRun.topic_data && (
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <Target className="h-3 w-3" />
                <span>Topic: {auditRun.topic_data.topic}</span>
                {auditRun.topic_data.entityToTrack && (
                  <span>• Entity: {auditRun.topic_data.entityToTrack}</span>
                )}
              </div>
            )}

            {/* Detailed timing info when expanded */}
            {showDetails && (
              <div className="pt-2 border-t space-y-1 text-xs text-muted-foreground">
                {auditRun.started_at && (
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>Started: {formatDateTime(auditRun.started_at)}</span>
                  </div>
                )}
                {auditRun.completed_at && (
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>Completed: {formatDateTime(auditRun.completed_at)}</span>
                  </div>
                )}
                <div>Full ID: {auditRun.id}</div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};