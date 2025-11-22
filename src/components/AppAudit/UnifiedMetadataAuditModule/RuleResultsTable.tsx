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
    <div className="rounded-md border-2 border-dashed border-zinc-700/50 bg-zinc-900/30">
      <Table>
        <TableHeader>
          <TableRow className="bg-zinc-800/50 border-b border-zinc-700/50">
            <TableHead className="w-12 text-[10px] uppercase tracking-widest text-zinc-500">Status</TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest text-zinc-500">Rule</TableHead>
            <TableHead className="w-24 text-right text-[10px] uppercase tracking-widest text-zinc-500">Score</TableHead>
            <TableHead className="text-[10px] uppercase tracking-widest text-zinc-500">Message</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((rule) => (
            <TableRow key={rule.ruleId} className="hover:bg-zinc-800/30 border-b border-dashed border-zinc-800/50">
              <TableCell>
                <div
                  className="w-5 h-5 flex items-center justify-center"
                  style={{
                    clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
                    background: rule.passed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  }}
                >
                  {rule.passed ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <X className="h-3 w-3 text-red-400" />
                  )}
                </div>
              </TableCell>
              <TableCell className="font-mono text-[11px] text-zinc-400 uppercase tracking-wide">
                {rule.ruleId}
              </TableCell>
              <TableCell className="text-right">
                <Badge
                  variant="outline"
                  className={`font-mono text-sm ${
                    rule.score >= 80
                      ? 'border-emerald-400/30 text-emerald-400'
                      : rule.score >= 60
                      ? 'border-yellow-400/30 text-yellow-400'
                      : 'border-red-400/30 text-red-400'
                  }`}
                  style={{
                    clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
                  }}
                >
                  {rule.score}
                </Badge>
              </TableCell>
              <TableCell className="text-sm font-light text-zinc-300">
                {rule.message}
                {rule.evidence && rule.evidence.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {rule.evidence.slice(0, 5).map((ev, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="text-[10px] font-mono border-zinc-700 text-zinc-500"
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
