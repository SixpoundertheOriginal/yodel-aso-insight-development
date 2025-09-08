
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Database, TestTube, AlertTriangle, Loader2 } from 'lucide-react';
import { PermissionWrapper } from '@/components/PermissionWrapper';

type DataSource = 'mock' | 'bigquery';
type DataSourceStatus = 'loading' | 'bigquery-success' | 'demo-data' | 'bigquery-failed-fallback' | 'mock-only';

interface DataSourceIndicatorProps {
  currentDataSource: DataSource | null;
  dataSourceStatus: DataSourceStatus;
}

export const DataSourceIndicator: React.FC<DataSourceIndicatorProps> = ({
  currentDataSource,
  dataSourceStatus
}) => {
  const getIndicatorConfig = () => {
    switch (dataSourceStatus) {
      case 'loading':
        return {
          icon: <Loader2 className="h-3 w-3 animate-spin" />,
          text: 'Loading...',
          variant: 'secondary' as const,
          tooltip: 'Loading data...'
        };
      
      case 'bigquery-success':
        return {
          icon: <Database className="h-3 w-3" />,
          text: 'Live Data',
          variant: 'default' as const,
          tooltip: 'Real-time ASO data',
          debugText: 'Data from BigQuery (Live ASO metrics)',
          debugTooltip: 'Data from BigQuery (Live ASO metrics)'
        };
      
      case 'demo-data':
        return {
          icon: <TestTube className="h-3 w-3" />,
          text: 'Demo Data',
          variant: 'secondary' as const,
          tooltip: 'Sample data being shown',
          debugText: 'Demo Data',
          debugTooltip: 'Showing demo data (no approved apps)'
        };
      
      case 'bigquery-failed-fallback':
        return {
          icon: <AlertTriangle className="h-3 w-3" />,
          text: 'Demo Data',
          variant: 'destructive' as const,
          tooltip: 'Sample data being shown',
          debugText: 'Demo Data',
          debugTooltip: 'BigQuery unavailable - showing demo data'
        };
      
      case 'mock-only':
        return {
          icon: <TestTube className="h-3 w-3" />,
          text: 'Demo Data',
          variant: 'secondary' as const,
          tooltip: 'Sample data being shown',
          debugText: 'Demo Data',
          debugTooltip: 'Using demo data'
        };
      
      default:
        return {
          icon: <TestTube className="h-3 w-3" />,
          text: 'Unknown',
          variant: 'secondary' as const,
          tooltip: 'Data source unknown'
        };
    }
  };

  const config = getIndicatorConfig();

  return (
    <PermissionWrapper 
      permission="ui.debug.show_live_badges" 
      fallback={
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant={config.variant} className="flex items-center gap-1">
                {config.icon}
                <span className="text-xs font-medium">{config.text}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{config.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      }
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant={config.variant} className="flex items-center gap-1">
              {config.icon}
              <span className="text-xs font-medium">{config.debugText || config.text}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{config.debugTooltip || config.tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </PermissionWrapper>
  );
};
