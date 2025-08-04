import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GeneratedTopicQuery } from '@/types/topic-audit.types';
import { Edit, Trash2, Plus, CheckCircle, Eye, Search, Filter, MoreVertical, Copy, Sparkles } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';

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
  const [selectedQueries, setSelectedQueries] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [isGenerating, setIsGenerating] = useState(false);

  // Filtered and searched queries
  const filteredQueries = useMemo(() => {
    return editableQueries.filter(query => {
      const matchesSearch = query.query_text.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || query.query_type === filterType;
      const matchesPriority = filterPriority === 'all' || query.priority.toString() === filterPriority;
      return matchesSearch && matchesType && matchesPriority;
    });
  }, [editableQueries, searchTerm, filterType, filterPriority]);

  const handleEditQuery = (id: string, newText: string) => {
    setEditableQueries(prev => 
      prev.map(q => q.id === id ? { ...q, query_text: newText } : q)
    );
    setEditingId(null);
  };

  const handleDeleteQuery = (id: string) => {
    setEditableQueries(prev => prev.filter(q => q.id !== id));
    setSelectedQueries(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const handleBulkDelete = () => {
    setEditableQueries(prev => prev.filter(q => !selectedQueries.has(q.id)));
    setSelectedQueries(new Set());
    toast({ title: "Queries deleted", description: `${selectedQueries.size} queries removed` });
  };

  const handleDuplicateQuery = (query: GeneratedTopicQuery) => {
    const duplicatedQuery: GeneratedTopicQuery = {
      ...query,
      id: `duplicate-${Date.now()}`,
      query_text: query.query_text + " (copy)"
    };
    setEditableQueries(prev => [...prev, duplicatedQuery]);
    toast({ title: "Query duplicated", description: "A copy has been added to your list" });
  };

  const handleGenerateSimilar = async (query: GeneratedTopicQuery) => {
    setIsGenerating(true);
    try {
      // Generate 3 similar queries based on the original
      const variations = [
        query.query_text.replace(/best/i, 'top').replace(/agency/i, 'company'),
        query.query_text.replace(/best/i, 'affordable').replace(/agency/i, 'service'),
        query.query_text.replace(/best/i, 'recommended').replace(/agency/i, 'firm')
      ].filter(text => text !== query.query_text);

      const newQueries: GeneratedTopicQuery[] = variations.map((text, index) => ({
        id: `similar-${Date.now()}-${index}`,
        query_text: text,
        query_type: query.query_type,
        priority: query.priority,
        target_entity: query.target_entity
      }));

      setEditableQueries(prev => [...prev, ...newQueries]);
      toast({ title: "Similar queries generated", description: `${newQueries.length} variations added` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to generate similar queries", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddQuery = () => {
    if (!newQueryText.trim()) return;
    
    // Handle multiple queries (one per line)
    const queries = newQueryText.split('\n').filter(q => q.trim());
    const newQueries: GeneratedTopicQuery[] = queries.map((queryText, index) => ({
      id: `custom-${Date.now()}-${index}`,
      query_text: queryText.trim(),
      query_type: 'conversational',
      priority: 3,
      target_entity: topicData?.topic || 'topic'
    }));
    
    setEditableQueries(prev => [...prev, ...newQueries]);
    setNewQueryText('');
    toast({ title: "Queries added", description: `${newQueries.length} custom queries added` });
  };

  const toggleQuerySelection = (queryId: string) => {
    setSelectedQueries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(queryId)) {
        newSet.delete(queryId);
      } else {
        newSet.add(queryId);
      }
      return newSet;
    });
  };

  const selectAllQueries = () => {
    setSelectedQueries(new Set(filteredQueries.map(q => q.id)));
  };

  const clearSelection = () => {
    setSelectedQueries(new Set());
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
              {editableQueries.length} queries • {filteredQueries.length} shown
              {selectedQueries.size > 0 && ` • ${selectedQueries.size} selected`}
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

      {/* Search and Filter Controls */}
      <Card className="bg-card border-border">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search queries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background border-border"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40 bg-background border-border">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="comparison">Comparison</SelectItem>
                  <SelectItem value="recommendation">Recommendation</SelectItem>
                  <SelectItem value="problem_solving">Problem Solving</SelectItem>
                  <SelectItem value="conversational">Conversational</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-40 bg-background border-border">
                  <SelectValue placeholder="Filter by priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="1">Priority 1</SelectItem>
                  <SelectItem value="2">Priority 2</SelectItem>
                  <SelectItem value="3">Priority 3</SelectItem>
                  <SelectItem value="4">Priority 4</SelectItem>
                  <SelectItem value="5">Priority 5</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bulk Actions */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={selectedQueries.size === filteredQueries.length && filteredQueries.length > 0}
                onCheckedChange={(checked) => checked ? selectAllQueries() : clearSelection()}
              />
              <span className="text-sm text-muted-foreground">
                Select all visible
              </span>
              {selectedQueries.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  className="text-muted-foreground"
                >
                  Clear selection
                </Button>
              )}
            </div>

            {selectedQueries.size > 0 && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected ({selectedQueries.size})
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Query List */}
      <div className="space-y-4">
        {filteredQueries.map((query, index) => (
          <Card key={query.id} className={`bg-card border-border transition-all ${selectedQueries.has(query.id) ? 'ring-2 ring-primary/30 bg-primary/5' : ''}`}>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {/* Query Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      checked={selectedQueries.has(query.id)}
                      onCheckedChange={() => toggleQuerySelection(query.id)}
                    />
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
                  
                  <div className="flex items-center space-x-1">
                    <Button
                      onClick={() => setEditingId(query.id)}
                      variant="ghost"
                      size="sm"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDuplicateQuery(query)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleGenerateSimilar(query)}
                          disabled={isGenerating}
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate Similar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDeleteQuery(query.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
                  <div className="pl-7">
                    <p className="text-foreground font-medium leading-relaxed">
                      "{query.query_text}"
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredQueries.length === 0 && editableQueries.length > 0 && (
        <Card className="bg-card border-border">
          <CardContent className="pt-4">
            <div className="text-center text-muted-foreground py-8">
              <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No queries match your current filters</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setFilterType('all');
                  setFilterPriority('all');
                }}
                className="mt-2"
              >
                Clear filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Add New Query */}
      <Card className="bg-card border-border">
        <CardContent className="pt-4">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Plus className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                Add Custom Queries
              </span>
            </div>
            
            <Textarea
              placeholder="Add one or more custom queries (one per line)&#10;&#10;Example:&#10;Best ASO agency for mobile apps&#10;Affordable app store optimization services&#10;Top mobile app marketing companies"
              value={newQueryText}
              onChange={(e) => setNewQueryText(e.target.value)}
              className="bg-background border-border min-h-[120px]"
              rows={6}
            />
            
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {newQueryText.split('\n').filter(q => q.trim()).length} queries ready to add
              </div>
              <Button
                onClick={handleAddQuery}
                disabled={!newQueryText.trim()}
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Queries
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};