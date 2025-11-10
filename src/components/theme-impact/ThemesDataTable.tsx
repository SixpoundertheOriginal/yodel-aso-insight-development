/**
 * THEMES DATA TABLE
 *
 * Sortable table displaying all theme impact scores
 */

import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowUpDown, Search, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeImpactScore } from '@/services/theme-impact-scoring.service';

interface ThemesDataTableProps {
  themes: ThemeImpactScore[];
  isLoading?: boolean;
  onRowClick?: (theme: ThemeImpactScore) => void;
}

type SortField = 'theme' | 'impactScore' | 'mentionCount' | 'avgSentiment' | 'trendDirection';
type SortOrder = 'asc' | 'desc';

export function ThemesDataTable({
  themes,
  isLoading = false,
  onRowClick
}: ThemesDataTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('impactScore');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredAndSortedThemes = useMemo(() => {
    let filtered = themes;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(theme =>
        theme.theme.toLowerCase().includes(searchQuery.toLowerCase()) ||
        theme.recommendedAction?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply impact level filter
    if (filterLevel !== 'all') {
      filtered = filtered.filter(theme => theme.impactLevel === filterLevel);
    }

    // Apply category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(theme => theme.themeCategory === filterCategory);
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [themes, searchQuery, filterLevel, filterCategory, sortField, sortOrder]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'rising':
        return <TrendingUp className="h-4 w-4 text-red-600" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-green-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getImpactBadge = (level: string) => {
    const colors = {
      critical: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-gray-100 text-gray-800'
    };
    return (
      <Badge className={colors[level as keyof typeof colors] || colors.low}>
        {level}
      </Badge>
    );
  };

  const getSentimentColor = (sentiment: number) => {
    if (sentiment < -0.5) return 'text-red-600 font-semibold';
    if (sentiment < -0.2) return 'text-orange-600';
    if (sentiment < 0.2) return 'text-gray-600';
    return 'text-green-600';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All Themes</CardTitle>
          <CardDescription>Loading themes...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Themes</CardTitle>
        <CardDescription>
          {filteredAndSortedThemes.length} of {themes.length} themes
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search themes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterLevel} onValueChange={setFilterLevel}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Impact Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="bug">Bug</SelectItem>
              <SelectItem value="feature_request">Feature Request</SelectItem>
              <SelectItem value="ux_issue">UX Issue</SelectItem>
              <SelectItem value="performance">Performance</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('theme')}
                    className="-ml-3"
                  >
                    Theme
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="w-[120px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('impactScore')}
                    className="-ml-3"
                  >
                    Impact
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Level</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('mentionCount')}
                    className="-ml-3"
                  >
                    Mentions
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('avgSentiment')}
                    className="-ml-3"
                  >
                    Sentiment
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Trend</TableHead>
                <TableHead className="w-[200px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedThemes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                    No themes found
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedThemes.map((theme) => (
                  <TableRow
                    key={theme.id}
                    className={cn(
                      'cursor-pointer hover:bg-gray-50',
                      onRowClick && 'cursor-pointer'
                    )}
                    onClick={() => onRowClick?.(theme)}
                  >
                    <TableCell className="font-medium capitalize">
                      {theme.theme}
                      <div className="text-xs text-gray-500 capitalize">
                        {theme.themeCategory.replace('_', ' ')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-lg font-bold">
                        {Math.round(theme.impactScore)}
                      </span>
                      <span className="text-xs text-gray-500">/100</span>
                    </TableCell>
                    <TableCell>{getImpactBadge(theme.impactLevel)}</TableCell>
                    <TableCell>{theme.mentionCount}</TableCell>
                    <TableCell className={getSentimentColor(theme.avgSentiment)}>
                      {theme.avgSentiment.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {getTrendIcon(theme.trendDirection)}
                        <span className="text-sm capitalize">{theme.trendDirection}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 truncate max-w-[200px]">
                      {theme.recommendedAction}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
