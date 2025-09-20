import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface SuggestKeywordsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuggest: () => void;
  onManual: () => void;
  selectedAppName?: string | null;
  onSetDontShow?: (neverShow: boolean) => void;
}

export const SuggestKeywordsDialog: React.FC<SuggestKeywordsDialogProps> = ({
  open,
  onOpenChange,
  onSuggest,
  onManual,
  selectedAppName,
  onSetDontShow,
}) => {
  const [dontShow, setDontShow] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Boost your keyword setup</DialogTitle>
          <DialogDescription>
            {selectedAppName
              ? `Generate suggested keywords for “${selectedAppName}” or proceed to enter keywords manually.`
              : 'Generate suggested keywords for your selected app, or proceed to enter keywords manually.'}
          </DialogDescription>
        </DialogHeader>
        <div className="text-sm text-muted-foreground">
          We use your app’s name and category to discover relevant search terms. You can edit results anytime.
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <Checkbox checked={dontShow} onCheckedChange={(v)=> setDontShow(Boolean(v))} />
          Don’t show this again
        </label>
        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={() => { onSetDontShow?.(dontShow); onManual(); }}
          >
            Enter manually
          </Button>
          <Button
            onClick={() => { onSetDontShow?.(dontShow); onSuggest(); }}
          >
            Generate suggestions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SuggestKeywordsDialog;
