/**
 * Stopword Override Editor
 *
 * Phase 13.3: Editor for stopword overrides
 *
 * Features:
 * - View all stopwords for current scope
 * - Add new stopwords
 * - Bulk add from comma-separated list
 * - Delete stopwords
 */

import React, { useState } from 'react';
import { useStopwordOverrideMutations } from '@/hooks/admin/useRulesets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import type { StopwordOverride } from '@/services/admin/adminOverrideApi';

interface StopwordEditorProps {
  vertical?: string;
  market?: string;
  organizationId?: string;
  stopwords: StopwordOverride[];
}

export function StopwordEditor({
  vertical,
  market,
  organizationId,
  stopwords,
}: StopwordEditorProps) {
  const { upsert, remove } = useStopwordOverrideMutations(vertical, market, organizationId);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkAddDialogOpen, setIsBulkAddDialogOpen] = useState(false);

  // Form state
  const [formWord, setFormWord] = useState('');
  const [bulkWords, setBulkWords] = useState('');

  const handleAdd = async () => {
    if (!formWord.trim()) {
      alert('Please enter a word');
      return;
    }

    try {
      await upsert.mutateAsync({
        scope: getScope(),
        vertical,
        market,
        organization_id: organizationId,
        word: formWord.toLowerCase().trim(),
      });

      // Reset form
      setFormWord('');
      setIsAddDialogOpen(false);
    } catch (err) {
      console.error('Failed to add stopword:', err);
      alert('Failed to add stopword override');
    }
  };

  const handleBulkAdd = async () => {
    if (!bulkWords.trim()) {
      alert('Please enter stopwords');
      return;
    }

    const wordList = bulkWords
      .split(',')
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length > 0);

    if (wordList.length === 0) {
      alert('Please enter at least one stopword');
      return;
    }

    try {
      // Add each word sequentially
      for (const word of wordList) {
        await upsert.mutateAsync({
          scope: getScope(),
          vertical,
          market,
          organization_id: organizationId,
          word,
        });
      }

      // Reset form
      setBulkWords('');
      setIsBulkAddDialogOpen(false);
      alert(`Successfully added ${wordList.length} stopwords`);
    } catch (err) {
      console.error('Failed to add stopwords:', err);
      alert('Failed to add some stopwords');
    }
  };

  const handleDelete = async (id: string, word: string) => {
    if (!confirm(`Are you sure you want to delete the stopword "${word}"?`)) {
      return;
    }

    try {
      await remove.mutateAsync(id);
    } catch (err) {
      console.error('Failed to delete stopword:', err);
      alert('Failed to delete stopword override');
    }
  };

  const getScope = (): 'vertical' | 'market' | 'client' => {
    if (organizationId) return 'client';
    if (vertical && !market) return 'vertical';
    return 'market';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Stopword Overrides</h3>
          <p className="text-sm text-gray-500">
            Define words to be excluded from metadata analysis (e.g., "the", "a", "an")
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isBulkAddDialogOpen} onOpenChange={setIsBulkAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Bulk Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Add Stopwords</DialogTitle>
                <DialogDescription>
                  Add multiple stopwords at once (comma-separated).
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bulk-words">Stopwords (comma-separated)</Label>
                  <Textarea
                    id="bulk-words"
                    placeholder="e.g., the, a, an, and, or, but"
                    value={bulkWords}
                    onChange={(e) => setBulkWords(e.target.value)}
                    rows={5}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsBulkAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleBulkAdd} disabled={upsert.isPending}>
                  {upsert.isPending ? 'Adding...' : 'Add All'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Stopword
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Stopword Override</DialogTitle>
                <DialogDescription>
                  Add a single stopword to exclude from analysis.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="word">Stopword</Label>
                  <Input
                    id="word"
                    placeholder="e.g., the, a, an"
                    value={formWord}
                    onChange={(e) => setFormWord(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAdd} disabled={upsert.isPending}>
                  {upsert.isPending ? 'Adding...' : 'Add Stopword'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {stopwords.length === 0 ? (
        <div className="text-center py-12 text-gray-500 border border-dashed rounded-lg">
          No stopword overrides yet. Add your first stopword to get started.
        </div>
      ) : (
        <div>
          <div className="mb-4 text-sm text-gray-500">
            {stopwords.length} stopword{stopwords.length !== 1 ? 's' : ''} defined
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Word</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Version</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stopwords.map((stopword) => (
                <TableRow key={stopword.id}>
                  <TableCell className="font-mono">{stopword.word}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{stopword.scope}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">v{stopword.version}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(stopword.id, stopword.word)}
                        disabled={remove.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
