import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { GeneratedTopicQuery } from '@/types/topic-audit.types';
import { Edit, Trash2, Plus, CheckCircle, Eye } from 'lucide-react';

interface QueryReviewInterfaceProps {
  queries: GeneratedTopicQuery[];
  onQueriesApproved: (approvedQueries: GeneratedTopicQuery[]) => void;
  onBack: () => void;
  topicData: any;
}

export const QueryReviewInterface: React.FC<QueryReviewInterfaceProps> = ({
  queries,
  onQueriesApproved,
  onBack,
  topicData
}) => {
  const [editableQueries, setEditableQueries] = useState<GeneratedTopicQuery[]>(queries);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newQueryText, setNewQueryText] = useState('');

  const handleEditQuery = (id: string, newText: string) => {
    setEditableQueries(prev => 
      prev.map(q => q.id === id ? { ...q, query_text: newText } : q)
    );
    setEditingId(null);
  };

  const handleDeleteQuery = (id: string) => {
    setEditableQueries(prev => prev.filter(q => q.id !== id));
  };

  const handleAddQuery = () => {
    if (!newQueryText.trim()) return;
    
    const newQuery: GeneratedTopicQuery = {
      id: `custom-${Date.now()}`,
      query_text: newQueryText.trim(),
      query_type: 'conversational',
      priority: 3,
      target_entity: topicData?.topic || 'topic'
    };
    
    setEditableQueries(prev => [...prev, newQuery]);
    setNewQueryText('');
  };

  const getQueryTypeColor = (type: string) => {
    switch (type) {
      case 'comparison': return 'bg-blue-500/20 text-blue-300';
      case 'recommendation': return 'bg-green-500/20 text-green-300';
      case 'problem_solving': return 'bg-orange-500/20 text-orange-300';
      case 'conversational': return 'bg-purple-500/20 text-purple-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority <= 2) return 'bg-red-500/20 text-red-300';
    if (priority <= 3) return 'bg-yellow-500/20 text-yellow-300';
    return 'bg-green-500/20 text-green-300';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-primary flex items-center space-x-2">
            <Eye className="h-5 w-5" />
            <span>Review Generated Queries</span>
          </CardTitle>
          <CardDescription>
            Review and customize the queries that will be used to analyze "{topicData?.topic}" visibility in ChatGPT responses
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {editableQueries.length} queries generated for analysis
            </div>
            <div className="flex space-x-2">
              <Button onClick={onBack} variant="outline" size="sm">
                Back to Setup
              </Button>
              <Button 
                onClick={() => onQueriesApproved(editableQueries)}
                disabled={editableQueries.length === 0}
                className="bg-primary hover:bg-primary/90"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve & Continue ({editableQueries.length})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Query List */}
      <div className="space-y-4">
        {editableQueries.map((query, index) => (
          <Card key={query.id} className="bg-card border-border">
            <CardContent className="pt-4">
              <div className="space-y-3">
                {/* Query Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      Query #{index + 1}
                    </span>
                    <Badge className={getQueryTypeColor(query.query_type)}>
                      {query.query_type}
                    </Badge>
                    <Badge className={getPriorityColor(query.priority)}>
                      Priority {query.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => setEditingId(query.id)}
                      variant="ghost"
                      size="sm"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => handleDeleteQuery(query.id)}
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Query Text */}
                {editingId === query.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={query.query_text}
                      onChange={(e) => setEditableQueries(prev => 
                        prev.map(q => q.id === query.id ? { ...q, query_text: e.target.value } : q)
                      )}
                      className="bg-background border-border"
                      rows={3}
                    />
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => handleEditQuery(query.id, query.query_text)}
                        size="sm"
                        variant="outline"
                      >
                        Save
                      </Button>
                      <Button
                        onClick={() => setEditingId(null)}
                        size="sm"
                        variant="ghost"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-foreground font-medium leading-relaxed">
                    "{query.query_text}"
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add New Query */}
      <Card className="bg-card border-border">
        <CardContent className="pt-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Plus className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                Add Custom Query
              </span>
            </div>
            <div className="flex space-x-2">
              <Textarea
                placeholder="Add a custom query to test topic visibility..."
                value={newQueryText}
                onChange={(e) => setNewQueryText(e.target.value)}
                className="bg-background border-border"
                rows={2}
              />
              <Button
                onClick={handleAddQuery}
                disabled={!newQueryText.trim()}
                variant="outline"
                className="shrink-0"
              >
                Add Query
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};