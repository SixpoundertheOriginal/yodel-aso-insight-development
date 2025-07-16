
import React, { useState, useMemo } from "react";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { TrafficSource } from "@/hooks/useMockAsoData";
import { ArrowUp, ArrowDown } from "lucide-react";
import { formatPercentage } from "@/utils/format";

interface TrafficSourceTableProps {
  data: TrafficSource[];
}

type SortField = 'name' | 'value' | 'delta';
type SortDirection = 'asc' | 'desc';

const TrafficSourceTable: React.FC<TrafficSourceTableProps> = React.memo(({ data }) => {
  const [sortField, setSortField] = useState<SortField>('value');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort field and default to descending for values
      setSortField(field);
      setSortDirection(field === 'name' ? 'asc' : 'desc');
    }
  };

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      let comparison = 0;
      
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'value') {
        comparison = a.value - b.value;
      } else if (sortField === 'delta') {
        comparison = a.delta - b.delta;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortField, sortDirection]);

  // Convert our internal sort direction to HTML aria-sort value
  const getAriaSortValue = (field: SortField): "ascending" | "descending" | "none" => {
    if (field !== sortField) return "none";
    return sortDirection === 'asc' ? "ascending" : "descending";
  };

  return (
    <Table className="w-full">
      <TableHeader>
        <TableRow>
          <TableHead 
            className="cursor-pointer w-1/3" 
            onClick={() => handleSort('name')}
            role="columnheader"
            aria-sort={getAriaSortValue('name')}
          >
            <div className="flex items-center">
              Source
              {sortField === 'name' && (
                sortDirection === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
              )}
            </div>
          </TableHead>
          <TableHead 
            className="cursor-pointer text-right"
            onClick={() => handleSort('value')}
            role="columnheader"
            aria-sort={getAriaSortValue('value')}
          >
            <div className="flex items-center justify-end">
              Value
              {sortField === 'value' && (
                sortDirection === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
              )}
            </div>
          </TableHead>
          <TableHead 
            className="cursor-pointer text-right"
            onClick={() => handleSort('delta')}
            role="columnheader"
            aria-sort={getAriaSortValue('delta')}
          >
            <div className="flex items-center justify-end">
              Change
              {sortField === 'delta' && (
                sortDirection === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
              )}
            </div>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedData.map((source) => {
          const isPositive = source.delta >= 0;
          
          return (
            <TableRow key={source.name}>
              <TableCell className="font-medium">{source.name}</TableCell>
              <TableCell className="text-right">{source.value.toLocaleString()}</TableCell>
              <TableCell className={`text-right ${isPositive ? "text-green-500" : "text-red-500"}`}>
                <div className="flex items-center justify-end">
                  {isPositive ? (
                    <ArrowUp className="h-4 w-4 mr-1" />
                  ) : (
                    <ArrowDown className="h-4 w-4 mr-1" />
                  )}
                  <span>{formatPercentage(Math.abs(source.delta))}%</span>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
});

TrafficSourceTable.displayName = "TrafficSourceTable";
export default TrafficSourceTable;
