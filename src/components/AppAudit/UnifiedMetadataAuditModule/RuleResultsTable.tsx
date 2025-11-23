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
import { formatScore } from './utils';

interface RuleResultsTableProps {
  rules: RuleEvaluationResult[];
}

export const RuleResultsTable: React.FC<RuleResultsTableProps> = ({ rules }) => {
  return (
    <div className="rounded-xl border border-zinc-800/50 bg-black/20 overflow-hidden shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-zinc-900/40 border-b-2 border-zinc-800">
            <TableHead className="w-12 px-3 py-2 text-[10px] uppercase tracking-widest text-zinc-500 font-medium">Status</TableHead>
            <TableHead className="px-3 py-2 text-[10px] uppercase tracking-widest text-zinc-500 font-medium">Rule</TableHead>
            <TableHead className="w-24 text-right px-3 py-2 text-[10px] uppercase tracking-widest text-zinc-500 font-medium">Score</TableHead>
            <TableHead className="px-3 py-2 text-[10px] uppercase tracking-widest text-zinc-500 font-medium">Message</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((rule) => (
            <TableRow key={rule.ruleId} className="hover:bg-zinc-800/20 border-b border-zinc-800/30 transition-colors">
              <TableCell className="px-3 py-2">
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
              <TableCell className="px-3 py-2 font-mono text-[11px] text-zinc-400 uppercase tracking-wide">
                {rule.ruleId}
              </TableCell>
              <TableCell className="text-right px-3 py-2">
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
                  {formatScore(rule.score)}
                </Badge>
              </TableCell>
              <TableCell className="px-3 py-2 text-xs font-light text-zinc-300 leading-relaxed">
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
