/**
 * Rule Results Table
 *
 * Displays rule-by-rule evaluation results with pass/fail status.
 */

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';
import type { RuleEvaluationResult } from './types';

interface RuleResultsTableProps {
  rules: RuleEvaluationResult[];
}

export const RuleResultsTable: React.FC<RuleResultsTableProps> = ({ rules }) => {
  return (
    <div className="rounded-md border border-zinc-800">
      <Table>
        <TableHeader>
          <TableRow className="bg-zinc-900/50">
            <TableHead className="w-12">Status</TableHead>
            <TableHead>Rule</TableHead>
            <TableHead className="w-24 text-right">Score</TableHead>
            <TableHead>Message</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((rule) => (
            <TableRow key={rule.ruleId} className="hover:bg-zinc-900/30">
              <TableCell>
                {rule.passed ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <X className="h-4 w-4 text-red-400" />
                )}
              </TableCell>
              <TableCell className="font-mono text-xs text-zinc-400">
                {rule.ruleId}
              </TableCell>
              <TableCell className="text-right">
                <Badge
                  variant="outline"
                  className={
                    rule.score >= 80
                      ? 'border-emerald-400/30 text-emerald-400'
                      : rule.score >= 60
                      ? 'border-yellow-400/30 text-yellow-400'
                      : 'border-red-400/30 text-red-400'
                  }
                >
                  {rule.score}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">
                {rule.message}
                {rule.evidence && rule.evidence.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {rule.evidence.slice(0, 5).map((ev, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="text-xs border-zinc-700 text-zinc-400"
                      >
                        {ev}
                      </Badge>
                    ))}
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
